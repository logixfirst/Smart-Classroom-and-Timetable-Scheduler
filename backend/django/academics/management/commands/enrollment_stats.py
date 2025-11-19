from academics.models import Student, StudentElectiveChoice, Subject
from django.core.management.base import BaseCommand
from django.db.models import Count


class Command(BaseCommand):
    help = "Show detailed enrollment statistics including unique subjects"

    def handle(self, *args, **options):
        # Total counts
        total_students = Student.objects.count()
        total_subjects = Subject.objects.count()
        total_enrollments = StudentElectiveChoice.objects.count()

        # Students with enrollments
        students_with_enrollments = (
            Student.objects.filter(elective_choices__isnull=False).distinct().count()
        )

        # Unique subjects that have enrollments
        unique_subjects_enrolled = (
            Subject.objects.filter(student_choices__isnull=False).distinct().count()
        )

        # Enrollments by semester
        semester_stats = (
            StudentElectiveChoice.objects.values("semester")
            .annotate(count=Count("choice_id"))
            .order_by("semester")
        )

        # Subject type breakdown
        subject_type_stats = (
            StudentElectiveChoice.objects.select_related("subject")
            .values("subject__subject_type")
            .annotate(count=Count("choice_id"))
            .order_by("subject__subject_type")
        )

        # Most enrolled subjects
        popular_subjects = (
            Subject.objects.annotate(enrollment_count=Count("student_choices"))
            .filter(enrollment_count__gt=0)
            .order_by("-enrollment_count")[:10]
        )

        # Display results
        self.stdout.write(self.style.SUCCESS("=== ENROLLMENT STATISTICS ==="))
        self.stdout.write(f"Total students: {total_students}")
        self.stdout.write(f"Total subjects available: {total_subjects}")
        self.stdout.write(f"Total enrollments: {total_enrollments}")
        self.stdout.write(f"Students with enrollments: {students_with_enrollments}")
        self.stdout.write(f"Unique subjects enrolled: {unique_subjects_enrolled}")

        if total_enrollments > 0:
            avg_per_student = (
                total_enrollments / students_with_enrollments
                if students_with_enrollments > 0
                else 0
            )
            self.stdout.write(f"Average subjects per student: {avg_per_student:.1f}")

        self.stdout.write("\n=== ENROLLMENTS BY SEMESTER ===")
        for stat in semester_stats:
            self.stdout.write(
                f'Semester {stat["semester"]}: {stat["count"]} enrollments'
            )

        self.stdout.write("\n=== ENROLLMENTS BY SUBJECT TYPE ===")
        for stat in subject_type_stats:
            subject_type = stat["subject__subject_type"] or "Unknown"
            self.stdout.write(f'{subject_type}: {stat["count"]} enrollments')

        self.stdout.write("\n=== TOP 10 MOST ENROLLED SUBJECTS ===")
        for i, subject in enumerate(popular_subjects, 1):
            self.stdout.write(
                f"{i}. {subject.subject_code} - {subject.subject_name}: {subject.enrollment_count} students"
            )

        # Coverage analysis
        coverage_percentage = (
            (unique_subjects_enrolled / total_subjects * 100)
            if total_subjects > 0
            else 0
        )
        self.stdout.write("\n=== COVERAGE ANALYSIS ===")
        self.stdout.write(
            f"Subject coverage: {coverage_percentage:.1f}% ({unique_subjects_enrolled}/{total_subjects})"
        )

        if coverage_percentage < 50:
            self.stdout.write(
                self.style.WARNING(
                    "⚠️  Low subject coverage - many subjects have no enrollments"
                )
            )
        elif coverage_percentage < 80:
            self.stdout.write(self.style.WARNING("⚠️  Moderate subject coverage"))
        else:
            self.stdout.write(self.style.SUCCESS("✅ Good subject coverage"))
