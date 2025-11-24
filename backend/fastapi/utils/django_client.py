"""Django Backend Integration - Fetch data from Django database directly"""
import logging
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Optional
from models.timetable_models import Course, Faculty, Room, TimeSlot, Student, Batch

logger = logging.getLogger(__name__)


class DjangoAPIClient:
    """Client for fetching data directly from Django database"""

    def __init__(self):
        self.db_conn = None
        self._connect_db()
    
    def _connect_db(self):
        """Connect to Django's PostgreSQL database"""
        try:
            db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/sih28')
            self.db_conn = psycopg2.connect(db_url, cursor_factory=RealDictCursor)
            logger.info("Connected to Django database")
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            raise

    async def close(self):
        """Close database connection"""
        if self.db_conn:
            self.db_conn.close()

    async def fetch_courses(
        self,
        org_id: str,
        semester: int,
        department_id: Optional[str] = None
    ) -> List[Course]:
        """Fetch courses from database"""
        try:
            cursor = self.db_conn.cursor()
            
            query = """
                SELECT course_id, course_code, course_name, dept_id,
                       lecture_hours_per_week, room_type_required, 
                       min_room_capacity, course_type
                FROM courses 
                WHERE org_id = %s AND is_active = true
                AND (
                    (offered_in_odd_semester = true AND %s = 1) OR
                    (offered_in_even_semester = true AND %s = 2)
                )
            """
            params = [org_id, semester, semester]
            
            if department_id:
                query += " AND dept_id = %s"
                params.append(department_id)
            
            query += " LIMIT 100"
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            courses = []
            for row in rows:
                course = Course(
                    course_id=str(row['course_id']),
                    course_code=row['course_code'],
                    course_name=row['course_name'],
                    department_id=str(row['dept_id']),
                    faculty_id="",  # Will be assigned
                    credits=row.get('lecture_hours_per_week', 3),
                    duration=1,
                    subject_type=row.get('course_type', 'core'),
                    required_features=[],
                    student_ids=[],
                    batch_ids=[]
                )
                courses.append(course)
            
            cursor.close()
            logger.info(f"Fetched {len(courses)} courses from database")
            return courses

        except Exception as e:
            logger.error(f"Failed to fetch courses: {e}")
            return []

    async def fetch_faculty(self, org_id: str) -> Dict[str, Faculty]:
        """Fetch faculty from database"""
        try:
            cursor = self.db_conn.cursor()
            
            cursor.execute("""
                SELECT faculty_id, faculty_code, first_name, last_name, 
                       dept_id, max_hours_per_week, specialization
                FROM faculty 
                WHERE org_id = %s AND is_active = true
                LIMIT 50
            """, (org_id,))
            
            rows = cursor.fetchall()
            faculty_dict = {}
            
            for row in rows:
                fac = Faculty(
                    faculty_id=str(row['faculty_id']),
                    faculty_code=row['faculty_code'],
                    faculty_name=f"{row['first_name']} {row['last_name']}",
                    department_id=str(row['dept_id']),
                    max_hours_per_week=row.get('max_hours_per_week', 18),
                    specialization=row.get('specialization', '')
                )
                faculty_dict[fac.faculty_id] = fac
            
            cursor.close()
            logger.info(f"Fetched {len(faculty_dict)} faculty from database")
            return faculty_dict

        except Exception as e:
            logger.error(f"Failed to fetch faculty: {e}")
            return {}

    async def fetch_rooms(self, org_id: str) -> List[Room]:
        """Fetch rooms from database"""
        try:
            cursor = self.db_conn.cursor()
            
            cursor.execute("""
                SELECT room_id, room_code, room_number, room_type, 
                       seating_capacity, building_id
                FROM rooms 
                WHERE org_id = %s AND is_active = true
                LIMIT 60
            """, (org_id,))
            
            rows = cursor.fetchall()
            rooms = []
            
            for row in rows:
                room = Room(
                    room_id=str(row['room_id']),
                    room_code=row['room_code'],
                    room_name=row['room_number'],
                    room_type=row.get('room_type', 'classroom'),
                    capacity=row.get('seating_capacity', 60),
                    features=[]
                )
                rooms.append(room)
            
            cursor.close()
            logger.info(f"Fetched {len(rooms)} rooms from database")
            return rooms

        except Exception as e:
            logger.error(f"Failed to fetch rooms: {e}")
            return []

    async def fetch_time_slots(self, org_id: str) -> List[TimeSlot]:
        """Generate standard time slots"""
        try:
            # Generate standard time slots (9 AM - 5 PM, 6 days)
            days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
            times = [
                ('09:00', '10:00'), ('10:00', '11:00'), ('11:00', '12:00'),
                ('12:00', '13:00'), ('14:00', '15:00'), ('15:00', '16:00'), ('16:00', '17:00')
            ]
            
            time_slots = []
            slot_id = 0
            for day in days:
                for start, end in times:
                    slot = TimeSlot(
                        slot_id=str(slot_id),
                        day_of_week=day,
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

    async def fetch_students(self, org_id: str) -> Dict[str, Student]:
        """Fetch students from database"""
        try:
            cursor = self.db_conn.cursor()
            
            cursor.execute("""
                SELECT student_id, enrollment_number, first_name, last_name,
                       dept_id, current_semester
                FROM students 
                WHERE org_id = %s AND is_active = true
                LIMIT 200
            """, (org_id,))
            
            rows = cursor.fetchall()
            students_dict = {}
            
            for row in rows:
                student = Student(
                    student_id=str(row['student_id']),
                    enrollment_number=row['enrollment_number'],
                    student_name=f"{row['first_name']} {row['last_name']}",
                    department_id=str(row['dept_id']),
                    semester=row.get('current_semester', 1),
                    batch_id=""
                )
                students_dict[student.student_id] = student
            
            cursor.close()
            logger.info(f"Fetched {len(students_dict)} students from database")
            return students_dict

        except Exception as e:
            logger.error(f"Failed to fetch students: {e}")
            return {}

    async def fetch_batches(self, org_id: str) -> Dict[str, Batch]:
        """Fetch batches from database"""
        try:
            cursor = self.db_conn.cursor()
            
            cursor.execute("""
                SELECT batch_id, batch_code, batch_name, dept_id,
                       current_semester, total_students
                FROM batches 
                WHERE org_id = %s AND is_active = true
                LIMIT 30
            """, (org_id,))
            
            rows = cursor.fetchall()
            batches_dict = {}
            
            for row in rows:
                batch = Batch(
                    batch_id=str(row['batch_id']),
                    batch_code=row['batch_code'],
                    batch_name=row['batch_name'],
                    department_id=str(row['dept_id']),
                    semester=row.get('current_semester', 1),
                    total_students=row.get('total_students', 60)
                )
                batches_dict[batch.batch_id] = batch
            
            cursor.close()
            logger.info(f"Fetched {len(batches_dict)} batches from database")
            return batches_dict

        except Exception as e:
            logger.error(f"Failed to fetch batches: {e}")
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
