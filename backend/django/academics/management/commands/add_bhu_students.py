"""
Add Students and Batch Enrollments to BHU Database
Maps students to real subjects offered by BHU departments
"""

import random
from datetime import date, datetime

from academics.models import (
    Batch,
    BatchSubjectEnrollment,
    Department,
    Faculty,
    Organization,
    Program,
    School,
    Student,
    Subject,
    User,
)
from django.core.management.base import BaseCommand
from django.db.models.signals import post_delete, post_save


class Command(BaseCommand):
    help = "Add students and batch enrollments to BHU database"

    def handle(self, *args, **kwargs):
        # Disconnect signals
        post_save.disconnect(signals.sync_student_to_user, sender=Student)
        post_save.disconnect(signals.sync_user_to_faculty_student, sender=User)

        try:
            self.stdout.write("🚀 Starting Student & Batch Enrollment...")

            org = Organization.objects.get(org_code="BHU")
            current_year = datetime.now().year

            # Get programs that should have students
            programs_to_populate = Program.objects.filter(
                organization=org, is_active=True
            ).select_related("school", "department")

            total_students_created = 0
            total_batches_created = 0
            total_enrollments_created = 0

            for program in programs_to_populate:
                try:
                    with transaction.atomic():
                        self.stdout.write(
                            f"\n📚 Processing {program.program_code} - {program.program_name}"
                        )

                        # Determine batch years based on program duration
                        duration = int(program.duration_years)

                        if program.program_type == "ug":
                            # Undergraduate: 2-3 batches
                            batch_years = [current_year - 1, current_year - 2]
                            if duration >= 4:
                                batch_years.append(current_year - 3)
                            students_per_batch = 30  # 30 students per UG batch

                        elif program.program_type == "pg":
                            # Postgraduate: 1-2 batches
                            batch_years = [current_year - 1]
                            if duration > 1:
                                batch_years.append(current_year - 2)
                            students_per_batch = 20  # 20 students per PG batch

                        elif program.program_type == "integrated":
                            # MBBS/Integrated: 3-4 batches
                            batch_years = [
                                current_year - 1,
                                current_year - 2,
                                current_year - 3,
                            ]
                            students_per_batch = 50  # 50 students for medical

                        else:
                            batch_years = [current_year - 1]
                            students_per_batch = 25

                        # Get subjects for this program's department
                        dept_subjects = Subject.objects.filter(
                            organization=org,
                            department=program.department,
                            is_active=True,
                        ).order_by("semester", "subject_code")[
                            :12
                        ]  # Max 12 subjects per batch

                        if not dept_subjects.exists():
                            self.stdout.write(
                                f"  ⚠ No subjects found for {program.department.dept_code}"
                            )
                            continue

                        # Create batches and students
                        for batch_year in batch_years:
                            # Create batch
                            batch, batch_created = Batch.objects.get_or_create(
                                organization=org,
                                program=program,
                                year_of_admission=batch_year,
                                section="A",
                                defaults={
                                    "department": program.department,
                                    "batch_name": f"{program.program_code} {batch_year} Batch",
                                    "batch_code": f"{str(batch_year)[-2:]}{program.program_code[:6].upper()}A",
                                    "current_semester": min(
                                        ((current_year - batch_year) * 2) + 1,
                                        program.total_semesters,
                                    ),
                                    "total_students": students_per_batch,
                                    "is_active": True,
                                },
                            )

                            if batch_created:
                                total_batches_created += 1
                                self.stdout.write(
                                    f"  ✓ Created batch: {batch.batch_name}"
                                )

                            # Create batch-subject enrollments
                            academic_year = f"{current_year}-{current_year + 1}"

                            for subject in dept_subjects:
                                pass  # (Removed) BatchSubjectEnrollment creation

                            # Create students for this batch
                            for i in range(1, students_per_batch + 1):
                                # Generate student details
                                # Use full program code to ensure uniqueness
                                roll_number = f"{batch_year % 100}{program.program_code.replace('-', '').upper()[:6]}{i:03d}"
                                student_name = self.generate_indian_name()
                                email = f"{roll_number.lower()}@bhu.ac.in"

                                # Check if student already exists
                                if Student.objects.filter(
                                    roll_number=roll_number
                                ).exists():
                                    continue

                                # Create user account
                                user, user_created = User.objects.get_or_create(
                                    username=roll_number,
                                    organization=org,
                                    defaults={
                                        "email": email,
                                        "first_name": student_name.split()[0],
                                        "last_name": student_name.split()[-1]
                                        if len(student_name.split()) > 1
                                        else "",
                                        "role": "student",
                                        "is_active": True,
                                    },
                                )

                                if user_created:
                                    user.set_password("student123")
                                    user.save()

                                # Create student
                                (
                                    student,
                                    student_created,
                                ) = Student.objects.get_or_create(
                                    organization=org,
                                    roll_number=roll_number,
                                    defaults={
                                        "user": user,
                                        "program": program,
                                        "batch": batch,
                                        "department": program.department,
                                        "student_name": student_name,
                                        "email": email,
                                        "phone": f"+91{random.randint(7000000000, 9999999999)}",
                                        "date_of_admission": date(batch_year, 8, 1),
                                        "expected_graduation_year": batch_year
                                        + int(program.duration_years),
                                        "current_semester": batch.current_semester,
                                        "current_year": (
                                            (batch.current_semester - 1) // 2
                                        )
                                        + 1,
                                        "cgpa": round(random.uniform(6.5, 9.5), 2)
                                        if batch_year < current_year
                                        else None,
                                        "is_active": True,
                                        "status": "enrolled",
                                    },
                                )

                                if student_created:
                                    total_students_created += 1

                        self.stdout.write(
                            f"  ✓ {program.program_code}: "
                            f"{len(batch_years)} batches, "
                            f"{len(batch_years) * students_per_batch} students, "
                            f"{len(batch_years) * dept_subjects.count()} enrollments"
                        )

                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f"  ✗ Failed {program.program_code}: {e}")
                    )

            # Print summary
            self.stdout.write("\n" + "=" * 90)
            self.stdout.write(
                self.style.SUCCESS(
                    "✅ Student Enrollment Complete!\n"
                    f"   Batches Created: {total_batches_created}\n"
                    f"   Students Created: {total_students_created}\n"
                    f"   Batch-Subject Enrollments: {total_enrollments_created}\n"
                )
            )

            # Print statistics
            self.print_enrollment_stats(org)

        finally:
            # Reconnect signals
            post_save.connect(signals.sync_student_to_user, sender=Student)
            post_save.connect(signals.sync_user_to_faculty_student, sender=User)

    def generate_indian_name(self):
        """Generate realistic Indian student names"""
        first_names = [
            "Aarav",
            "Vivaan",
            "Aditya",
            "Arjun",
            "Sai",
            "Arnav",
            "Ayaan",
            "Krishna",
            "Ishaan",
            "Reyansh",
            "Aadhya",
            "Saanvi",
            "Ananya",
            "Diya",
            "Aarohi",
            "Pari",
            "Navya",
            "Angel",
            "Pihu",
            "Myra",
            "Rahul",
            "Rohan",
            "Karan",
            "Varun",
            "Nikhil",
            "Amit",
            "Suresh",
            "Vikram",
            "Ajay",
            "Ravi",
            "Priya",
            "Sneha",
            "Pooja",
            "Neha",
            "Divya",
            "Anjali",
            "Kavya",
            "Shreya",
            "Riya",
            "Simran",
        ]

        last_names = [
            "Kumar",
            "Singh",
            "Sharma",
            "Verma",
            "Gupta",
            "Agarwal",
            "Patel",
            "Reddy",
            "Rao",
            "Nair",
            "Mishra",
            "Pandey",
            "Yadav",
            "Joshi",
            "Mehta",
            "Saxena",
            "Malhotra",
            "Khanna",
            "Bose",
            "Das",
            "Iyer",
            "Menon",
            "Pillai",
            "Shetty",
            "Hegde",
            "Desai",
            "Shah",
            "Trivedi",
            "Dubey",
            "Tiwari",
        ]

        return f"{random.choice(first_names)} {random.choice(last_names)}"

    def print_enrollment_stats(self, org):
        """Print detailed enrollment statistics"""
        self.stdout.write("\n" + "=" * 90)
        self.stdout.write("📊 ENROLLMENT STATISTICS BY SCHOOL")
        self.stdout.write("=" * 90)

        schools = School.objects.filter(organization=org)

        for school in schools:
            batches = Batch.objects.filter(
                organization=org, program__school=school
            ).count()

            students = Student.objects.filter(
                organization=org, batch__program__school=school
            ).count()

            enrollments = BatchSubjectEnrollment.objects.filter(
                organization=org, batch__program__school=school
            ).count()

            if batches > 0:
                self.stdout.write(
                    f"{school.school_code:15} | "
                    f"Batches: {batches:3} | "
                    f"Students: {students:4} | "
                    f"Enrollments: {enrollments:4}"
                )

        # Overall totals
        total_batches = Batch.objects.filter(organization=org).count()
        total_students = Student.objects.filter(organization=org).count()
        total_enrollments = BatchSubjectEnrollment.objects.filter(
            organization=org
        ).count()

        self.stdout.write("=" * 90)
        self.stdout.write(
            f"{'TOTAL':15} | "
            f"Batches: {total_batches:3} | "
            f"Students: {total_students:4} | "
            f"Enrollments: {total_enrollments:4}"
        )
        self.stdout.write("=" * 90)
