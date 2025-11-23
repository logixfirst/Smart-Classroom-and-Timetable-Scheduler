# Backend Setup Guide

## Quick Start

### 1. Setup NEP 2020 Tables
```bash
python setup_nep_tables.py
```

### 2. Generate Enrollment Data
```bash
python generate_nep_validated.py
```

### 3. Validate Data
```bash
python run_validations.py
```

## Files

- **setup_nep_tables.py** - Creates program_curriculum, course_prerequisites tables
- **generate_nep_validated.py** - Generates NEP 2020 compliant enrollments
- **run_validations.py** - Validates all data integrity rules
- **generate_students.py** - Generates student data
- **generate_faculty_data.py** - Generates faculty data
- **import_faculty_data.py** - Imports faculty from CSV
- **add_missing_faculty.py** - Adds faculty to departments without any

## Validation Rules

✅ Semester: Only 1,3,5,7 (ODD)
✅ Faculty-Course dept_id match
✅ One-to-one faculty-course mapping
✅ Faculty workload ≤18 credits
✅ Students enrolled in MAJOR_CORE first
✅ NEP 2020 credit system (15-22 credits)
✅ No duplicate enrollments
✅ Course capacity not exceeded
