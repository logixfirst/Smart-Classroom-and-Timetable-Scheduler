"""
Application Lifespan Management
Handles startup and shutdown procedures following industry best practices

Includes:
- Memory monitoring (background thread)
- Cache management
- Resource cleanup
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
import redis

from config import settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    
    Handles:
    - Startup: Initialize Redis, hardware detection, caches, memory monitoring
    - Shutdown: Close connections, cleanup resources
    
    Usage:
        app = FastAPI(lifespan=lifespan)
    """
    # ==================== STARTUP ====================
    logger.info("🚀 Starting FastAPI Timetable Generation Service")
    
    try:
        # 1. Initialize Redis connection
        redis_url = settings.REDIS_URL
        
        try:
            # decode_responses=True: values are strings (not bytes), matching
            # Django's redis client.  ssl_cert_reqs="none" disables cert
            # validation for Upstash TLS — same as Django settings.py.
            redis_kwargs: dict = {
                "decode_responses": True,
                "socket_connect_timeout": 5,
                "socket_timeout": 10,
                "retry_on_timeout": True,
            }
            if redis_url.startswith("rediss://"):
                redis_kwargs["ssl_cert_reqs"] = "none"
            app.state.redis_client = redis.from_url(redis_url, **redis_kwargs)
            app.state.redis_client.ping()
            logger.info("✅ Redis connection established")
        except Exception as e:
            logger.warning(f"⚠️  Redis connection failed: {e}")
            logger.warning("Service will run without Redis (limited functionality)")
            app.state.redis_client = None
        
        # 2. Detect hardware profile
        from engine.hardware import get_hardware_profile
        app.state.hardware_profile = get_hardware_profile(force_refresh=True)
        hw = app.state.hardware_profile
        gpu_info = f", GPU: {hw.gpu_memory_gb:.0f}GB VRAM" if hw.has_nvidia_gpu else ""
        logger.info(f"Hardware: {hw.cpu_cores} cores @ {hw.cpu_frequency:.1f}GHz, RAM {hw.total_ram_gb:.1f}GB{gpu_info}, strategy={hw.optimal_strategy.value}")
        
        # 3. Initialize adaptive executor
        from engine.adaptive_executor import get_adaptive_executor
        app.state.adaptive_executor = get_adaptive_executor()
        logger.info("✅ Adaptive executor initialized")
        
        # 4. Initialize resource isolation
        from core.patterns.bulkhead import ResourceIsolation
        app.state.resource_isolation = ResourceIsolation()
        logger.info("✅ Resource isolation configured")
        
        # 5. Initialize cache manager
        from utils.cache_manager import CacheManager
        app.state.cache_manager = CacheManager(
            redis_client=app.state.redis_client,
            db_conn=None
        )

        
        # 6. Start memory monitoring (background thread)
        from core.memory_monitor import get_memory_monitor
        app.state.memory_monitor = get_memory_monitor()
        
        # Register cache cleanup callback
        app.state.memory_monitor.register_cleanup_callback(
            app.state.cache_manager.clear_memory_cache
        )
        
        # Start monitoring
        app.state.memory_monitor.start()
        
        logger.info("\u2705 FastAPI Timetable Service ready")
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        raise
    
    # Yield control to FastAPI
    yield
    
    # ==================== SHUTDOWN ====================
    logger.info("🛑 Shutting down FastAPI Timetable Generation Service")
    
    try:
        if hasattr(app.state, "memory_monitor"):
            app.state.memory_monitor.stop()
        
        if hasattr(app.state, "redis_client") and app.state.redis_client:
            app.state.redis_client.close()
        
        if hasattr(app.state, "resource_isolation"):
            app.state.resource_isolation.shutdown(wait=True)
        
        import gc
        gc.collect()
        logger.info("FastAPI Timetable Service stopped")
        
    except Exception as e:
        logger.error(f"Shutdown error: {e}")
