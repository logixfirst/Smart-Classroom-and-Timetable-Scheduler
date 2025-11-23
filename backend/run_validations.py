import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

print("\n" + "="*100)
print("NEP 2020 DATA VALIDATION")
print("="*100)

validations = {
    "Faculty-Course dept_id match": """
        SELECT COUNT(*) FROM course_offerings co
        JOIN courses c ON co.course_id = c.course_id
        JOIN faculty f ON co.primary_faculty_id = f.faculty_id
        WHERE c.dept_id != f.dept_id
    """,

    "Semester numbers (must be 1,3,5,7)": """
        SELECT COUNT(*) FROM course_offerings
        WHERE semester_number NOT IN (1,3,5,7)
    """,

    "Faculty workload (max 18 credits)": """
        SELECT COUNT(*) FROM (
            SELECT f.faculty_id, SUM(c.credits) as total
            FROM faculty f
            JOIN course_offerings co ON f.faculty_id = co.primary_faculty_id
            JOIN courses c ON co.course_id = c.course_id
            GROUP BY f.faculty_id
            HAVING SUM(c.credits) > 18
        ) overloaded
    """,

    "Students with MAJOR_CORE courses": """
        SELECT COUNT(DISTINCT s.student_id)
        FROM students s
        JOIN course_enrollments ce ON s.student_id = ce.student_id
        WHERE ce.enrollment_type = 'MAJOR_CORE'
    """,

    "Duplicate enrollments": """
        SELECT COUNT(*) FROM (
            SELECT student_id, course_id, academic_year, enrolled_semester
            FROM course_enrollments
            WHERE enrollment_status = 'ENROLLED'
            GROUP BY student_id, course_id, academic_year, enrolled_semester
            HAVING COUNT(*) > 1
        ) dups
    """,

    "Student credit overload (>22)": """
        SELECT COUNT(*) FROM (
            SELECT ce.student_id, SUM(c.credits) as total
            FROM course_enrollments ce
            JOIN courses c ON ce.course_id = c.course_id
            WHERE ce.enrollment_status = 'ENROLLED'
            GROUP BY ce.student_id, ce.academic_year, ce.enrolled_semester
            HAVING SUM(c.credits) > 22
        ) overloaded
    """,

    "Course capacity exceeded": """
        SELECT COUNT(*) FROM (
            SELECT co.offering_id, COUNT(*) as enrolled, co.max_capacity
            FROM course_offerings co
            JOIN course_enrollments ce ON co.offering_id = ce.offering_id
            WHERE ce.enrollment_status = 'ENROLLED'
            GROUP BY co.offering_id, co.max_capacity
            HAVING COUNT(*) > co.max_capacity
        ) exceeded
    """,

    "One-to-one faculty-course mapping": """
        SELECT COUNT(*) FROM (
            SELECT primary_faculty_id, COUNT(*) as course_count
            FROM course_offerings
            WHERE is_active = TRUE
            GROUP BY primary_faculty_id
            HAVING COUNT(*) > 1
        ) multi
    """,
}

print("\n🔍 Running Validations...\n")

results = {}
for name, query in validations.items():
    cur.execute(query)
    count = cur.fetchone()[0]
    results[name] = count
    status = "✅" if count == 0 else "❌"
    print(f"{status} {name}: {count}")

print("\n" + "="*100)
print("SUMMARY")
print("="*100)

passed = sum(1 for v in results.values() if v == 0)
total = len(results)

print(f"\n{'✅' if passed == total else '⚠️'} Passed: {passed}/{total}")

if passed == total:
    print("\n🎉 All validations passed! Data is NEP 2020 compliant.")
else:
    print("\n⚠️ Some validations failed. Review the output above.")

cur.close()
conn.close()
