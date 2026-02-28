"""
Logging Configuration
Industry-standard structured logging setup
"""
import logging
import os
import sys
from pathlib import Path


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
    
    # Configure logging format
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
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
    console_handler.setFormatter(logging.Formatter(log_format))
    
    # Create file handler — mode='a' appends so that worker-subprocess
    # re-entries (Windows ProcessPoolExecutor spawn) never truncate the log.
    # The file is cleared explicitly by clear.py / on manual restart only.
    file_handler = logging.FileHandler(log_file, mode='a', encoding='utf-8')
    file_handler.setFormatter(logging.Formatter(log_format))
    
    # Configure root logger
    logging.basicConfig(
        level=getattr(logging, log_level),
        format=log_format,
        handlers=[console_handler, file_handler]
    )
    
    # Set specific loggers to appropriate levels
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("fastapi").setLevel(logging.INFO)
    logging.getLogger("watchfiles").setLevel(logging.WARNING)  # Suppress file change spam
    
    logger = logging.getLogger(__name__)
    logger.info(f"Logging configured: level={log_level}, file={log_file}")
    logger.info("=" * 70)
    logger.info("FastAPI Timetable Generation Service Starting")
    logger.info("=" * 70)
    
    return logger
