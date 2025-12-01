"""Django Backend Integration - Fetch data from Django database directly"""
import logging
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Optional
from models.timetable_models import Course, Faculty, Room, TimeSlot, Student, Batch
from utils.cache_manager import CacheManager

logger = logging.getLogger(__name__)


class DjangoAPIClient:
    """Client for fetching data directly from Django database with intelligent caching"""

    def __init__(self, redis_client=None):
        self.db_conn = None
        self.cache_manager = CacheManager(redis_client=redis_client, db_conn=None)
        self._connect_db()
        # Set db_conn in cache manager after connection
        self.cache_manager.db_conn = self.db_conn
    
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
    
    def resolve_org_id(self, org_identifier: str) -> str:
        """
        Resolve organization name to UUID if needed.
        If org_identifier is already a UUID, return it.
        If it's an org_name, look up the UUID.
        
        Args:
            org_identifier: Either org_id (UUID) or org_name
        
        Returns:
            org_id (UUID)
        """
        # Check if it's already a UUID (contains hyphens and is 36 chars)
        if len(org_identifier) == 36 and '-' in org_identifier:
            return org_identifier
        
        # It's an org_name, look up the UUID
        try:
            cursor = self.db_conn.cursor()
            cursor.execute(
                "SELECT org_id FROM organizations WHERE org_name = %s",
                (org_identifier,)
            )
            row = cursor.fetchone()
            cursor.close()
            
            if row:
                logger.info(f"[ORG] Resolved '{org_identifier}' -> {row['org_id']}")
                return row['org_id']
            else:
                logger.error(f"[ORG] Organization '{org_identifier}' not found")
                # List available orgs
                cursor = self.db_conn.cursor()
                cursor.execute("SELECT org_id, org_name FROM organizations LIMIT 5")
                orgs = cursor.fetchall()
                cursor.close()
                logger.error(f"[ORG] Available: {[(o['org_name'], o['org_id']) for o in orgs]}")
                raise ValueError(f"Organization '{org_identifier}' not found")
        except Exception as e:
            logger.error(f"[ORG] Failed to resolve org_id: {e}")
            raise
    
    async def fetch_time_config(self, org_id: str) -> Optional[Dict]:
        """
        Fetch timetable configuration from database with caching.
        
        Args:
            org_id: Organization ID
        
        Returns:
            Configuration dict with working_days, slots_per_day, start_time, etc.
        """
        # Try cache first
        cached_config = await self.cache_manager.get('config', org_id)
        if cached_config:
            logger.info(f"[CONFIG] Using cached config: {cached_config['working_days']} days, {cached_config['slots_per_day']} slots/day")
            return cached_config
        
        # Fetch from database
        try:
            cursor = self.db_conn.cursor()
            cursor.execute("""
                SELECT working_days, slots_per_day, start_time, end_time,
                       slot_duration_minutes, lunch_break_enabled, 
                       lunch_break_start, lunch_break_end
                FROM timetable_configurations
                WHERE org_id = %s
                ORDER BY last_used_at DESC
                LIMIT 1
            """, (org_id,))
            
            config_row = cursor.fetchone()
            cursor.close()
            
            if config_row:
                config = {
                    'working_days': config_row['working_days'],
                    'slots_per_day': config_row['slots_per_day'],
                    'start_time': str(config_row['start_time']),
                    'end_time': str(config_row['end_time']),
                    'slot_duration_minutes': config_row['slot_duration_minutes'],
                    'lunch_break_enabled': config_row['lunch_break_enabled'],
                    'lunch_break_start': str(config_row['lunch_break_start']) if config_row['lunch_break_start'] else None,
                    'lunch_break_end': str(config_row['lunch_break_end']) if config_row['lunch_break_end'] else None,
                }
                
                # Cache for 24 hours
                await self.cache_manager.set('config', org_id, config, ttl=86400)
                logger.info(f"[CONFIG] Fetched from DB and cached: {config['working_days']} days, {config['slots_per_day']} slots/day")
                return config
            else:
                logger.warning(f"[CONFIG] No config found for org {org_id}, using defaults")
                return None
                
        except Exception as e:
            logger.error(f"[CONFIG] Fetch error: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return None

    async def fetch_courses(
        self,
        org_id: str,
        semester: int,
        department_id: Optional[str] = None
    ) -> List[Course]:
        """Fetch courses from database with caching"""
        # Try cache first
        cached_courses = await self.cache_manager.get('courses', org_id, semester=semester, department_id=department_id)
        if cached_courses:
            logger.info(f"[CACHE] Using cached courses: {len(cached_courses)} courses")
            # Deserialize from dict back to Course objects
            return [Course(**c) for c in cached_courses]
        
        # Fetch from database
        try:
            cursor = self.db_conn.cursor()
            
            # Validate org_id exists
            cursor.execute("SELECT org_id, org_name FROM organizations WHERE org_id = %s", (org_id,))
            org_row = cursor.fetchone()
            if not org_row:
                logger.error(f"Organization ID '{org_id}' not found")
                # Try to list available organizations
                cursor.execute("SELECT org_id, org_name FROM organizations LIMIT 5")
                orgs = cursor.fetchall()
                logger.error(f"Available organizations: {[o['org_name'] for o in orgs]}")
                return []
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
                    
                    # CRITICAL: Split large courses (>60 students) into sections to fit 60-capacity rooms
                    if len(student_ids) > 60:
                        # Calculate number of sections needed (round up)
                        num_sections = (len(student_ids) + 59) // 60  # Ceiling division
                        students_per_section = len(student_ids) // num_sections
                        remainder = len(student_ids) % num_sections
                        
                        logger.debug(f"Splitting {row['course_code']} ({len(student_ids)} students) into {num_sections} sections")
                        
                        start_idx = 0
                        for section_idx in range(num_sections):
                            # Distribute remainder students to first sections
                            section_size = students_per_section + (1 if section_idx < remainder else 0)
                            section_students = student_ids[start_idx:start_idx + section_size]
                            start_idx += section_size
                            
                            course = Course(
                                course_id=f"{row['course_id']}_off_{row['offering_id']}_sec{section_idx}",
                                course_code=f"{row['course_code']}",
                                course_name=f"{row['course_name']} (Sec {section_idx+1}/{num_sections})",
                                department_id=str(row['dept_id']),
                                faculty_id=str(row['primary_faculty_id']),  # Same faculty for all sections
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
                        # Single section course (≤60 students)
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
            sections_created = len(courses) - len(rows)
            logger.info(f"Fetched {len(rows)} course offerings from database")
            logger.info(f"Created {len(courses)} course sections ({sections_created} extra sections from splitting large courses)")
            logger.info(f"Total unique students: {len(unique_students)} (System total: {total_students})")
            
            # Cache courses for 30 minutes (convert to dict for JSON serialization)
            courses_dict = [c.dict() for c in courses]
            await self.cache_manager.set('courses', org_id, courses_dict, ttl=1800, semester=semester, department_id=department_id)
            logger.info(f"[CACHE] Cached {len(courses)} courses")
            
            return courses

        except Exception as e:
            logger.error(f"Failed to fetch courses: {e}")
            if self.db_conn:
                self.db_conn.rollback()
            return []

    async def fetch_faculty(self, org_id: str) -> Dict[str, Faculty]:
        """Fetch faculty from database with caching"""
        # Try cache first
        cached_faculty = await self.cache_manager.get('faculty', org_id)
        if cached_faculty:
            logger.info(f"[CACHE] Using cached faculty: {len(cached_faculty)} faculty members")
            # Deserialize from dict back to Faculty objects
            return {fid: Faculty(**fdata) for fid, fdata in cached_faculty.items()}
        
        # Fetch from database
        try:
            cursor = self.db_conn.cursor()
            
            # Validate org_id exists
            cursor.execute("SELECT org_id FROM organizations WHERE org_id = %s", (org_id,))
            org_row = cursor.fetchone()
            if not org_row:
                logger.warning(f"Organization ID '{org_id}' not found")
                return {}
            
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
            
            # Cache faculty for 1 hour (convert to dict for JSON serialization)
            faculty_cache = {fid: fac.dict() for fid, fac in faculty_dict.items()}
            await self.cache_manager.set('faculty', org_id, faculty_cache, ttl=3600)
            logger.info(f"[CACHE] Cached {len(faculty_dict)} faculty members")
            
            return faculty_dict

        except Exception as e:
            logger.error(f"Failed to fetch faculty: {e}")
            if self.db_conn:
                self.db_conn.rollback()
            return {}

    async def fetch_rooms(self, org_id: str) -> List[Room]:
        """Fetch rooms from database with caching"""
        # Try cache first
        cached_rooms = await self.cache_manager.get('rooms', org_id)
        if cached_rooms:
            logger.info(f"[CACHE] Using cached rooms: {len(cached_rooms)} rooms")
            # Deserialize from dict back to Room objects
            return [Room(**r) for r in cached_rooms]
        
        # Fetch from database
        try:
            cursor = self.db_conn.cursor()
            
            # Validate org_id exists
            cursor.execute("SELECT org_id FROM organizations WHERE org_id = %s", (org_id,))
            org_row = cursor.fetchone()
            if not org_row:
                logger.warning(f"Organization ID '{org_id}' not found")
                return []
            
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
            
            # Cache rooms for 1 hour (convert to dict for JSON serialization)
            rooms_cache = [r.dict() for r in rooms]
            await self.cache_manager.set('rooms', org_id, rooms_cache, ttl=3600)
            logger.info(f"[CACHE] Cached {len(rooms)} rooms")
            
            return rooms

        except Exception as e:
            logger.error(f"Failed to fetch rooms: {e}")
            if self.db_conn:
                self.db_conn.rollback()
            return []

    async def fetch_time_slots(self, org_id: str, time_config: dict = None, departments: List[str] = None) -> List[TimeSlot]:
        """
        Generate department-specific time slots for NEP 2020 centralized scheduling.
        
        NEP 2020 Architecture:
        - Each department has its own set of time slots (e.g., 127 departments × 48 slots = 6,096 total)
        - Students can take courses across departments without time conflicts
        - A course scheduled in "CS Monday 9:00-10:00" is DIFFERENT from "Physics Monday 9:00-10:00"
        
        Args:
            org_id: Organization ID (UUID)
            time_config: Time configuration dict with working_days, slots_per_day, start_time, etc.
            departments: List of department IDs (if None, fetches from database)
        
        Returns:
            List of TimeSlot objects (one per department per time slot)
        """
        try:
            from datetime import datetime, timedelta
            
            # If no departments provided, fetch from database
            if not departments:
                cursor = self.db_conn.cursor()
                cursor.execute("""
                    SELECT DISTINCT dept_id 
                    FROM courses 
                    WHERE org_id = %s
                    AND is_active = true
                    ORDER BY dept_id
                """, (org_id,))
                dept_rows = cursor.fetchall()
                departments = [row['dept_id'] for row in dept_rows]
                logger.info(f"[TIME_SLOTS] Fetched {len(departments)} departments from database for org {org_id}")
            
            if not departments:
                logger.error("[TIME_SLOTS] No departments found! Cannot generate time slots.")
                return []
            
            # Use time_config if provided, otherwise use defaults
            if time_config:
                working_days = time_config.get('working_days', 6)
                slots_per_day = time_config.get('slots_per_day', 9)
                start_time_str = time_config.get('start_time', '08:00')
                end_time_str = time_config.get('end_time', '17:00')
                slot_duration = time_config.get('slot_duration_minutes', 60)
                lunch_break_enabled = time_config.get('lunch_break_enabled', True)
                lunch_break_start = time_config.get('lunch_break_start', '12:00')
                lunch_break_end = time_config.get('lunch_break_end', '13:00')
                logger.info(f"[TIME_SLOTS] Using config: {working_days} days, {slots_per_day} slots/day, {start_time_str}-{end_time_str}")
            else:
                # Default configuration (matches old behavior)
                working_days = 6
                slots_per_day = 9
                start_time_str = '08:00'
                end_time_str = '17:00'
                slot_duration = 60
                lunch_break_enabled = True
                lunch_break_start = '12:00'
                lunch_break_end = '13:00'
                logger.warning("[TIME_SLOTS] No time_config provided, using defaults")
            
            # Parse start time
            start_time = datetime.strptime(start_time_str, '%H:%M')
            
            # Parse lunch break times
            lunch_start = datetime.strptime(lunch_break_start, '%H:%M') if lunch_break_enabled else None
            lunch_end = datetime.strptime(lunch_break_end, '%H:%M') if lunch_break_enabled else None
            
            # NEP 2020: Generate time slots FOR EACH DEPARTMENT
            days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][:working_days]
            time_slots = []
            
            for dept_id in departments:
                for day_idx, day in enumerate(days):
                    current_time = start_time
                    period_idx = 0
                    
                    for _ in range(slots_per_day):
                        # Calculate slot end time
                        slot_end = current_time + timedelta(minutes=slot_duration)
                        
                        # Check if this slot overlaps with lunch break
                        if lunch_break_enabled and lunch_start and lunch_end:
                            # Skip if slot starts during lunch break
                            if lunch_start <= current_time < lunch_end:
                                current_time = lunch_end  # Jump to end of lunch break
                                continue
                        
                        # Create time slot
                        start_str = current_time.strftime('%H:%M')
                        end_str = slot_end.strftime('%H:%M')
                        
                        # NEP 2020: Department-specific slot ID
                        slot_id = f"{dept_id}_{day_idx}_{period_idx}"
                        
                        slot = TimeSlot(
                            slot_id=slot_id,
                            department_id=dept_id,
                            day_of_week=day,
                            day=day_idx,
                            period=period_idx,
                            start_time=start_str,
                            end_time=end_str,
                            slot_name=f"{dept_id[:8]} {day.capitalize()} {start_str}-{end_str}"
                        )
                        time_slots.append(slot)
                        
                        # Move to next slot
                        current_time = slot_end
                        period_idx += 1
            
            slots_per_dept = len(time_slots) // len(departments) if departments else 0
            logger.info(f"[TIME_SLOTS] Generated {len(time_slots)} department-specific time slots")
            logger.info(f"[TIME_SLOTS] {len(departments)} departments × {slots_per_dept} slots/dept = {len(time_slots)} total")
            if lunch_break_enabled:
                logger.info(f"[TIME_SLOTS] Lunch break: {lunch_break_start}-{lunch_break_end}")
            
            return time_slots

        except Exception as e:
            logger.error(f"[TIME_SLOTS] Failed to generate time slots: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return []

    async def fetch_students(self, org_id: str) -> Dict[str, Student]:
        """Fetch students from database with caching"""
        # Try cache first
        cached_students = await self.cache_manager.get('students', org_id)
        if cached_students:
            logger.info(f"[CACHE] Using cached students: {len(cached_students)} students")
            # Deserialize from dict back to Student objects
            return {sid: Student(**sdata) for sid, sdata in cached_students.items()}
        
        # Fetch from database
        try:
            cursor = self.db_conn.cursor()
            
            # Validate org_id exists
            cursor.execute("SELECT org_id FROM organizations WHERE org_id = %s", (org_id,))
            org_row = cursor.fetchone()
            if not org_row:
                logger.warning(f"Organization ID '{org_id}' not found")
                return {}
            
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
            
            # Cache students for 30 minutes (convert to dict for JSON serialization)
            students_cache = {sid: stud.dict() for sid, stud in students_dict.items()}
            await self.cache_manager.set('students', org_id, students_cache, ttl=1800)
            logger.info(f"[CACHE] Cached {len(students_dict)} students")
            
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
