"""
Generation Job Service -- all business logic for timetable generation jobs.

Architecture rule (Clean Architecture):
  API layer must never contain business logic.
  This service sits between the API layer (GenerationJobViewSet)
  and the infrastructure layer (DB, Redis, Celery, FastAPI).

Responsibilities:
  - Resolve the time configuration to use for a generation run
  - Create and persist a GenerationJob
  - Enqueue the job via Celery (or FastAPI fallback)
"""
import logging
import threading

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

_PRIORITY_MAP: dict[str, int] = {"high": 9, "normal": 5, "low": 1}

_DEFAULT_TIME_CONFIG: dict = {
    "working_days": 6,
    "slots_per_day": 9,
    "start_time": "08:00",
    "end_time": "17:00",
    "slot_duration_minutes": 60,
    "lunch_break_enabled": True,
    "lunch_break_start": "12:00",
    "lunch_break_end": "13:00",
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def resolve_time_config(org, academic_year: str, semester: str, form_config: dict | None) -> dict:
    """
    Determine the time configuration for a generation job.

    Priority order:
      1. form_config supplied by the user in the request body.
      2. Latest TimetableConfiguration record in the DB for this org/semester.
      3. Module-level _DEFAULT_TIME_CONFIG as a last resort.
    """
    if form_config:
        return _time_config_from_form(form_config)
    return _time_config_from_db(org, academic_year, semester)


def create_generation_job(org, academic_year: str, semester: str, priority: str, time_config: dict):
    """
    Create and persist a GenerationJob with the resolved configuration.
    Returns the newly created GenerationJob instance.
    """
    from academics.models import GenerationJob

    return GenerationJob.objects.create(
        organization=org,
        status="running",
        progress=0,
        academic_year=academic_year,
        semester=1 if semester == "odd" else 2,
        timetable_data={
            "academic_year": academic_year,
            "semester": semester,
            "org_id": str(getattr(org, "org_name", str(org))),
            "priority": _PRIORITY_MAP.get(priority, 5),
            "generation_type": "full",
            "scope": "university",
            "time_config": time_config,
        },
    )


def enqueue_job_background(job, university_id: str, priority: str = "normal") -> None:
    """
    Start a daemon thread that queues the job without blocking the HTTP response.
    Thread name includes job ID for easier debugging in thread dumps.
    """
    thread = threading.Thread(
        target=_queue_job,
        args=(job, university_id, priority),
        daemon=True,
        name=f"job-queue-{job.id}",
    )
    thread.start()


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _time_config_from_form(form_config: dict) -> dict:
    """Build a time-config dict from form data submitted by the user."""
    return {
        "working_days": form_config.get("working_days", _DEFAULT_TIME_CONFIG["working_days"]),
        "slots_per_day": form_config.get("slots_per_day", _DEFAULT_TIME_CONFIG["slots_per_day"]),
        "start_time": form_config.get("start_time", _DEFAULT_TIME_CONFIG["start_time"]),
        "end_time": form_config.get("end_time", _DEFAULT_TIME_CONFIG["end_time"]),
        "slot_duration_minutes": _DEFAULT_TIME_CONFIG["slot_duration_minutes"],
        "lunch_break_enabled": form_config.get("lunch_break_enabled", True),
        "lunch_break_start": form_config.get("lunch_break_start", _DEFAULT_TIME_CONFIG["lunch_break_start"]),
        "lunch_break_end": form_config.get("lunch_break_end", _DEFAULT_TIME_CONFIG["lunch_break_end"]),
    }


def _time_config_from_db(org, academic_year: str, semester: str) -> dict:
    """
    Look up the most-recently-used TimetableConfiguration for this org/semester.
    Stamps last_used_at on the found record so it surfaces on the next lookup.
    Falls back to _DEFAULT_TIME_CONFIG when nothing is found.
    """
    from academics.timetable_config_models import TimetableConfiguration

    semester_int = 1 if semester == "odd" else 2
    try:
        config = (
            TimetableConfiguration.objects
            .filter(organization=org, academic_year=academic_year, semester=semester_int)
            .order_by("-last_used_at")
            .first()
        ) or (
            TimetableConfiguration.objects
            .filter(organization=org)
            .order_by("-last_used_at")
            .first()
        )

        if config:
            config.save(update_fields=["last_used_at"])
            logger.info(
                "Using TimetableConfiguration from DB",
                extra={"org": str(getattr(org, "org_name", org)), "config_id": str(config.pk)},
            )
            return _serialize_db_config(config)

    except Exception as exc:
        logger.error(
            "Error fetching TimetableConfiguration -- using defaults",
            extra={"error": str(exc), "org": str(getattr(org, "org_name", org))},
        )

    logger.warning(
        "No TimetableConfiguration found -- using built-in defaults",
        extra={"org": str(getattr(org, "org_name", org))},
    )
    return dict(_DEFAULT_TIME_CONFIG)


def _serialize_db_config(config) -> dict:
    """Convert a TimetableConfiguration ORM object to a plain dict."""
    return {
        "working_days": config.working_days,
        "slots_per_day": config.slots_per_day,
        "start_time": config.start_time.strftime("%H:%M"),
        "end_time": config.end_time.strftime("%H:%M"),
        "slot_duration_minutes": config.slot_duration_minutes,
        "lunch_break_enabled": config.lunch_break_enabled,
        "lunch_break_start": (
            config.lunch_break_start.strftime("%H:%M") if config.lunch_break_enabled else None
        ),
        "lunch_break_end": (
            config.lunch_break_end.strftime("%H:%M") if config.lunch_break_enabled else None
        ),
    }


def _queue_job(job, university_id: str, priority: str) -> None:
    """
    Persist job metadata to Redis, then attempt Celery enqueue.
    Falls back to a direct FastAPI HTTP call if Celery is unavailable.
    """
    _persist_to_redis(job, university_id, priority)
    try:
        _enqueue_via_celery(job, university_id, priority)
    except Exception as celery_err:
        logger.warning(
            "Celery unavailable -- falling back to direct FastAPI call",
            extra={"error": str(celery_err), "job_id": str(job.id)},
        )
        _enqueue_via_fastapi(job, university_id)


def _persist_to_redis(job, university_id: str, priority: str) -> None:
    """Store job metadata in Redis so workers can discover it."""
    cache.set(
        f"generation_queue:{job.id}",
        {
            "job_id": str(job.id),
            "university_id": university_id,
            "semester": job.timetable_data.get("semester"),
            "academic_year": job.timetable_data.get("academic_year"),
            "generation_type": "full",
            "scope": "university",
            "priority": priority,
            "created_at": job.created_at.isoformat(),
        },
        timeout=7200,  # 2 hours
    )


def _enqueue_via_celery(job, university_id: str, priority: str) -> None:
    """Hand the job off to the Celery task queue with the requested priority."""
    from academics.celery_tasks import generate_timetable_task

    generate_timetable_task.apply_async(
        args=[
            str(job.id),
            university_id,
            job.timetable_data.get("academic_year"),
            job.timetable_data.get("semester"),
        ],
        priority=_PRIORITY_MAP.get(priority, 5),
    )
    logger.info(
        "Job queued via Celery",
        extra={"job_id": str(job.id), "priority": priority},
    )


def _enqueue_via_fastapi(job, university_id: str) -> None:
    """
    Direct HTTP call to FastAPI as a Celery fallback.
    Uses a 3-second timeout -- FastAPI acknowledges immediately and processes async.
    """
    fastapi_url = getattr(settings, "FASTAPI_URL", "http://localhost:8001")
    try:
        resp = requests.post(
            f"{fastapi_url}/api/generate_variants",
            json={
                "job_id": str(job.id),
                "organization_id": university_id,
                "semester": job.timetable_data.get("semester"),
                "academic_year": job.timetable_data.get("academic_year"),
                "quality_mode": "balanced",
            },
            timeout=3,
        )
        if resp.status_code == 200:
            logger.info(
                "FastAPI queued job",
                extra={"job_id": str(job.id), "message": resp.json().get("message")},
            )
        else:
            logger.warning(
                "FastAPI returned non-200 -- job will retry when worker polls Redis",
                extra={"job_id": str(job.id), "status_code": resp.status_code},
            )
    except requests.exceptions.ConnectionError:
        logger.warning(
            "FastAPI unreachable -- job persisted in Redis, worker will pick it up",
            extra={"job_id": str(job.id)},
        )
    except requests.exceptions.Timeout:
        logger.warning(
            "FastAPI timeout -- job may still be processing",
            extra={"job_id": str(job.id)},
        )
    except Exception as api_err:
        logger.warning(
            "FastAPI call failed -- job persisted in Redis",
            extra={"job_id": str(job.id), "error": str(api_err)},
        )
