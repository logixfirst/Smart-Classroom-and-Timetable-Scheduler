import os
import sys
import django

# Setup Django
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend', 'django'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp.settings')
django.setup()

from academics.models import Course, Student, CourseOffering, Faculty, Room, TimeSlot, GenerationJob, Organization
from django.db.models import Count, Q

def check_database():
    print("=" * 80)
    print("DATABASE VALIDATION CHECK")
    print("=" * 80)
    
    errors = []
    warnings = []
    
    # Check Organizations
    print('\n=== ORGANIZATIONS ===')
    orgs = Organization.objects.all()
    print(f'Total: {orgs.count()}')
    if orgs.count() == 0:
        errors.append("No organizations found in database")
    for org in orgs:
        print(f'  {org.org_id} - {org.org_name}')
        if not org.org_name:
            errors.append(f"Organization {org.org_id} has no name")
    
    # Check Courses
    print('\n=== COURSES ===')
    courses = Course.objects.all()
    print(f'Total courses: {courses.count()}')
    
    courses_no_dept = courses.filter(department__isnull=True)
    print(f'Courses without department: {courses_no_dept.count()}')
    if courses_no_dept.count() > 0:
        errors.append(f"{courses_no_dept.count()} courses have no department (CRITICAL)")
    
    courses_no_code = courses.filter(Q(course_code__isnull=True) | Q(course_code=""))
    print(f'Courses without code: {courses_no_code.count()}')
    if courses_no_code.count() > 0:
        errors.append(f"{courses_no_code.count()} courses have no course code")
    
    courses_no_name = courses.filter(Q(course_name__isnull=True) | Q(course_name=""))
    print(f'Courses without name: {courses_no_name.count()}')
    if courses_no_name.count() > 0:
        errors.append(f"{courses_no_name.count()} courses have no course name")
    
    # Check Students
    print('\n=== STUDENTS ===')
    students = Student.objects.all()
    print(f'Total students: {students.count()}')
    
    students_no_dept = students.filter(department__isnull=True)
    print(f'Students without department: {students_no_dept.count()}')
    if students_no_dept.count() > 0:
        errors.append(f"{students_no_dept.count()} students have no department (CRITICAL)")
    
    students_no_batch = students.filter(batch_id__isnull=True)
    print(f'Students without batch: {students_no_batch.count()}')
    if students_no_batch.count() > 0:
        warnings.append(f"{students_no_batch.count()} students have no batch assignment")
    
    # Check CourseOfferings
    print('\n=== COURSE OFFERINGS ===')
    offerings = CourseOffering.objects.all()
    print(f'Total course offerings: {offerings.count()}')
    
    offerings_null_course = offerings.filter(course__isnull=True)
    print(f'Course offerings with null course: {offerings_null_course.count()}')
    if offerings_null_course.count() > 0:
        errors.append(f"{offerings_null_course.count()} course offerings have null course (DATA CORRUPTION)")
    
    offerings_null_faculty = offerings.filter(primary_faculty__isnull=True)
    print(f'Course offerings without primary faculty: {offerings_null_faculty.count()}')
    if offerings_null_faculty.count() > 0:
        warnings.append(f"{offerings_null_faculty.count()} course offerings have no primary faculty")
    
    # Check cross-enrollment in latest generation job
    print('\n=== CROSS-ENROLLMENT ANALYSIS (from latest job) ===')
    latest_job = GenerationJob.objects.filter(status='completed').order_by('-created_at').first()
    if latest_job and latest_job.timetable_data:
        try:
            import json
            data = json.loads(latest_job.timetable_data) if isinstance(latest_job.timetable_data, str) else latest_job.timetable_data
            students = data.get('students', [])
            courses = {c['course_id']: c for c in data.get('courses', [])}
            
            cross_dept_count = 0
            max_depts = 0
            example_student = None
            
            for student in students:
                course_ids = student.get('enrolled_course_ids', [])
                departments = set()
                for cid in course_ids:
                    if cid in courses:
                        dept_id = courses[cid].get('department_id')
                        if dept_id:
                            departments.add(dept_id)
                
                if len(departments) > 1:
                    cross_dept_count += 1
                    if len(departments) > max_depts:
                        max_depts = len(departments)
                        example_student = student
            
            print(f'Students with cross-department enrollment: {cross_dept_count}')
            if cross_dept_count > 0:
                warnings.append(f"{cross_dept_count} students have cross-department enrollments (causes 97% of conflicts)")
                print(f'Maximum departments for one student: {max_depts}')
                if example_student:
                    print(f'Example: {example_student.get("student_name")} ({example_student.get("enrollment_number")}) enrolled in {max_depts} departments')
        except Exception as e:
            print(f'Could not analyze cross-enrollment: {e}')
    else:
        print('No completed generation job found to analyze cross-enrollment')
    
    # Check Rooms
    print('\n=== ROOMS ===')
    rooms = Room.objects.all()
    print(f'Total rooms: {rooms.count()}')
    if rooms.count() == 0:
        errors.append("No rooms found in database (CRITICAL)")
    
    rooms_no_capacity = rooms.filter(Q(seating_capacity__isnull=True) | Q(seating_capacity=0))
    print(f'Rooms without seating capacity: {rooms_no_capacity.count()}')
    if rooms_no_capacity.count() > 0:
        errors.append(f"{rooms_no_capacity.count()} rooms have no seating capacity set")
    
    # Check Time Slots
    print('\n=== TIME SLOTS ===')
    time_slots = TimeSlot.objects.all()
    print(f'Total time slots: {time_slots.count()}')
    if time_slots.count() == 0:
        errors.append("No time slots found in database (CRITICAL)")
    
    # Check Faculties
    print('\n=== FACULTIES ===')
    faculties = Faculty.objects.all()
    print(f'Total faculties: {faculties.count()}')
    if faculties.count() == 0:
        warnings.append("No faculties found in database")
    
    # Check Generation Jobs
    print('\n=== GENERATION JOBS ===')
    jobs = GenerationJob.objects.all().order_by('-created_at')[:10]
    total_jobs = GenerationJob.objects.count()
    print(f'Total jobs: {total_jobs}')
    
    if total_jobs > 0:
        print('\nLatest 10 jobs:')
        for job in jobs:
            print(f'  {str(job.id)[:8]}... | Status: {job.status:10} | Progress: {job.progress}%')
            
            if job.status == 'failed':
                errors.append(f"Job {str(job.id)[:8]} failed: {job.error_message or 'Unknown error'}")
    
    # Summary
    print("\n" + "=" * 80)
    print("VALIDATION SUMMARY")
    print("=" * 80)
    
    if len(errors) == 0 and len(warnings) == 0:
        print("✅ DATABASE IS HEALTHY - No errors or warnings found!")
    else:
        if len(errors) > 0:
            print(f"\n❌ CRITICAL ERRORS ({len(errors)}):")
            for i, error in enumerate(errors, 1):
                print(f"  {i}. {error}")
        
        if len(warnings) > 0:
            print(f"\n⚠️  WARNINGS ({len(warnings)}):")
            for i, warning in enumerate(warnings, 1):
                print(f"  {i}. {warning}")
    
    print("\n" + "=" * 80)
    return len(errors) == 0

if __name__ == '__main__':
    try:
        healthy = check_database()
        sys.exit(0 if healthy else 1)
    except Exception as e:
        print(f"\n❌ ERROR DURING DATABASE CHECK: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
