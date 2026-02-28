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
import uvicorn

# Core setup
import multiprocessing
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

# Initialize logging — ONLY in the main process.
# On Windows, ProcessPoolExecutor uses the 'spawn' start method, which
# re-imports __main__ (this file) in every worker subprocess.  Without
# this guard, setup_logging() would fire 6 extra times (once per
# PARALLEL_CLUSTERS worker), truncating the log file ('w' mode) and
# wasting ~80 MB RAM per worker importing the full FastAPI app.
if multiprocessing.current_process().name == 'MainProcess':
    setup_logging()

# Create FastAPI application
app = FastAPI(
    title="Enterprise Timetable Generation Service",
    description="Hardware-adaptive timetable generation with multi-stage optimization",
    version="2.0.0",
    lifespan=lifespan  # Startup/shutdown management
)

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
    # Run with uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,  # Auto-reload on code changes in development
        reload_dirs=["api", "core", "engine", "models", "utils"],  # Only watch source directories
        log_level="info"
    )
