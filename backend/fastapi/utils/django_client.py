"""Django Backend Integration - Fetch data from Django database directly"""
import logging
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Optional
from models.timetable_models import Course, Faculty, Room, TimeSlot, Student, Batch

logger = logging.getLogger(__name__)


class DjangoAPIClient:
    """Client for fetching data directly from Django database with connection pooling"""

    def __init__(self):
        self.db_conn = None
        self._connect_db()
    
    def _connect_db(self):
        """Connect to Django's PostgreSQL database with optimized settings"""
        try:
            db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/sih28')
            self.db_conn = psycopg2.connect(
                db_url,
                cursor_factory=RealDictCursor,
                connect_timeout=10
            )
            # Enable autocommit for read-only queries
            self.db_conn.autocommit = True
            # Set statement timeout after connection (Neon.tech compatible)
            with self.db_conn.cursor() as cur:
                cur.execute("SET statement_timeout = '30s'")
            logger.info("Connected to Django database with optimizations")
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            raise

    async def close(self):
        """Close database connection"""
        if self.db_conn:
            self.db_conn.close()

    async def fetch_courses(
        self,
        org_name: str,
        semester: int,
        department_id: Optional[str] = None
    ) -> List[Course]:
        """Fetch courses from database"""
        try:
            cursor = self.db_conn.cursor()
            
            # First get org_id from org_name
            cursor.execute("SELECT org_id, org_name FROM organizations WHERE org_name = %s", (org_name,))
            org_row = cursor.fetchone()
            if not org_row:
                logger.error(f"Organization '{org_name}' not found")
                # Try to list available organizations
                cursor.execute("SELECT org_id, org_name FROM organizations LIMIT 5")
                orgs = cursor.fetchall()
                logger.error(f"Available organizations: {[o['org_name'] for o in orgs]}")
                return []
            org_id = org_row['org_id']
            logger.info(f"Found organization: {org_row['org_name']} (ID: {org_id})")
            
            # CRITICAL: Use subquery to avoid ARRAY_AGG duplicates from join multiplication
            # Also fetch co_faculty_ids to split large courses into sections
            query = """
                SELECT c.course_id, c.course_code, c.course_name, c.dept_id,
                       c.lecture_hours_per_week, c.room_type_required, 
                       c.min_room_capacity, c.course_type,
                       co.offering_id, co.primary_faculty_id, co.co_faculty_ids,
                       (
                           SELECT ARRAY_AGG(DISTINCT student_id)
                           FROM course_enrollments
                           WHERE offering_id = co.offering_id AND is_active = true
                       ) as student_ids
                FROM courses c
                INNER JOIN course_offerings co ON c.course_id = co.course_id
                    AND co.is_active = true
                    AND co.primary_faculty_id IS NOT NULL
                    AND co.semester_type = %s
                WHERE c.org_id = %s 
                AND c.is_active = true
                AND EXISTS (
                    SELECT 1 FROM course_enrollments ce 
                    WHERE ce.offering_id = co.offering_id AND ce.is_active = true
                )
                LIMIT 5000
            """
            
            # Map semester number to semester_type (1=ODD, 2=EVEN) - UPPERCASE
            semester_type = 'ODD' if semester == 1 else 'EVEN'
            
            params = [semester_type, org_id]
            
            if department_id:
                query += " AND c.dept_id = %s"
                params.append(department_id)
            
            import time
            start_time = time.time()
            logger.info(f"Executing course query with org_id={org_id}, semester_type={semester_type}")
            cursor.execute(query, params)
            rows = cursor.fetchall()
            query_time = time.time() - start_time
            logger.info(f"Query returned {len(rows)} rows in {query_time:.2f}s")
            
            courses = []
            unique_students = set()  # Track unique students across all courses
            enrollment_counts = []  # Track enrollment per offering
            
            for row in rows:
                try:
                    student_ids_raw = row.get('student_ids')
                    
                    # PostgreSQL returns array as string like "{uuid1,uuid2}", parse it
                    if student_ids_raw and isinstance(student_ids_raw, str):
                        student_ids_raw = student_ids_raw.strip('{}').split(',') if student_ids_raw != '{}' else []
                    elif not student_ids_raw:
                        student_ids_raw = []
                    
                    student_ids = [str(sid).strip() for sid in student_ids_raw if sid and str(sid).strip()]
                    enrollment_counts.append(len(student_ids))
                    unique_students.update(student_ids)
                    
                    # Parse co_faculty_ids (JSON array)
                    co_faculty_ids = row.get('co_faculty_ids') or []
                    if isinstance(co_faculty_ids, str):
                        import json
                        try:
                            co_faculty_ids = json.loads(co_faculty_ids)
                        except:
                            co_faculty_ids = []
                    
                    # Split course into sections if co-faculty exists and enrollment > 60
                    faculty_list = [str(row['primary_faculty_id'])]
                    if co_faculty_ids:
                        faculty_list.extend([str(fid) for fid in co_faculty_ids if fid])
                    
                    num_sections = len(faculty_list)
                    
                    if num_sections > 1 and len(student_ids) > 60:
                        # Split students across sections
                        students_per_section = len(student_ids) // num_sections
                        remainder = len(student_ids) % num_sections
                        
                        start_idx = 0
                        for section_idx, faculty_id in enumerate(faculty_list):
                            # Distribute remainder students to first sections
                            section_size = students_per_section + (1 if section_idx < remainder else 0)
                            section_students = student_ids[start_idx:start_idx + section_size]
                            start_idx += section_size
                            
                            course = Course(
                                course_id=f"{row['course_id']}_off_{row['offering_id']}_sec{section_idx}",
                                course_code=f"{row['course_code']}",
                                course_name=f"{row['course_name']} (Section {section_idx+1})",
                                department_id=str(row['dept_id']),
                                faculty_id=faculty_id,
                                credits=row.get('lecture_hours_per_week', 3) or 3,
                                duration=row.get('lecture_hours_per_week', 3) or 3,
                                type=row.get('course_type', 'core'),
                                subject_type=row.get('course_type', 'core'),
                                required_features=[],
                                student_ids=section_students,
                                batch_ids=[]
                            )
                            courses.append(course)
                    else:
                        # Single section course
                        course = Course(
                            course_id=f"{row['course_id']}_off_{row['offering_id']}",
                            course_code=f"{row['course_code']}",
                            course_name=row['course_name'],
                            department_id=str(row['dept_id']),
                            faculty_id=str(row['primary_faculty_id']),
                            credits=row.get('lecture_hours_per_week', 3) or 3,
                            duration=row.get('lecture_hours_per_week', 3) or 3,
                            type=row.get('course_type', 'core'),
                            subject_type=row.get('course_type', 'core'),
                            required_features=[],
                            student_ids=student_ids,
                            batch_ids=[]
                        )
                        courses.append(course)
                except Exception as e:
                    logger.warning(f"Skipping course {row.get('course_code')}: {e}")
                    continue
            
            # Debug: Check course_offerings table
            if len(courses) == 0:
                cursor.execute("""
                    SELECT DISTINCT semester_type, semester_number, COUNT(*) as count
                    FROM course_offerings
                    WHERE org_id = %s
                    GROUP BY semester_type, semester_number
                    ORDER BY count DESC
                    LIMIT 10
                """, (org_id,))
                debug_rows = cursor.fetchall()
                logger.warning(f"Semester types in database: {[(r['semester_type'], r['semester_number'], r['count']) for r in debug_rows]}")
            
            # Get total distinct students enrolled (not just from filtered courses)
            cursor.execute("""
                SELECT COUNT(DISTINCT student_id) as total_students
                FROM course_enrollments
                WHERE is_active = true
            """)
            total_students_row = cursor.fetchone()
            total_students = total_students_row['total_students'] if total_students_row else 0
            logger.info(f"DEBUG: Total students in course_enrollments: {total_students}, Unique students in fetched courses: {len(unique_students)}")
            
            # Debug: Check enrollments for ODD semester offerings
            cursor.execute("""
                SELECT COUNT(DISTINCT ce.student_id) as odd_students,
                       COUNT(DISTINCT co.offering_id) as odd_offerings,
                       COUNT(*) as total_enrollments
                FROM course_offerings co
                LEFT JOIN course_enrollments ce ON co.offering_id = ce.offering_id AND ce.is_active = true
                WHERE co.org_id = %s AND co.semester_type = %s AND co.is_active = true
            """, (org_id, semester_type))
            debug_row = cursor.fetchone()
            logger.info(f"ODD semester DB stats: {debug_row['odd_offerings']} offerings, {debug_row['odd_students']} students, {debug_row['total_enrollments']} enrollments")
            
            # Log enrollment distribution
            if enrollment_counts:
                avg_enrollment = sum(enrollment_counts) / len(enrollment_counts)
                max_enrollment = max(enrollment_counts)
                offerings_with_students = sum(1 for c in enrollment_counts if c > 0)
                logger.info(f"Enrollment distribution: avg={avg_enrollment:.1f}, max={max_enrollment}, {offerings_with_students}/{len(enrollment_counts)} offerings have students")
                
                # Debug: Show sample offerings with student counts
                cursor.execute("""
                    SELECT co.offering_id, c.course_code, COUNT(ce.student_id) as student_count
                    FROM course_offerings co
                    INNER JOIN courses c ON co.course_id = c.course_id
                    LEFT JOIN course_enrollments ce ON co.offering_id = ce.offering_id AND ce.is_active = true
                    WHERE co.org_id = %s AND co.semester_type = %s AND co.is_active = true
                    GROUP BY co.offering_id, c.course_code
                    ORDER BY student_count DESC
                    LIMIT 10
                """, (org_id, semester_type))
                sample_offerings = cursor.fetchall()
                logger.info(f"Top 10 offerings by enrollment: {[(r['course_code'], r['student_count']) for r in sample_offerings]}")
            
            cursor.close()
            logger.info(f"Fetched {len(courses)} course offerings (out of {len(rows)} total offerings)")
            logger.info(f"Total unique students: {len(unique_students)} (System total: {total_students})")
            return courses

        except Exception as e:
            logger.error(f"Failed to fetch courses: {e}")
            if self.db_conn:
                self.db_conn.rollback()
            return []

    async def fetch_faculty(self, org_name: str) -> Dict[str, Faculty]:
        """Fetch faculty from database"""
        try:
            cursor = self.db_conn.cursor()
            
            # Get org_id
            cursor.execute("SELECT org_id FROM organizations WHERE org_name = %s", (org_name,))
            org_row = cursor.fetchone()
            if not org_row:
                return {}
            org_id = org_row['org_id']
            
            cursor.execute("""
                SELECT faculty_id, faculty_code, first_name, last_name, 
                       dept_id, max_hours_per_week, specialization
                FROM faculty 
                WHERE org_id = %s AND is_active = true
            """, (org_id,))
            
            rows = cursor.fetchall()
            faculty_dict = {}
            
            for row in rows:
                try:
                    fac = Faculty(
                        faculty_id=str(row['faculty_id']),
                        faculty_code=row.get('faculty_code', ''),
                        faculty_name=f"{row['first_name']} {row['last_name']}",
                        department_id=str(row['dept_id']),
                        max_hours_per_week=row.get('max_hours_per_week', 18) or 18,
                        specialization=row.get('specialization', '') or ''
                    )
                    faculty_dict[fac.faculty_id] = fac
                except Exception as e:
                    logger.warning(f"Skipping faculty {row.get('faculty_code')}: {e}")
                    continue
            
            cursor.close()
            logger.info(f"Fetched {len(faculty_dict)} faculty from database")
            return faculty_dict

        except Exception as e:
            logger.error(f"Failed to fetch faculty: {e}")
            if self.db_conn:
                self.db_conn.rollback()
            return {}

    async def fetch_rooms(self, org_name: str) -> List[Room]:
        """Fetch rooms from database"""
        try:
            cursor = self.db_conn.cursor()
            
            # Get org_id
            cursor.execute("SELECT org_id FROM organizations WHERE org_name = %s", (org_name,))
            org_row = cursor.fetchone()
            if not org_row:
                return []
            org_id = org_row['org_id']
            
            cursor.execute("""
                SELECT room_id, room_code, room_number, room_type, 
                       seating_capacity, building_id, dept_id
                FROM rooms 
                WHERE org_id = %s AND is_active = true
            """, (org_id,))
            
            rows = cursor.fetchall()
            rooms = []
            
            for row in rows:
                try:
                    room = Room(
                        room_id=str(row['room_id']),
                        room_code=row.get('room_code', ''),
                        room_name=row.get('room_number', ''),
                        room_type=row.get('room_type', 'classroom') or 'classroom',
                        capacity=row.get('seating_capacity', 60) or 60,
                        features=[],
                        dept_id=str(row['dept_id']),
                        department_id=str(row['dept_id'])
                    )
                    rooms.append(room)
                except Exception as e:
                    logger.warning(f"Skipping room {row.get('room_code')}: {e}")
                    continue
            
            cursor.close()
            logger.info(f"Fetched {len(rooms)} rooms from database")
            return rooms

        except Exception as e:
            logger.error(f"Failed to fetch rooms: {e}")
            if self.db_conn:
                self.db_conn.rollback()
            return []

    async def fetch_time_slots(self, org_name: str) -> List[TimeSlot]:
        """Generate standard time slots"""
        try:
            # Generate standard time slots (8 AM - 5 PM, 6 days, 8 slots per day)
            days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
            times = [
                ('08:00', '09:00'), ('09:00', '10:00'), ('10:00', '11:00'), ('11:00', '12:00'),
                ('12:00', '13:00'),  # Lunch break can be skipped if needed
                ('13:00', '14:00'), ('14:00', '15:00'), ('15:00', '16:00'), ('16:00', '17:00')
            ]
            
            time_slots = []
            slot_id = 0
            for day_idx, day in enumerate(days):
                for period_idx, (start, end) in enumerate(times):
                    slot = TimeSlot(
                        slot_id=str(slot_id),
                        day_of_week=day,
                        day=day_idx,
                        period=period_idx,
                        start_time=start,
                        end_time=end,
                        slot_name=f"{day.capitalize()} {start}-{end}"
                    )
                    time_slots.append(slot)
                    slot_id += 1
            
            logger.info(f"Generated {len(time_slots)} time slots")
            return time_slots

        except Exception as e:
            logger.error(f"Failed to generate time slots: {e}")
            return []

    async def fetch_students(self, org_name: str) -> Dict[str, Student]:
        """Fetch students from database"""
        try:
            cursor = self.db_conn.cursor()
            
            # Get org_id
            cursor.execute("SELECT org_id FROM organizations WHERE org_name = %s", (org_name,))
            org_row = cursor.fetchone()
            if not org_row:
                return {}
            org_id = org_row['org_id']
            
            cursor.execute("""
                SELECT student_id, enrollment_number, first_name, last_name,
                       dept_id, current_semester
                FROM students 
                WHERE org_id = %s AND is_active = true
            """, (org_id,))
            
            rows = cursor.fetchall()
            students_dict = {}
            
            for row in rows:
                try:
                    student = Student(
                        student_id=str(row['student_id']),
                        enrollment_number=row.get('enrollment_number', ''),
                        student_name=f"{row['first_name']} {row['last_name']}",
                        department_id=str(row['dept_id']),
                        semester=row.get('current_semester', 1) or 1,
                        batch_id=""
                    )
                    students_dict[student.student_id] = student
                except Exception as e:
                    logger.warning(f"Skipping student {row.get('enrollment_number')}: {e}")
                    continue
            
            cursor.close()
            logger.info(f"Fetched {len(students_dict)} students from database")
            return students_dict

        except Exception as e:
            logger.error(f"Failed to fetch students: {e}")
            if self.db_conn:
                self.db_conn.rollback()
            return {}

    async def fetch_batches(self, org_name: str) -> Dict[str, Batch]:
        """Fetch batches from database"""
        try:
            cursor = self.db_conn.cursor()
            
            # Get org_id
            cursor.execute("SELECT org_id FROM organizations WHERE org_name = %s", (org_name,))
            org_row = cursor.fetchone()
            if not org_row:
                return {}
            org_id = org_row['org_id']
            
            cursor.execute("""
                SELECT batch_id, batch_code, batch_name, dept_id,
                       current_semester, total_students
                FROM batches 
                WHERE org_id = %s AND is_active = true
            """, (org_id,))
            
            rows = cursor.fetchall()
            batches_dict = {}
            
            for row in rows:
                try:
                    batch = Batch(
                        batch_id=str(row['batch_id']),
                        batch_code=row.get('batch_code', ''),
                        batch_name=row.get('batch_name', ''),
                        department_id=str(row['dept_id']),
                        semester=row.get('current_semester', 1) or 1,
                        total_students=row.get('total_students', 60) or 60
                    )
                    batches_dict[batch.batch_id] = batch
                except Exception as e:
                    logger.warning(f"Skipping batch {row.get('batch_code')}: {e}")
                    continue
            
            cursor.close()
            logger.info(f"Fetched {len(batches_dict)} batches from database")
            return batches_dict

        except Exception as e:
            logger.error(f"Failed to fetch batches: {e}")
            if self.db_conn:
                self.db_conn.rollback()
            return {}

    async def save_timetable(self, job_id: str, timetable_data: Dict):
        """Save generated timetable back to Django"""
        try:
            response = await self.client.post(
                f"{self.base_url}/academics/timetables/",
                json=timetable_data
            )
            response.raise_for_status()

            logger.info(f"Saved timetable {job_id} to Django")
            return response.json()

        except Exception as e:
            logger.error(f"Failed to save timetable: {e}")
            raise
