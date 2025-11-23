import psycopg2
from psycopg2.extras import execute_batch
from psycopg2 import pool
from dotenv import load_dotenv
import os
import random
from collections import defaultdict
import time

load_dotenv()

# Connection pool to handle reconnections
connection_pool = pool.SimpleConnectionPool(1, 5, os.getenv('DATABASE_URL'))

def get_connection():
    """Get connection from pool with retry"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            conn = connection_pool.getconn()
            conn.autocommit = False
            return conn
        except Exception as e:
            print(f"Connection attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(2)
            else:
                raise

def return_connection(conn):
    """Return connection to pool"""
    try:
        connection_pool.putconn(conn)
    except:
        pass

print("\n" + "="*100)
print("NEP 2020 VALIDATED ENROLLMENT SYSTEM (FIXED)")
print("="*100)

conn = get_connection()
cur = conn.cursor()

cur.execute("SELECT org_id FROM organizations LIMIT 1")
org_id = cur.fetchone()[0]

# ============================================================================
# STEP 1: Program Curriculum
# ============================================================================
print("\n📚 STEP 1: Building Program Curriculum...")

try:
    cur.execute("SAVEPOINT step1")
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

        for i, course in enumerate(dept_courses[:min(20, len(dept_courses))]):
            year = (i // 6) + 1
            sem = 1 if (i % 6) < 3 else 3
            curriculum_entries.append((
                org_id, prog_id, course[0], 'MAJOR_CORE', True,
                course[3], min(year, duration), min(sem, duration*2-1), i+1
            ))

        for i, course in enumerate(dept_courses[20:28]):
            curriculum_entries.append((
                org_id, prog_id, course[0], 'MAJOR_ELECTIVE', False,
                course[3], 3, 5, 1000+i
            ))

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
    """, curriculum_entries, page_size=500)

    print(f"✓ Generated {len(curriculum_entries)} curriculum entries")
    cur.execute("RELEASE SAVEPOINT step1")
    conn.commit()
except Exception as e:
    print(f"✗ Step 1 failed: {e}")
    cur.execute("ROLLBACK TO SAVEPOINT step1")
    conn.commit()

# ============================================================================
# STEP 2: Prerequisites
# ============================================================================
print("\n🔗 STEP 2: Creating Prerequisites...")

try:
    cur.execute("SAVEPOINT step2")
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
    """, prerequisites, page_size=500)

    print(f"✓ Generated {len(prerequisites)} prerequisites")
    cur.execute("RELEASE SAVEPOINT step2")
    conn.commit()
except Exception as e:
    print(f"✗ Step 2 failed: {e}")
    cur.execute("ROLLBACK TO SAVEPOINT step2")
    conn.commit()

# ============================================================================
# STEP 3: Course Offerings
# ============================================================================
print("\n📅 STEP 3: Creating Course Offerings...")

try:
    cur.execute("SAVEPOINT step3")
    cur.execute("DELETE FROM course_offerings")

    academic_year = '2024-25'
    semester_type = 'ODD'
    semester_number = 1

    cur.execute("""
        SELECT DISTINCT c.course_id, c.dept_id, c.credits, c.max_enrollment
        FROM courses c
        JOIN program_curriculum pc ON c.course_id = pc.course_id
        WHERE c.is_active = TRUE
    """)
    courses_to_offer = cur.fetchall()

    offerings = []
    faculty_workload = defaultdict(int)
    faculty_course_map = {}

    for course_id, course_dept_id, credits, max_enroll in courses_to_offer:
        cur.execute("""
            SELECT faculty_id FROM faculty
            WHERE dept_id = %s AND is_active = TRUE
            ORDER BY RANDOM() LIMIT 1
        """, (course_dept_id,))

        faculty_result = cur.fetchone()
        if not faculty_result:
            continue

        faculty_id = faculty_result[0]

        if faculty_workload[faculty_id] + credits > 18:
            continue

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
    """, offerings, page_size=500)

    print(f"✓ Generated {len(offerings)} course offerings")
    cur.execute("RELEASE SAVEPOINT step3")
    conn.commit()
except Exception as e:
    print(f"✗ Step 3 failed: {e}")
    cur.execute("ROLLBACK TO SAVEPOINT step3")
    conn.commit()

# ============================================================================
# STEP 4: Student Enrollments (BATCHED with reconnection)
# ============================================================================
print("\n👨🎓 STEP 4: Generating Student Enrollments...")

try:
    cur.execute("SAVEPOINT step4")
    cur.execute("DELETE FROM course_enrollments")
    conn.commit()

    # Get students in batches
    cur.execute("SELECT COUNT(*) FROM students WHERE is_active = TRUE")
    total_students = cur.fetchone()[0]

    batch_size = 1000
    enrollments = []

    for offset in range(0, total_students, batch_size):
        print(f"\rProcessing batch {offset//batch_size + 1}/{(total_students//batch_size) + 1}...", end='')

        # Reconnect for each batch to avoid timeout
        if offset > 0:
            cur.close()
            return_connection(conn)
            conn = get_connection()
            cur = conn.cursor()

        cur.execute("""
            SELECT s.student_id, s.program_id, s.dept_id, s.current_year,
                   s.current_semester, s.admission_year
            FROM students s
            WHERE s.is_active = TRUE
            ORDER BY s.student_id
            LIMIT %s OFFSET %s
        """, (batch_size, offset))

        students_batch = cur.fetchall()

        for student_id, program_id, student_dept_id, current_year, current_sem, admission_year in students_batch:
            target_credits = 18
            enrolled_credits = 0

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
                LIMIT 10
            """, (program_id, academic_year, semester_type, current_year))

            available_courses = cur.fetchall()
            enrolled_categories = defaultdict(int)

            for course_id, category, is_mandatory, credits, offering_id, course_dept_id in available_courses:
                if enrolled_credits + credits > 22:
                    continue

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

                # Map category to valid enrollment_type
                enrollment_type_map = {
                    'MAJOR_CORE': 'CORE',
                    'MAJOR_ELECTIVE': 'ELECTIVE',
                    'OPEN_ELECTIVE': 'OPEN_ELECTIVE',
                    'MINOR': 'MINOR',
                    'AUDIT': 'AUDIT'
                }
                enrollment_type = enrollment_type_map.get(category, 'CORE')

                enrollments.append((
                    org_id, student_id, course_id, offering_id, enrollment_type,
                    current_sem, current_year, academic_year, is_cross
                ))

                enrolled_credits += credits
                enrolled_categories[category] += 1

        # Insert batch
        if enrollments:
            execute_batch(cur, """
                INSERT INTO course_enrollments (
                    org_id, student_id, course_id, offering_id, enrollment_type,
                    enrolled_semester, enrolled_year, academic_year, is_cross_program
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (student_id, offering_id) DO NOTHING
            """, enrollments, page_size=500)
            conn.commit()
            enrollments = []

    print(f"\n✓ Enrollment generation complete")

    # Update totals
    cur.execute("""
        UPDATE course_offerings co
        SET total_enrolled = (
            SELECT COUNT(*) FROM course_enrollments ce
            WHERE ce.offering_id = co.offering_id
        )
    """)
    cur.execute("RELEASE SAVEPOINT step4")
    conn.commit()

    print("\n" + "="*100)
    print("✅ NEP 2020 VALIDATED ENROLLMENT COMPLETE!")
    print("="*100)

except Exception as e:
    print(f"\n✗ Step 4 failed: {e}")
    print("Previous steps (1-3) are preserved in database.")
    cur.execute("ROLLBACK TO SAVEPOINT step4")
    conn.commit()

cur.close()
return_connection(conn)
connection_pool.closeall()
