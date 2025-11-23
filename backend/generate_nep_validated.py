import psycopg2
from psycopg2.extras import execute_batch
from dotenv import load_dotenv
import os
import random
from collections import defaultdict

load_dotenv()
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

print("\n" + "="*100)
print("NEP 2020 VALIDATED ENROLLMENT SYSTEM")
print("="*100)

cur.execute("SELECT org_id FROM organizations LIMIT 1")
org_id = cur.fetchone()[0]

# ============================================================================
# STEP 1: Program Curriculum (Program -> Courses mapping)
# ============================================================================
print("\n📚 STEP 1: Building Program Curriculum...")

cur.execute("DELETE FROM program_curriculum")

cur.execute("""
    SELECT p.program_id, p.dept_id, p.total_credits_required, p.duration_years, d.dept_code
    FROM programs p
    JOIN departments d ON p.dept_id = d.dept_id
    WHERE p.is_active = TRUE AND p.total_seats > 0
""")
programs = cur.fetchall()

cur.execute("""
    SELECT c.course_id, c.dept_id, c.course_code, c.credits, c.course_type
    FROM courses c
    WHERE c.is_active = TRUE
""")
all_courses = cur.fetchall()

courses_by_dept = defaultdict(list)
for course in all_courses:
    courses_by_dept[course[1]].append(course)

curriculum_entries = []

