"""
Debug script to check approved timetable data structure
"""
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp.settings')
django.setup()

from academics.models import GenerationJob, Student, Batch

# Get the approved job
approved_job = GenerationJob.objects.filter(status='approved').order_by('-created_at').first()

if not approved_job:
    print("No approved job found")
    exit()

print(f"Approved Job ID: {approved_job.id}")
print(f"Organization: {approved_job.organization_id}")
print(f"Status: {approved_job.status}")

# Parse timetable data
try:
    timetable_data = json.loads(approved_job.timetable_data) if isinstance(approved_job.timetable_data, str) else approved_job.timetable_data
except:
    timetable_data = approved_job.timetable_data

print(f"\nVariants: {len(timetable_data.get('variants', []))}")

# Get first variant
variants = timetable_data.get('variants', [])
if variants:
    variant = variants[0]
    entries = variant.get('timetable_entries', [])
    print(f"Total entries in first variant: {len(entries)}")
    
    if entries:
        print("\nFirst 3 entries:")
        for i, entry in enumerate(entries[:3]):
            print(f"\nEntry {i+1}:")
            print(f"  batch_id: {entry.get('batch_id')}")
            print(f"  batch_name: {entry.get('batch_name')}")
            print(f"  batch_ids: {entry.get('batch_ids')}")
            print(f"  student_ids: {entry.get('student_ids')}")
            print(f"  subject: {entry.get('subject_name')}")
            print(f"  day: {entry.get('day')}")
            print(f"  time_slot: {entry.get('time_slot')}")

# Check student
print("\n" + "="*50)
student = Student.objects.filter(username='21cs001').first()
if student:
    print(f"Student: {student.first_name} {student.last_name}")
    print(f"Student ID: {student.student_id}")
    print(f"Batch ID: {student.batch_id}")
    
    if student.batch_id:
        try:
            batch = Batch.objects.get(batch_id=student.batch_id)
            print(f"Batch Name: {batch.batch_name}")
            print(f"Batch Code: {batch.batch_code}")
            
            # Check if any entries match this batch
            matching_entries = []
            batch_id_str = str(batch.batch_id)
            student_id_str = str(student.student_id)
            
            for entry in entries:
                if (entry.get('batch_id') == batch_id_str or
                    (entry.get('batch_ids') and batch_id_str in entry.get('batch_ids', [])) or
                    (entry.get('student_ids') and student_id_str in entry.get('student_ids', []))):
                    matching_entries.append(entry)
            
            print(f"\nMatching entries for this student: {len(matching_entries)}")
            if matching_entries:
                print("\nFirst matching entry:")
                entry = matching_entries[0]
                print(f"  batch_id: {entry.get('batch_id')}")
                print(f"  subject: {entry.get('subject_name')}")
                print(f"  day: {entry.get('day')}")
                print(f"  time_slot: {entry.get('time_slot')}")
        except Batch.DoesNotExist:
            print("Batch not found!")
else:
    print("Student not found!")
