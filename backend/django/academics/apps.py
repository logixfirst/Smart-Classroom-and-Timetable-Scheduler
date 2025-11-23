from django.apps import AppConfig


class AcademicsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "academics"

    def ready(self):
        """
        Initialize app: Import signals and register cache invalidation.
        This ensures automatic cache updates when models change.
        """
        import academics.signals  # noqa: F401

        # Register automatic cache invalidation for all models
        from core.cache_service import register_cache_invalidation

        from .models import (
            Attendance,
            Batch,
            Classroom,
            Department,
            Faculty,
            Program,
            Student,
            Subject,
            Timetable,
            TimetableSlot,
            User,
        )

        # Register each model for automatic cache invalidation
        for model in [
            User,
            Faculty,
            Student,
            Department,
            Program,
            Subject,
            Batch,
            Classroom,
            Timetable,
            TimetableSlot,
            Attendance,
        ]:
            register_cache_invalidation(model)
