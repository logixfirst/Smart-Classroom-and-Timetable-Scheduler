import csv
import os
from collections import defaultdict

# Analyze CSV files for consistency
print("🔍 Analyzing CSV Files for Consistency...")
print("=" * 60)

# 1. Check Departments
print("\n📊 DEPARTMENTS:")
with open('departments.csv', 'r') as f:
    reader = csv.DictReader(f)
    departments = list(reader)
    dept_ids = {d['department_id']: d['department_name'] for d in departments}
    print(f"Total Departments: {len(departments)}")
    for d in departments:
        print(f"  - {d['department_id']}: {d['department_name']}")

# 2. Check Courses
print("\n📚 COURSES:")
with open('courses.csv', 'r') as f:
    reader = csv.DictReader(f)
    courses = list(reader)
    course_ids = {c['course_id']: c['course_name'] for c in courses}
    print(f"Total Courses: {len(courses)}")
    for c in courses:
        print(f"  - {c['course_id']}: {c['course_name']} ({c['level']}, {c['duration_years']} years)")

# 3. Check Subjects
print("\n📖 SUBJECTS:")
with open('subjects.csv', 'r') as f:
    reader = csv.DictReader(f)
    subjects = list(reader)
    subject_ids = {s['subject_id']: s['subject_name'] for s in subjects}
    print(f"Total Subjects: {len(subjects)}")
    for s in subjects:
        print(f"  - {s['subject_id']}: {s['subject_name']} (Course: {s['course_id']}, Dept: {s['department_id']})")

# 4. Analyze Faculty
print("\n👨‍🏫 FACULTY ANALYSIS:")
with open('faculty_100.csv', 'r') as f:
    reader = csv.DictReader(f)
    faculty = list(reader)
    print(f"Total Faculty: {len(faculty)}")
    
    # Check departments in faculty
    faculty_depts = defaultdict(int)
    faculty_courses = defaultdict(int)
    faculty_ids = set()
    
    for fac in faculty:
        fac_id = fac.get('faculty_id', '').strip()
        if not fac_id:
            continue
        faculty_ids.add(fac_id)
        dept = fac.get('department', '').strip()
        course = fac.get('course', '').strip()
        if dept:
            faculty_depts[dept] += 1
        if course:
            faculty_courses[course] += 1
    
    print(f"\nFaculty by Department:")
    for dept, count in sorted(faculty_depts.items()):
        match = "✅" if dept in dept_ids.values() else "❌"
        print(f"  {match} {dept}: {count} faculty")
    
    print(f"\nFaculty by Course:")
    for course, count in sorted(faculty_courses.items()):
        match = "✅" if course in course_ids.values() else "❌"
        print(f"  {match} {course}: {count} faculty")
    
    print(f"\nFaculty ID Range: {min(faculty_ids) if faculty_ids else 'N/A'} to {max(faculty_ids) if faculty_ids else 'N/A'}")

# 5. Analyze Students (sample first 100)
print("\n🎓 STUDENTS ANALYSIS:")
with open('students.csv', 'r') as f:
    reader = csv.DictReader(f)
    students_sample = []
    student_count = 0
    student_depts = defaultdict(int)
    student_courses = defaultdict(int)
    student_faculty_refs = defaultdict(int)
    
    for i, stu in enumerate(reader):
        student_count += 1
        if i < 100:  # Sample
            students_sample.append(stu)
        
        dept = stu.get('department', '').strip()
        course = stu.get('course', '').strip()
        fac_id = stu.get('faculty_id', '').strip()
        
        if dept:
            student_depts[dept] += 1
        if course:
            student_courses[course] += 1
        if fac_id:
            student_faculty_refs[fac_id] += 1
    
    print(f"Total Students: {student_count}")
    
    print(f"\nStudents by Department:")
    for dept, count in sorted(student_depts.items(), key=lambda x: x[1], reverse=True)[:10]:
        match = "✅" if dept in dept_ids.values() else "❌"
        print(f"  {match} {dept}: {count} students")
    
    print(f"\nStudents by Course:")
    for course, count in sorted(student_courses.items(), key=lambda x: x[1], reverse=True):
        match = "✅" if course in course_ids.values() else "❌"
        print(f"  {match} {course}: {count} students")
    
    print(f"\nTop 10 Faculty Advisors:")
    for fac_id, count in sorted(student_faculty_refs.items(), key=lambda x: x[1], reverse=True)[:10]:
        match = "✅" if fac_id in faculty_ids else "❌"
        print(f"  {match} {fac_id}: {count} students")

# 6. Check for Inconsistencies
print("\n⚠️  INCONSISTENCIES FOUND:")
inconsistencies = []

# Check if student departments match department CSV
for dept in student_depts.keys():
    if dept not in dept_ids.values():
        inconsistencies.append(f"Student department '{dept}' not in departments.csv")

# Check if student courses match course CSV
for course in student_courses.keys():
    if course not in course_ids.values():
        inconsistencies.append(f"Student course '{course}' not in courses.csv")

# Check if faculty references in students exist in faculty CSV
invalid_faculty_refs = {fid for fid in student_faculty_refs.keys() if fid and fid not in faculty_ids}
if invalid_faculty_refs:
    inconsistencies.append(f"{len(invalid_faculty_refs)} faculty references in students.csv not found in faculty_100.csv")
    print(f"  Missing Faculty IDs (sample): {list(invalid_faculty_refs)[:10]}")

if inconsistencies:
    for issue in inconsistencies:
        print(f"  ❌ {issue}")
else:
    print("  ✅ No major inconsistencies found!")

print("\n" + "=" * 60)
print("✅ Analysis Complete!")
