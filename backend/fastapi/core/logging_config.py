"""
Logging Configuration
Industry-standard structured logging setup
"""
import logging
import os
import sys
from datetime import datetime
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
    
    # Log file path with timestamp
    log_file = log_dir / f"fastapi_{datetime.now().strftime('%Y%m%d')}.log"
    
    # Configure logging format
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # Get log level from environment (default to INFO)
    log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
    
    # Create console handler with UTF-8 encoding support
    # On Windows the default stdout codec is cp1252, which cannot encode
    # emoji or other non-BMP characters.  Force UTF-8 so log messages that
    # contain emojis (e.g. the startup banner) don't raise UnicodeEncodeError.
    import io
    utf8_stdout = io.TextIOWrapper(
        sys.stdout.buffer if hasattr(sys.stdout, 'buffer') else sys.stdout,
        encoding='utf-8',
        errors='replace',  # replace un-encodable chars with ? instead of crashing
        line_buffering=True,
    )
    console_handler = logging.StreamHandler(utf8_stdout)
    console_handler.setFormatter(logging.Formatter(log_format))
    
    # Create file handler with UTF-8 encoding
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
