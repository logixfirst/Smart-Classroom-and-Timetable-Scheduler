"""
FastAPI Timetable Generation Service - Main Application
Industry-standard architecture following Google/Meta/Microsoft patterns

This is the main entry point. All business logic is in separate modules:
- api/routers/ - API endpoints
- core/patterns/ - Enterprise patterns (Circuit Breaker, Saga, Bulkhead)
- core/services/ - Business logic
- engine/ - Scheduling algorithms
- utils/ - Utilities
"""
from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware
import uvicorn

# Core setup
from core.logging_config import setup_logging
from core.lifespan import lifespan

# Middleware
from api.middleware.cors import setup_cors
from api.middleware.error_handler import setup_error_handler
from api.middleware.rate_limiting import setup_rate_limiting

# API Routers
from api.routers import (
    generation_router,
    health_router,
    cache_router,
    conflicts_router,
    websocket_router
)

# Initialize logging unconditionally.
#
# Previous guard: `if multiprocessing.current_process().name == 'MainProcess'`
# was BROKEN in uvicorn --reload (WatchFiles) mode:
#   • The WatchFiles reloader runs as 'MainProcess' — it sets up logging …
#     but never handles HTTP requests.
#   • The spawned uvicorn server child runs as 'Process-1' — it DOES handle
#     requests but the guard prevented setup_logging() from running there,
#     so every INFO-level engine log was silently dropped.
#
# The subprocess-safety concerns that motivated the guard are addressed
# inside setup_logging() itself:
#   • File handler uses mode='a' — no truncation across processes.
#   • stdout guard → NullHandler when sys.stdout is a closed pipe.
#   • force=True makes repeated calls idempotent.
#
# ProcessPoolExecutor workers (saga.py _solve_cluster_worker) do NOT
# re-import this file (their pickled target lives in core.patterns.saga,
# not __main__), so there is no duplicate-call risk from pool workers.
setup_logging()

# Create FastAPI application
app = FastAPI(
    title="Enterprise Timetable Generation Service",
    description="Hardware-adaptive timetable generation with multi-stage optimization",
    version="2.0.0",
    lifespan=lifespan  # Startup/shutdown management
)

# ── GZip compression ──────────────────────────────────────────────────────────
# Compress all responses > 1 KB. Reduces JSON payload by ~60-80%.
# minimum_size=1000 avoids compressing tiny responses where overhead > gain.
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Configure middleware
setup_cors(app)
setup_error_handler(app)
setup_rate_limiting(app)

# Include API routers
app.include_router(generation_router)
app.include_router(health_router)
app.include_router(cache_router)
app.include_router(conflicts_router)
app.include_router(websocket_router)

# Root endpoint
@app.get("/")
async def root():
    """Service information"""
    return {
        "service": "Enterprise Timetable Generation",
        "version": "2.0.0",
        "status": "operational",
        "docs": "/docs",
        "health": "/api/health"
    }


if __name__ == "__main__":
    # Development: single worker with auto-reload
    # Production: use uvicorn.conf.py via `uvicorn main:app --config uvicorn.conf.py`
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,  # Auto-reload on code changes in development
        reload_dirs=["api", "core", "engine", "models", "utils"],  # Only watch source directories
        log_level="info"
    )
