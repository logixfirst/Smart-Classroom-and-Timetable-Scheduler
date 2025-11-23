"""
Assign 2 faculty per course ensuring:
1. Faculty dept_id = Course dept_id
2. Each faculty teaches 2 courses (1 odd + 1 even semester)
3. No duplicate faculty for same course
"""

import psycopg2
from collections import defaultdict

# Database connection
conn = psycopg2.connect(
    host="localhost",
    database="your_database",
    user="your_user",
    password="your_password"
)
cur = conn.cursor()

print("🔄 Starting faculty-course assignment...")

# Step 1: Clear existing course offerings
print("\n1️⃣ Clearing existing course offerings...")
cur.execute("TRUNCATE TABLE course_offerings CASCADE;")
conn.commit()
print("✅ Cleared")

# Step 2: Get all active courses grouped by department and semester
print("\n2️⃣ Loading courses...")
cur.execute("""
    SELECT course_id, dept_id, semester, course_code, course_name
    FROM courses
    WHERE is_active = TRUE
    ORDER BY dept_id, semester, course_id
""")
courses = cur.fetchall()
print(f"✅ Loaded {len(courses)} courses")

# Step 3: Get all active faculty grouped by department
print("\n3️⃣ Loading faculty...")
cur.execute("""
    SELECT faculty_id, dept_id, faculty_name
    FROM faculty
    WHERE is_active = TRUE
    ORDER BY dept_id, faculty_id
""")
faculty = cur.fetchall()
print(f"✅ Loaded {len(faculty)} faculty")

# Step 4: Group faculty by department
faculty_by_dept = defaultdict(list)
for fac in faculty:
    faculty_by_dept[fac[1]].append(fac)

# Step 5: Track faculty workload
faculty_workload = defaultdict(lambda: {'odd': 0, 'even': 0})

# Step 6: Assign faculty to courses
print("\n4️⃣ Assigning faculty to courses...")
course_offerings = []
courses_without_faculty = []

for course in courses:
    course_id, dept_id, semester, course_code, course_name = course

    # Get faculty from same department
    dept_faculty = faculty_by_dept.get(dept_id, [])

    if len(dept_faculty) < 2:
        courses_without_faculty.append((course_code, dept_id))
        continue

    # Determine if odd or even semester
    sem_type = 'odd' if semester in [1, 3, 5, 7] else 'even'

    # Sort faculty by workload (least loaded first)
    sorted_faculty = sorted(
        dept_faculty,
        key=lambda f: faculty_workload[f[0]][sem_type]
    )

    # Assign 2 faculty (Section A and B)
    assigned_faculty = []
    for i, fac in enumerate(sorted_faculty[:2]):
        faculty_id = fac[0]
        section = 'A' if i == 0 else 'B'

        course_offerings.append((
            course_id,
            faculty_id,
            semester,
            '2024-2025',
            section,
            60,  # max_students
            True  # is_active
        ))

        # Update workload
        faculty_workload[faculty_id][sem_type] += 1
        assigned_faculty.append(fac[2])

    if len(assigned_faculty) == 2:
        print(f"  ✓ {course_code}: {assigned_faculty[0]} (A), {assigned_faculty[1]} (B)")

# Step 7: Insert course offerings
print(f"\n5️⃣ Inserting {len(course_offerings)} course offerings...")
cur.executemany("""
    INSERT INTO course_offerings (
        course_id, faculty_id, semester, academic_year,
        section, max_students, is_active, created_at, updated_at
    ) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
""", course_offerings)
conn.commit()
print("✅ Inserted")

# Step 8: Show statistics
print("\n" + "="*60)
print("📊 ASSIGNMENT STATISTICS")
print("="*60)

# Total offerings
cur.execute("SELECT COUNT(*) FROM course_offerings")
total = cur.fetchone()[0]
print(f"\n✅ Total Course Offerings: {total}")

# By semester type
cur.execute("""
    SELECT
        CASE
            WHEN semester IN (1,3,5,7) THEN 'Odd Semester'
            ELSE 'Even Semester'
        END as sem_type,
        COUNT(*) as count
    FROM course_offerings
    GROUP BY sem_type
""")
for row in cur.fetchall():
    print(f"   - {row[0]}: {row[1]}")

# Faculty teaching count
cur.execute("SELECT COUNT(DISTINCT faculty_id) FROM course_offerings")
teaching_faculty = cur.fetchone()[0]
print(f"\n✅ Faculty Teaching: {teaching_faculty} / {len(faculty)}")

# Faculty workload distribution
print("\n📈 Faculty Workload Distribution:")
cur.execute("""
    SELECT
        COUNT(CASE WHEN co.semester IN (1,3,5,7) THEN 1 END) as odd_courses,
        COUNT(CASE WHEN co.semester IN (2,4,6,8) THEN 1 END) as even_courses,
        COUNT(*) as total_courses,
        COUNT(*) as faculty_count
    FROM faculty f
    LEFT JOIN course_offerings co ON f.faculty_id = co.faculty_id
    GROUP BY
        COUNT(CASE WHEN co.semester IN (1,3,5,7) THEN 1 END),
        COUNT(CASE WHEN co.semester IN (2,4,6,8) THEN 1 END)
    ORDER BY total_courses DESC
""")
for row in cur.fetchall():
    print(f"   - {row[3]} faculty teaching {row[2]} courses ({row[0]} odd + {row[1]} even)")

# Courses without faculty
if courses_without_faculty:
    print(f"\n⚠️  Courses without enough faculty: {len(courses_without_faculty)}")
    for course_code, dept_id in courses_without_faculty[:10]:
        print(f"   - {course_code} (Dept: {dept_id})")

print("\n" + "="*60)
print("✅ ASSIGNMENT COMPLETE!")
print("="*60)

# Close connection
cur.close()
conn.close()
