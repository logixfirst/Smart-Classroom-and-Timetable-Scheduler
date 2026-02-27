from django.apps import AppConfig


class AcademicsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "academics"

    def ready(self):
        """
        App startup:
          1. Import signals (auto wired)
          2. Register signal-based cache invalidation for every model
          3. Schedule background cache warm-up for near-static data
             (Schools, Buildings, Rooms) — runs once in a daemon thread so it
             never blocks server startup.  If Redis is unavailable the thread
             silently exits; the app still works via DB fallback.
        """
        import academics.signals  # noqa: F401
        import academics.celery_tasks  # noqa: F401 - Register Celery tasks

        # -- 0. Patch Django 5.x JSONField.from_db_value -----------------------
        # psycopg2 auto-decodes PostgreSQL JSON/JSONB columns to Python objects
        # before Django's from_db_value sees them.  Django 5.1 catches
        # json.JSONDecodeError but NOT TypeError, so json.loads(some_list)
        # propagates and blows up any queryset that touches a JSONField column
        # (e.g. Room.features / Room.specialized_software).
        # This one-liner guard matches what Django itself should do.
        import json as _json
        from django.db.models.fields.json import JSONField as _JSONField

        def _safe_from_db_value(self, value, expression, connection):
            if value is None:
                return value
            # psycopg2 (and psycopg3) may return already-decoded Python
            # objects for JSON/JSONB columns — skip json.loads entirely.
            if not isinstance(value, str):
                return value
            try:
                return _json.loads(value, cls=self.decoder)
            except (ValueError, TypeError):
                return value

        _JSONField.from_db_value = _safe_from_db_value

        # -- 1. Signal-based cache invalidation --------------------------------
        from core.cache_service import register_cache_invalidation

        from .models import (
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

        for model in [
            User, Faculty, Student, Department, Program,
            Course, Batch, Room, Building, School,
            Timetable, TimetableSlot,
        ]:
            register_cache_invalidation(model)

        # -- 2. Background cache warming for near-static data ------------------
        import threading

        def _warm():
            """
            Pre-fill Redis with near-static datasets so the very first admin
            page loads never need a DB round-trip.
            """
            import time
            import logging
            _log = logging.getLogger(__name__)
            # Small delay: let Django finish setting up DB connections
            time.sleep(5)

            try:
                from core.cache_service import CacheService

                warm_tasks = [
                    (School,    "school",    CacheService.TTL_VERY_LONG),
                    (Building,  "building",  CacheService.TTL_VERY_LONG),
                    (Room,      "room",      CacheService.TTL_VERY_LONG),
                    (Department,"department",CacheService.TTL_LONG),
                    (Program,   "program",   CacheService.TTL_LONG),
                    (Course,    "course",    CacheService.TTL_LONG),
                ]

                for model_cls, name, ttl in warm_tasks:
                    # Warm page=1 / page_size=25 — matches the admin default.
                    # Keys without organization_id cover super-admin / anon reads;
                    # per-org keys populate automatically on first real request.
                    key = CacheService.generate_cache_key(
                        CacheService.PREFIX_LIST, name, page="1", page_size="25",
                    )
                    if CacheService.get(key) is not None:
                        continue  # already warm

                    def _make_fetcher(cls, model_name=name):
                        def fetcher():
                            """Produce DRF-compatible paginated payload."""
                            total = cls.objects.count()
                            rows  = list(cls.objects.values()[:25])
                            return {
                                "count":    total,
                                "next":     None,
                                "previous": None,
                                "results":  rows,
                            }
                        return fetcher

                    CacheService.warm_cache(name, _make_fetcher(model_cls), key, ttl=ttl)

                _log.info("Cache warm-up complete for near-static datasets.")
            except Exception as exc:
                _log.warning("Cache warm-up skipped: %s", exc)

        threading.Thread(target=_warm, daemon=True, name="cache-warmer").start()