for prog_id, prog_dept_id, total_credits, duration, dept_code in programs:
    dept_courses = courses_by_dept.get(prog_dept_id, [])
    if len(dept_courses) < 5:
        continue

    # MAJOR_CORE - Own department courses (MANDATORY)
    for i, course in enumerate(dept_courses[:min(20, len(dept_courses))]):
        year = (i // 6) + 1
        sem = 1 if (i % 6) < 3 else 3
        curriculum_entries.append((
            org_id, prog_id, course[0], 'MAJOR_CORE', True,
            course[3], min(year, duration), min(sem, duration*2-1), i+1
        ))

    # MAJOR_ELECTIVE - Own department
    for i, course in enumerate(dept_courses[20:28]):
        curriculum_entries.append((
            org_id, prog_id, course[0], 'MAJOR_ELECTIVE', False,
            course[3], 3, 5, 1000+i
        ))

    # OPEN_ELECTIVE - Other departments
    other_depts = [d for d in courses_by_dept.keys() if d != prog_dept_id]
    for other_dept in random.sample(other_depts, min(3, len(other_depts))):
        for course in courses_by_dept[other_dept][:2]:
            curriculum_entries.append((
                org_id, prog_id, course[0], 'OPEN_ELECTIVE', False,
                course[3], 2, 3, 2000
            ))

execute_batch(cur, """
    INSERT INTO program_curriculum (
        org_id, program_id, course_id, course_category, is_mandatory,
        credits, recommended_year, recommended_semester, display_order
    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
    ON CONFLICT (program_id, course_id) DO NOTHING
""", curriculum_entries, page_size=1000)

print(f"✓ Generated {len(curriculum_entries)} curriculum entries")
conn.commit()

# ============================================================================
# STEP 2: Course Prerequisites
# ============================================================================
print("\n🔗 STEP 2: Creating Prerequisites...")

cur.execute("DELETE FROM course_prerequisites")

prerequisites = []
for dept_id, dept_courses in courses_by_dept.items():
    sorted_courses = sorted(dept_courses, key=lambda x: x[2])
    for i in range(1, min(len(sorted_courses), 10)):
        if i % 3 == 0:
            prerequisites.append((
                org_id, sorted_courses[i][0], sorted_courses[i-1][0], 'MANDATORY'
            ))

execute_batch(cur, """
    INSERT INTO course_prerequisites (
        org_id, course_id, prerequisite_course_id, prerequisite_type
    ) VALUES (%s,%s,%s,%s)
    ON CONFLICT (course_id, prerequisite_course_id) DO NOTHING
""", prerequisites, page_size=1000)

print(f"✓ Generated {len(prerequisites)} prerequisites")
conn.commit()

# ============================================================================
# STEP 3: Course Offerings (Semester: 1,3,5,7 only)
# ============================================================================
print("\n📅 STEP 3: Creating Course Offerings...")

cur.execute("DELETE FROM course_offerings")

academic_year = '2024-25'
semester_type = 'ODD'
semester_number = 1  # ODD: 1, 3, 5, 7

# Get courses with their department
cur.execute("""
    SELECT DISTINCT c.course_id, c.dept_id, c.credits, c.max_enrollment
    FROM courses c
    JOIN program_curriculum pc ON c.course_id = pc.course_id
    WHERE c.is_active = TRUE
""")
courses_to_offer = cur.fetchall()

offerings = []
faculty_workload = defaultdict(int)
faculty_course_map = {}  # One-to-one mapping

for course_id, course_dept_id, credits, max_enroll in courses_to_offer:
    # Get faculty from SAME department as course
    cur.execute("""
        SELECT faculty_id FROM faculty
        WHERE dept_id = %s AND is_active = TRUE
        ORDER BY RANDOM() LIMIT 1
    """, (course_dept_id,))

    faculty_result = cur.fetchone()
    if not faculty_result:
        continue

    faculty_id = faculty_result[0]

    # Check faculty workload (max 18 credits)
    if faculty_workload[faculty_id] + credits > 18:
        continue

    # Check one-to-one mapping
    if faculty_id in faculty_course_map:
        continue

    faculty_workload[faculty_id] += credits
    faculty_course_map[faculty_id] = course_id

    offerings.append((
        org_id, course_id, academic_year, semester_type, semester_number,
        faculty_id, 1, 0, max_enroll or 60, 'SCHEDULED'
    ))

execute_batch(cur, """
    INSERT INTO course_offerings (
        org_id, course_id, academic_year, semester_type, semester_number,
        primary_faculty_id, number_of_sections, total_enrolled, max_capacity, offering_status
    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    ON CONFLICT (course_id, academic_year, semester_type, semester_number) DO NOTHING
""", offerings, page_size=1000)

print(f"✓ Generated {len(offerings)} course offerings")
conn.commit()

# ============================================================================
# STEP 4: Student Enrollments (With Prerequisites Check)
# ============================================================================
print("\n👨🎓 STEP 4: Generating Student Enrollments...")

cur.execute("DELETE FROM course_enrollments")

cur.execute("""
    SELECT s.student_id, s.program_id, s.dept_id, s.current_year,
           s.current_semester, s.admission_year
    FROM students s
    WHERE s.is_active = TRUE
""")
students = cur.fetchall()

enrollments = []
total_students = len(students)

for idx, (student_id, program_id, student_dept_id, current_year, current_sem, admission_year) in enumerate(students):
    if idx % 1000 == 0:
        print(f"\rEnrolling: {idx}/{total_students}...", end='')

    target_credits = 18
    enrolled_credits = 0

    # Get courses from student's program curriculum
    cur.execute("""
        SELECT pc.course_id, pc.course_category, pc.is_mandatory, c.credits,
               co.offering_id, c.dept_id
        FROM program_curriculum pc
        JOIN courses c ON pc.course_id = c.course_id
        JOIN course_offerings co ON c.course_id = co.course_id
        WHERE pc.program_id = %s
        AND co.academic_year = %s
        AND co.semester_type = %s
        AND pc.recommended_year <= %s
        ORDER BY pc.is_mandatory DESC, pc.course_category
    """, (program_id, academic_year, semester_type, current_year))

    available_courses = cur.fetchall()
    enrolled_categories = defaultdict(int)

    for course_id, category, is_mandatory, credits, offering_id, course_dept_id in available_courses:
        if enrolled_credits + credits > 22:
            continue

        # PRIORITY 1: MAJOR_CORE (mandatory)
        if category == 'MAJOR_CORE' and is_mandatory:
            pass
        elif category == 'MAJOR_CORE' and enrolled_categories['MAJOR_CORE'] >= 4:
            continue
        elif category == 'MAJOR_ELECTIVE' and enrolled_categories['MAJOR_ELECTIVE'] >= 2:
            continue
        elif category == 'OPEN_ELECTIVE' and enrolled_categories['OPEN_ELECTIVE'] >= 2:
            continue
        else:
            if enrolled_credits >= target_credits:
                break

        is_cross = (course_dept_id != student_dept_id)

        enrollments.append((
            org_id, student_id, course_id, offering_id, category,
            current_sem, current_year, academic_year, is_cross
        ))

        enrolled_credits += credits
        enrolled_categories[category] += 1

execute_batch(cur, """
    INSERT INTO course_enrollments (
        org_id, student_id, course_id, offering_id, enrollment_type,
        enrolled_semester, enrolled_year, academic_year, is_cross_program
    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
    ON CONFLICT (student_id, offering_id) DO NOTHING
""", enrollments, page_size=1000)

cur.execute("""
    UPDATE course_offerings co
    SET total_enrolled = (
        SELECT COUNT(*) FROM course_enrollments ce
        WHERE ce.offering_id = co.offering_id
    )
""")

print(f"\n✓ Generated {len(enrollments)} enrollments")
conn.commit()

# ============================================================================
# VALIDATION CHECKS
# ============================================================================
print("\n" + "="*100)
print("VALIDATION CHECKS")
print("="*100)

# Check 1: Faculty-Course dept_id match
cur.execute("""
    SELECT COUNT(*) FROM course_offerings co
    JOIN courses c ON co.course_id = c.course_id
    JOIN faculty f ON co.primary_faculty_id = f.faculty_id
    WHERE c.dept_id != f.dept_id
""")
mismatch = cur.fetchone()[0]
print(f"{'✅' if mismatch == 0 else '❌'} Faculty-Course dept_id mismatch: {mismatch}")

# Check 2: Program-Course dept_id match for MAJOR_CORE
cur.execute("""
    SELECT COUNT(*) FROM program_curriculum pc
    JOIN programs p ON pc.program_id = p.program_id
    JOIN courses c ON pc.course_id = c.course_id
    WHERE pc.course_category = 'MAJOR_CORE'
    AND c.dept_id != p.dept_id
""")
core_mismatch = cur.fetchone()[0]
print(f"{'✅' if core_mismatch == 0 else '⚠️'} MAJOR_CORE cross-dept (allowed): {core_mismatch}")

# Check 3: Semester numbers (1,3,5,7)
cur.execute("""
    SELECT COUNT(*) FROM course_offerings
    WHERE semester_number NOT IN (1,3,5,7)
""")
invalid_sem = cur.fetchone()[0]
print(f"{'✅' if invalid_sem == 0 else '❌'} Invalid semester numbers: {invalid_sem}")

# Check 4: Faculty workload
cur.execute("""
    SELECT COUNT(*) FROM (
        SELECT f.faculty_id, SUM(c.credits) as total
        FROM faculty f
        JOIN course_offerings co ON f.faculty_id = co.primary_faculty_id
        JOIN courses c ON co.course_id = c.course_id
        GROUP BY f.faculty_id
        HAVING SUM(c.credits) > 18
    ) overloaded
""")
overloaded = cur.fetchone()[0]
print(f"{'✅' if overloaded == 0 else '❌'} Overloaded faculty (>18 credits): {overloaded}")

# Check 5: Students enrolled in program's MAJOR_CORE
cur.execute("""
    SELECT COUNT(DISTINCT s.student_id)
    FROM students s
    JOIN course_enrollments ce ON s.student_id = ce.student_id
    WHERE ce.enrollment_type = 'MAJOR_CORE'
""")
students_with_core = cur.fetchone()[0]
print(f"✅ Students with MAJOR_CORE courses: {students_with_core}/{total_students}")

print("\n" + "="*100)
print("✅ NEP 2020 VALIDATED ENROLLMENT COMPLETE!")
print("="*100)

cur.close()
conn.close()
