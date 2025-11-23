# NEP 2020 Enrollment Data Generation Guide

## Overview
This guide explains how to generate NEP 2020 compliant enrollment data for the timetable optimization system.

## Prerequisites
Ensure you have already generated:
- ✅ Organizations (BHU)
- ✅ Schools/Faculties
- ✅ Departments
- ✅ Degrees
- ✅ Programs
- ✅ Faculty
- ✅ Students
- ✅ Courses
- ✅ Buildings
- ✅ Rooms

## Step-by-Step Execution

### Step 1: Setup NEP 2020 Tables
```bash
cd backend
python setup_nep_tables.py
```

This creates:
- `program_curriculum` - Maps courses to programs with categories
- `course_prerequisites` - Defines prerequisite relationships
- Enhances `student_course_enrollments` with `is_cross_program` flag

### Step 2: Generate Complete NEP 2020 Data
```bash
python generate_nep_complete.py
```

This generates:
1. **Program Curriculum** (~15,000-20,000 entries)
   - MAJOR_CORE courses (own department + Math/Physics/English)
   - MAJOR_ELECTIVE courses
   - OPEN_ELECTIVE courses (cross-department)
   - MINOR_CORE courses
   - Recommended year/semester (guidance only)

2. **Course Prerequisites** (~800-1,000 relationships)
   - Sequential chains (101 → 201 → 301 → 401)
   - Cross-department prerequisites
   - MANDATORY type

3. **Room-Department Allocations** (~700-800 rooms)
   - 70% rooms assigned to specific departments
   - 30% remain shared/central

4. **Course Offerings** (~1,750-1,960 offerings)
   - Current semester (2024-25 ODD)
   - Faculty assigned from SAME department
   - Multiple sections for popular courses
   - 65-70% of total courses offered

5. **Student Enrollments** (~120,000-140,000 enrollments)
   - 5-7 courses per student
   - 15-22 credits per student
   - Cross-program enrollments (25-30% of students)
   - NEP 2020 flexible credit system

## Key Features

### Cross-Department Enrollment
Students can enroll in courses from other departments:
- **Engineering students** → Math, Physics, English (MAJOR_CORE)
- **All students** → Psychology, Management, Economics (OPEN_ELECTIVE)
- **Minor students** → Courses from minor department (MINOR_CORE)

### Popular Open Electives
High-demand courses with multiple sections:
- PSY201 (Psychology) - 300-400 students from 10+ departments
- MGT101 (Management) - 250-350 students
- ECO101 (Economics) - 200-300 students
- ENG201 (Technical Writing) - 200-250 students

### Realistic Constraints
- Faculty workload: Max 18 credits per semester
- Student credit load: 15-22 credits (avg 18)
- Room-department priority: 70% reserved for home department
- Prerequisites: Must complete before enrolling

## Database Schema

### program_curriculum
```sql
- curriculum_id (PK)
- program_id (FK)
- course_id (FK)
- course_category (MAJOR_CORE, MAJOR_ELECTIVE, OPEN_ELECTIVE, MINOR_CORE, etc.)
- is_mandatory (BOOLEAN)
- recommended_year (1-6)
- recommended_semester (1-12)
```

### course_prerequisites
```sql
- prerequisite_id (PK)
- course_id (FK)
- prerequisite_course_id (FK)
- prerequisite_type (MANDATORY, ALTERNATIVE, COREQUISITE)
```

### student_course_enrollments (Enhanced)
```sql
- enrollment_id (PK)
- student_id (FK)
- course_id (FK)
- offering_id (FK)
- enrollment_type (CORE, DEPARTMENTAL_ELECTIVE, MINOR, OPEN_ELECTIVE)
- is_cross_program (BOOLEAN) ← NEW!
- enrolled_semester
- enrolled_year
```

## Verification Queries

### Check Cross-Program Enrollments
```sql
SELECT COUNT(DISTINCT student_id)
FROM student_course_enrollments
WHERE is_cross_program = TRUE;
```

### Top Cross-Department Courses
```sql
SELECT c.course_code, c.course_name, COUNT(DISTINCT sce.student_id) as enrollment
FROM student_course_enrollments sce
JOIN courses c ON sce.course_id = c.course_id
WHERE sce.is_cross_program = TRUE
GROUP BY c.course_code, c.course_name
ORDER BY enrollment DESC
LIMIT 10;
```

### Student Enrollment Distribution
```sql
SELECT s.current_year, COUNT(DISTINCT sce.student_id) as students,
       AVG(course_count) as avg_courses
FROM students s
JOIN (
    SELECT student_id, COUNT(*) as course_count
    FROM student_course_enrollments
    GROUP BY student_id
) counts ON s.student_id = counts.student_id
GROUP BY s.current_year
ORDER BY s.current_year;
```

### Faculty Workload
```sql
SELECT f.first_name, f.last_name, d.dept_code,
       COUNT(co.offering_id) as courses,
       SUM(c.credits) as total_credits
FROM faculty f
JOIN course_offerings co ON f.faculty_id = co.primary_faculty_id
JOIN courses c ON co.course_id = c.course_id
JOIN departments d ON f.dept_id = d.dept_id
GROUP BY f.faculty_id, f.first_name, f.last_name, d.dept_code
ORDER BY total_credits DESC
LIMIT 20;
```

## Expected Output

```
📚 Program Curriculum Entries: 18,500
🔗 Course Prerequisites: 950
🏢 Rooms Allocated to Departments: 750
📅 Course Offerings: 1,850
👨🎓 Total Enrollments: 135,000
🔄 Students with Cross-Program Courses: 6,500

🔥 Top 10 Cross-Department Courses:
   PSY201: 385 students
   MGT101: 312 students
   ECO101: 278 students
   ENG201: 245 students
   PHI201: 198 students
   SOC101: 176 students
   HIS101: 154 students
   MAT101: 892 students (Engineering requirement)
   PHY101: 756 students (Engineering requirement)
   ENG101: 645 students (Communication requirement)
```

## Troubleshooting

### Issue: No faculty found for course
**Solution**: Ensure faculty are distributed across all departments
```bash
python add_missing_faculty.py
```

### Issue: Students not enrolling in courses
**Solution**: Check program_curriculum has courses for all programs
```sql
SELECT p.program_code, COUNT(pc.curriculum_id)
FROM programs p
LEFT JOIN program_curriculum pc ON p.program_id = pc.program_id
GROUP BY p.program_code
HAVING COUNT(pc.curriculum_id) = 0;
```

### Issue: No cross-program enrollments
**Solution**: Verify OPEN_ELECTIVE courses exist in curriculum
```sql
SELECT COUNT(*) FROM program_curriculum
WHERE course_category = 'OPEN_ELECTIVE';
```

## Next Steps

After generating enrollment data:
1. Run timetable optimization: `POST /api/v1/optimize`
2. Check for conflicts in generated timetables
3. Verify room allocations respect department priorities
4. Test cross-department constraint satisfaction

## NEP 2020 Compliance Checklist

- ✅ Flexible credit system (15-22 credits per semester)
- ✅ Cross-program enrollment allowed
- ✅ Minor program support (25% of students)
- ✅ Open electives from any department
- ✅ Skill enhancement courses
- ✅ Ability enhancement courses
- ✅ Project-based learning
- ✅ No rigid semester-wise progression
- ✅ Prerequisite-based course selection
- ✅ Multiple exit options (degree structure)

## Contact

For issues or questions, refer to the main README.md or create an issue on GitHub.
