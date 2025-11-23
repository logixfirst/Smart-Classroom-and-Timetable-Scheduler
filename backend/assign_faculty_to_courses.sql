-- Script to assign 2 faculty per course (1 for odd semester, 1 for even semester)
-- Rules:
-- 1. Faculty dept_id = Course dept_id
-- 2. Each faculty teaches 2 courses (1 odd + 1 even semester)
-- 3. No duplicate faculty for same course

-- Step 1: Clear existing course offerings
TRUNCATE TABLE course_offerings;

-- Step 2: Create temporary table with faculty-course mapping
WITH faculty_courses AS (
    SELECT
        f.faculty_id,
        f.dept_id as faculty_dept,
        c.course_id,
        c.dept_id as course_dept,
        c.semester,
        ROW_NUMBER() OVER (
            PARTITION BY c.course_id, c.semester
            ORDER BY f.faculty_id
        ) as faculty_rank
    FROM faculty f
    CROSS JOIN courses c
    WHERE f.dept_id = c.dept_id  -- Match department
    AND f.is_active = TRUE
    AND c.is_active = TRUE
),
-- Step 3: Assign first faculty to each course
first_faculty AS (
    SELECT
        course_id,
        semester,
        faculty_id,
        faculty_rank
    FROM faculty_courses
    WHERE faculty_rank = 1
),
-- Step 4: Assign second faculty to each course (different from first)
second_faculty AS (
    SELECT
        course_id,
        semester,
        faculty_id,
        faculty_rank
    FROM faculty_courses
    WHERE faculty_rank = 2
)
-- Step 5: Insert course offerings with 2 faculty per course
INSERT INTO course_offerings (
    course_id,
    faculty_id,
    semester,
    academic_year,
    section,
    max_students,
    is_active,
    created_at,
    updated_at
)
-- First faculty for each course
SELECT
    f.course_id,
    f.faculty_id,
    f.semester,
    '2024-2025',
    'A',
    60,
    TRUE,
    NOW(),
    NOW()
FROM first_faculty f

UNION ALL

-- Second faculty for each course (different section)
SELECT
    s.course_id,
    s.faculty_id,
    s.semester,
    '2024-2025',
    'B',
    60,
    TRUE,
    NOW(),
    NOW()
FROM second_faculty s;

-- Step 6: Verify results
SELECT
    'Total Course Offerings' as metric,
    COUNT(*) as count
FROM course_offerings

UNION ALL

SELECT
    'Odd Semester Offerings',
    COUNT(*)
FROM course_offerings
WHERE semester IN (1, 3, 5, 7)

UNION ALL

SELECT
    'Even Semester Offerings',
    COUNT(*)
FROM course_offerings
WHERE semester IN (2, 4, 6, 8)

UNION ALL

SELECT
    'Faculty Teaching Count',
    COUNT(DISTINCT faculty_id)
FROM course_offerings

UNION ALL

SELECT
    'Courses with 2 Sections',
    COUNT(*)
FROM (
    SELECT course_id, semester, COUNT(*) as section_count
    FROM course_offerings
    GROUP BY course_id, semester
    HAVING COUNT(*) = 2
) sub;

-- Step 7: Show faculty workload distribution
SELECT
    f.faculty_id,
    f.faculty_name,
    f.dept_id,
    COUNT(CASE WHEN co.semester IN (1,3,5,7) THEN 1 END) as odd_sem_courses,
    COUNT(CASE WHEN co.semester IN (2,4,6,8) THEN 1 END) as even_sem_courses,
    COUNT(*) as total_courses
FROM faculty f
LEFT JOIN course_offerings co ON f.faculty_id = co.faculty_id
GROUP BY f.faculty_id, f.faculty_name, f.dept_id
ORDER BY total_courses DESC
LIMIT 20;
