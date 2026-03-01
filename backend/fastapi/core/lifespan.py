"""
Application Lifespan Management
Handles startup and shutdown procedures following industry best practices

Includes:
- Memory monitoring (background thread)
- Cache management with startup warming
- Resource cleanup

Cache warming strategy:
  On startup FastAPI queries all active org IDs and pre-loads faculty, rooms,
  and students into Redis.  Courses are NOT pre-warmed (requires semester
  context which varies per request).  Warming runs as a background asyncio
  task so it never delays the first incoming request.
"""
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
import redis

from config import settings

logger = logging.getLogger(__name__)


async def _warm_org_cache(org_id: str, redis_client) -> None:
    """Pre-load faculty, rooms, and students for one org into Redis.

    Courses are omitted: they require a semester argument which we don't know
    at startup time.  faculty/rooms/students rarely change and are worth
    warming because they are fetched on EVERY generation request.
    """
    from utils.django_client import DjangoAPIClient
    client = DjangoAPIClient(redis_client=redis_client)
    try:
        # Run all three in parallel — each uses asyncio.to_thread internally
        faculty, rooms, students = await asyncio.gather(
            client.fetch_faculty(org_id),
            client.fetch_rooms(org_id),
            client.fetch_students(org_id),
        )
        logger.info(
            "[WARM] Org cache warm complete",
            extra={
                "org_id": org_id,
                "faculty": len(faculty),
                "rooms": len(rooms),
                "students": len(students),
            },
        )
    except Exception as exc:
        # Warming is opportunistic — a failure must never crash the server
        logger.warning(
            "[WARM] Org cache warm failed (non-fatal)",
            extra={"org_id": org_id, "error": str(exc)},
        )
    finally:
        await client.close()


async def _warm_all_orgs(redis_client) -> None:
    """Discover all active org IDs and warm their caches concurrently.

    Uses the connection pool (via DjangoAPIClient) so no extra connection is
    opened — the pool is already initialised at this point.
    """
    import asyncio
    from utils.django_client import _get_db_pool
    import psycopg2.extras

    logger.info("[WARM] Starting startup cache warming for all orgs")
    try:
        pool = _get_db_pool()
        conn = pool.getconn()
        conn.autocommit = True
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    "SELECT org_id FROM organizations WHERE is_active = true"
                )
                org_rows = cur.fetchall()
        finally:
            pool.putconn(conn)

        org_ids = [str(r["org_id"]) for r in org_rows]
        logger.info("[WARM] Warming %d orgs: %s", len(org_ids), org_ids)

        # Warm all orgs concurrently
        await asyncio.gather(*[_warm_org_cache(oid, redis_client) for oid in org_ids])
        logger.info("[WARM] All org caches warmed successfully")

    except Exception as exc:
        logger.warning(
            "[WARM] Cache warming aborted (non-fatal)",
            extra={"error": str(exc)},
        )


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
            # decode_responses=False (default): CacheManager uses a binary wire
            # protocol (1-byte tag + zstd-compressed payload).  decode_responses=True
            # would cause redis-py to UTF-8 decode the raw bytes, raising
            # "invalid start byte" on zstd magic bytes (e.g. 0xb5).
            # All encode/decode is handled by CacheManager._redis_get_smart /
            # _redis_set_smart, so the client must return raw bytes.
            redis_kwargs: dict = {
                "socket_connect_timeout": 5,
                # 30 s: accommodates large-ish Redis writes (e.g. student/faculty
                # blobs up to 5 MB) without triggering spurious timeout warnings.
                # Payloads > 5 MB are skipped by CacheManager before reaching here.
                "socket_timeout": 30,
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

        # 7. Fire-and-forget cache warming.
        # Runs concurrently with the first requests — never blocks startup.
        # If Redis is unavailable, _warm_all_orgs logs a warning and exits.
        if app.state.redis_client:
            asyncio.ensure_future(_warm_all_orgs(app.state.redis_client))
            logger.info("✅ Cache warming scheduled (background)")
        
        logger.info("✅ FastAPI Timetable Service ready")
        
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

    except asyncio.CancelledError:
        # Python 3.8+: CancelledError is a BaseException, not Exception.
        # Raised when uvicorn cancels the lifespan receive() coroutine during
        # Ctrl+C / SIGTERM before the shutdown event is delivered.  This is
        # expected behaviour — log it at DEBUG and suppress the noise.
        logger.debug("Lifespan receive cancelled during shutdown (normal Ctrl+C path)")

    except Exception as e:
        logger.error("Shutdown error: %s", e)
