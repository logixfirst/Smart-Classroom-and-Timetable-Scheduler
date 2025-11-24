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
        import academics.celery_tasks  # noqa: F401 - Register Celery tasks

        # Register automatic cache invalidation for all models
        from core.cache_service import register_cache_invalidation

        from .models import (
            Attendance,
            Batch,
            Building,
            Course,
            Department,
            Faculty,
            Program,
            Room,
            School,
            Student,
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
            Course,
            Batch,
            Room,
            Building,
            School,
            Timetable,
            TimetableSlot,
            Attendance,
        ]:
            register_cache_invalidation(model)
