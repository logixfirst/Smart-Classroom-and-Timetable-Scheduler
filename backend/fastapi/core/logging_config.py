"""
Logging Configuration
Industry-standard structured logging setup
"""
import logging
import os
import sys
from pathlib import Path


class ExtraFieldsFormatter(logging.Formatter):
    """Append caller-supplied ``extra={}`` dict fields to the formatted message.

    The default Formatter writes only %(message)s; any key=value pairs passed
    via ``extra=`` are attached to the LogRecord but never rendered.  This
    subclass appends them as  key=value  pairs so every call-site that passes
    structured data (counts, IDs, elapsed times) shows that data in both the
    console and the log file without changing a single call site.
    """

    # Standard LogRecord attributes — NOT from caller-supplied extra= dicts.
    _STANDARD = frozenset({
        'name', 'msg', 'args', 'levelname', 'levelno', 'pathname',
        'filename', 'module', 'exc_info', 'exc_text', 'stack_info',
        'lineno', 'funcName', 'created', 'msecs', 'relativeCreated',
        'thread', 'threadName', 'processName', 'process', 'message',
        'asctime', 'taskName',
    })

    def format(self, record: logging.LogRecord) -> str:
        base = super().format(record)
        extras = {
            k: v for k, v in record.__dict__.items()
            if k not in self._STANDARD and not k.startswith('_')
        }
        if extras:
            base = base + '  ||  ' + '  '.join(f'{k}={v}' for k, v in extras.items())
        return base


def setup_logging():
    """
    Configure application logging.
    
    Sets up both console and file logging with appropriate formats
    and log levels. Follows industry standards for structured logging.
    """
    # Create logs directory if needed
    log_dir = Path(__file__).parent.parent / "logs"
    log_dir.mkdir(exist_ok=True)

    # Fixed filename — overwritten (mode='w') on every restart so the file
    # always contains only the current session, making debugging easy.
    log_file = log_dir / "fastapi.log"
    
    # Configure logging format - includes file and line number for debugging
    log_format = '%(asctime)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(name)s - %(message)s'
    
    # Get log level from environment (default to INFO)
    log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
    
    # Create console handler with UTF-8 encoding support.
    # On Windows the default stdout codec is cp1252, which cannot encode
    # emoji or other non-BMP characters.  Force UTF-8 so log messages that
    # contain emojis (e.g. the startup banner) don't raise UnicodeEncodeError.
    #
    # IMPORTANT: Do NOT wrap sys.stdout.buffer in a second io.TextIOWrapper.
    # In spawned worker processes (Windows multiprocessing uses 'spawn'),
    # sys.stdout may be a closed pipe.  Wrapping its buffer creates a second
    # TextIOWrapper over the same fd; when the pipe closes the wrapper's
    # stream.write() raises ValueError: I/O operation on closed file.
    #
    # Instead, reconfigure the existing sys.stdout encoding in-place and use
    # it directly.  Guard against None/closed stdout in worker subprocesses.
    stdout_ok = (
        sys.stdout is not None
        and hasattr(sys.stdout, 'write')
        and not getattr(sys.stdout, 'closed', False)
    )
    if stdout_ok:
        # Reconfigure encoding in-place (Python 3.7+); fall back silently.
        if hasattr(sys.stdout, 'reconfigure'):
            try:
                sys.stdout.reconfigure(encoding='utf-8', errors='replace')
            except Exception:
                pass
        console_handler = logging.StreamHandler(sys.stdout)
    else:
        # Worker subprocess with no usable stdout — use a NullHandler so
        # logging calls succeed silently instead of raising errors.
        console_handler = logging.NullHandler()
    console_handler.setFormatter(ExtraFieldsFormatter(log_format))
    
    # Create file handler — mode='a' appends so that worker-subprocess
    # re-entries (Windows ProcessPoolExecutor spawn) never truncate the log.
    # The file is cleared explicitly by clear.py / on manual restart only.
    file_handler = logging.FileHandler(log_file, mode='a', encoding='utf-8')
    file_handler.setFormatter(ExtraFieldsFormatter(log_format))
    
    # Configure root logger.
    # CRITICAL: force=True is required because uvicorn calls
    # logging.config.dictConfig() on startup, which adds its own handlers to
    # the root logger BEFORE (or concurrent with) this function.  Without
    # force=True, basicConfig() is a no-op whenever root already has handlers,
    # so our console_handler/file_handler are silently never attached.
    # Result without fix: all INFO logs from engine/saga/clustering are dropped;
    # only WARNING+ leaks through uvicorn's bare %(message)s formatter.
    logging.basicConfig(
        level=getattr(logging, log_level),
        format=log_format,
        handlers=[console_handler, file_handler],
        force=True,  # Remove any pre-existing root handlers (uvicorn, etc.)
    )
    
    # Set specific loggers to appropriate levels
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("fastapi").setLevel(logging.INFO)
    logging.getLogger("watchfiles").setLevel(logging.WARNING)  # Suppress file change spam

    # Engine sub-loggers: must be explicitly wired so that log records from
    # background-task coroutines (which run under __name__ = "engine.*" not
    # "fastapi") propagate to the root handlers configured above.
    # Without this, the entire CP-SAT / clustering trace is silently swallowed
    # and only the single "POST /api/generate_variants 200 OK" line appears.
    for _engine_logger in (
        "engine",
        "engine.cpsat",
        "engine.cpsat.solver",
        "engine.cpsat.dept_solver",
        "engine.cpsat.cross_dept_solver",
        "engine.cpsat.progress",
        "engine.cpsat.constraints",
        "engine.cpsat.strategies",
        "engine.stage1_clustering",
        "engine.ga",
        "engine.rl",
        "core.lifespan",
        "core.patterns.saga",
        "core.services.generation_service",
        "core.services.course_partitioner",
        "utils.django_client",
        "utils.cache_manager",
        "utils.progress_tracker",
    ):
        _log = logging.getLogger(_engine_logger)
        _log.setLevel(getattr(logging, log_level))
        _log.propagate = True  # let records reach root handlers
    
    logger = logging.getLogger(__name__)
    logger.info(f"Logging configured: level={log_level}, file={log_file}")
    logger.info("=" * 70)
    logger.info("FastAPI Timetable Generation Service Starting")
    logger.info("=" * 70)
    
    return logger
