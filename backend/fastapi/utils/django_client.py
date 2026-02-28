"""Django Backend Integration - Fetch data from Django database directly.

Performance architecture (Google-style):
- Module-level ThreadedConnectionPool: one pool, reused across all generation jobs.
  Eliminates 500-1500ms cold-connect cost on Neon.tech per job.
- asyncio.to_thread: each blocking psycopg2 call runs in a thread-pool worker,
  allowing asyncio.gather() in _load_data to truly parallelize 5 fetches.
  Without this, gather() is sequential because psycopg2 never yields the event loop.
- Fixed N+1 query: fetch_courses replaced correlated ARRAY_AGG subquery with a
  pre-aggregated JOIN, cutting query time from O(N offerings) to O(1) full scan.
"""
import asyncio
import logging
import os
import threading
import time
from typing import List, Dict, Optional

import psycopg2
import psycopg2.pool
from psycopg2.extras import RealDictCursor

from models.timetable_models import Course, Faculty, Room, TimeSlot, Student, Batch
from utils.cache_manager import CacheManager

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level connection pool (singleton, thread-safe lazy init).
#
# Why module-level?  FastAPI creates a new DjangoAPIClient per generation job.
# Without a shared pool every job pays the cold-connect cost (TCP + TLS + auth).
# With the pool, connections are reused — connect cost paid only once at startup.
#
# Pool sizing: 10 max connections is safe for Render.com (Neon.tech free tier
# allows 25 connections; we leave headroom for Django/Celery).
# ---------------------------------------------------------------------------
_db_pool: Optional[psycopg2.pool.ThreadedConnectionPool] = None
_pool_lock = threading.Lock()


def _get_db_pool() -> psycopg2.pool.ThreadedConnectionPool:
    """Return the shared connection pool, creating it on first call."""
    global _db_pool
    if _db_pool is not None:
        return _db_pool
    with _pool_lock:
        if _db_pool is not None:  # double-checked locking
            return _db_pool
        db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/sih28')
        _db_pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=2,
            maxconn=10,
            dsn=db_url,
            cursor_factory=RealDictCursor,
            connect_timeout=10,
        )
        # Apply statement timeout to all new connections via connection init
        logger.info(
            "[DB-POOL] ThreadedConnectionPool created (min=2, max=10)",
            extra={"dsn_host": db_url.split("@")[-1].split("/")[0]},
        )
    return _db_pool


def _init_conn(conn) -> None:
    """One-time per-connection setup: statement timeout."""
    with conn.cursor() as cur:
        cur.execute("SET statement_timeout = '30s'")
    conn.autocommit = True


class DjangoAPIClient:
    """Client for fetching data directly from Django database with intelligent caching.

    Uses the module-level ThreadedConnectionPool so connections are reused across
    generation jobs instead of being opened and closed for every request.
    """

    def __init__(self, redis_client=None):
        # Warm the pool on first instantiation (no-op on subsequent calls).
        self._pool = _get_db_pool()
        # Keep a single borrowed connection for the resolve_org_id / close() flow
        # that is NOT used by parallel fetch_* calls (those borrow their own).
        self.db_conn = self._pool.getconn()
        _init_conn(self.db_conn)
        self.cache_manager = CacheManager(redis_client=redis_client, db_conn=self.db_conn)

    # ------------------------------------------------------------------
    # Connection helpers
    # ------------------------------------------------------------------
    def _borrow_conn(self):
        """Borrow a connection from the pool for one query."""
        conn = self._pool.getconn()
        _init_conn(conn)
        return conn

    def _return_conn(self, conn) -> None:
        """Return a borrowed connection back to the pool."""
        try:
            self._pool.putconn(conn)
        except Exception as exc:
            logger.warning("[DB-POOL] putconn error: %s", exc)

    async def close(self):
        """Return the primary connection back to the pool (not closed)."""
        if self.db_conn:
            self._return_conn(self.db_conn)
            self.db_conn = None
    
    def resolve_org_id(self, org_identifier: str) -> str:
        """
        Resolve organization name to UUID if needed.
        If org_identifier is already a UUID, return it.
        If it's an org_name, look up the UUID.
        
        Args:
            org_identifier: Either org_id (UUID) or org_name
        
        Returns:
            org_id (UUID)
        """
        # Check if it's already a UUID (contains hyphens and is 36 chars)
        if len(org_identifier) == 36 and '-' in org_identifier:
            return org_identifier
        
        # It's an org_name, look up the UUID
        try:
            cursor = self.db_conn.cursor()
            cursor.execute(
                "SELECT org_id FROM organizations WHERE org_name = %s",
                (org_identifier,)
            )
            row = cursor.fetchone()
            cursor.close()
            
            if row:
                logger.debug(f"[ORG] Resolved '{org_identifier}' -> {row['org_id']}")
                return row['org_id']
            else:
                logger.error(f"[ORG] Organization '{org_identifier}' not found")
                # List available orgs
                cursor = self.db_conn.cursor()
                cursor.execute("SELECT org_id, org_name FROM organizations LIMIT 5")
                orgs = cursor.fetchall()
                cursor.close()
                logger.error(f"[ORG] Available: {[(o['org_name'], o['org_id']) for o in orgs]}")
                raise ValueError(f"Organization '{org_identifier}' not found")
        except Exception as e:
            logger.error(f"[ORG] Failed to resolve org_id: {e}")
            raise
    
    async def fetch_time_config(self, org_id: str) -> Optional[Dict]:
        """
        Fetch timetable configuration from database with caching.
        
        Args:
            org_id: Organization ID
        
        Returns:
            Configuration dict with working_days, slots_per_day, start_time, etc.
        """
        # Try cache first
        cached_config = await self.cache_manager.get('config', org_id)
        if cached_config:
            logger.debug(f"[CONFIG] Using cached config: {cached_config['working_days']} days, {cached_config['slots_per_day']} slots/day")
            return cached_config
        
        # Fetch from database
        try:
            cursor = self.db_conn.cursor()
            cursor.execute("""
                SELECT working_days, slots_per_day, start_time, end_time,
                       slot_duration_minutes, lunch_break_enabled, 
                       lunch_break_start, lunch_break_end
                FROM timetable_configurations
                WHERE org_id = %s
                ORDER BY last_used_at DESC
                LIMIT 1
            """, (org_id,))
            
            config_row = cursor.fetchone()
            cursor.close()
            
            if config_row:
                config = {
                    'working_days': config_row['working_days'],
                    'slots_per_day': config_row['slots_per_day'],
                    'start_time': str(config_row['start_time']),
                    'end_time': str(config_row['end_time']),
                    'slot_duration_minutes': config_row['slot_duration_minutes'],
                    'lunch_break_enabled': config_row['lunch_break_enabled'],
                    'lunch_break_start': str(config_row['lunch_break_start']) if config_row['lunch_break_start'] else None,
                    'lunch_break_end': str(config_row['lunch_break_end']) if config_row['lunch_break_end'] else None,
                }
                
                # Cache for 24 hours
                await self.cache_manager.set('config', org_id, config, ttl=86400)
                logger.debug(f"[CONFIG] Fetched from DB and cached: {config['working_days']} days, {config['slots_per_day']} slots/day")
                return config
            else:
                logger.warning(f"[CONFIG] No config found for org {org_id}, using defaults")
                return None
                
        except Exception as e:
            logger.error(f"[CONFIG] Fetch error: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return None

    async def fetch_courses(
        self,
        org_id: str,
        semester: int,
        department_id: Optional[str] = None
    ) -> List[Course]:
        """Fetch courses from database with caching"""
        
        def _is_valid_uuid(value) -> bool:
            """Check if UUID is valid (not NULL, empty, or zero UUID)"""
            if not value:
                return False
            str_val = str(value).strip().upper()
            if str_val in ('NULL', 'NONE', '', '00000000-0000-0000-0000-000000000000'):
                return False
            return True
        
        # Check cache version (Django signals update this when data changes)
        cache_valid = True
        if self.cache_manager.redis_client:
            try:
                version_key = f"ttdata:version:{org_id}:{semester}"
                stored_version = self.cache_manager.redis_client.get(version_key)
                cache_key = self.cache_manager._generate_cache_key('courses', org_id, semester=semester, department_id=department_id)
                cache_version_key = f"{cache_key}:version"
                cached_version = self.cache_manager.redis_client.get(cache_version_key)
                
                if stored_version and cached_version and stored_version != cached_version:
                    logger.info(f"[CACHE] Version mismatch detected - invalidating course cache for {org_id}")
                    await self.cache_manager.invalidate('courses', org_id, semester=semester, department_id=department_id)
                    cache_valid = False
            except Exception as e:
                logger.warning(f"[CACHE] Version check error: {e}")
        
        # Try cache first (if version is valid)
        if cache_valid:
            cached_courses = await self.cache_manager.get('courses', org_id, semester=semester, department_id=department_id)
            if cached_courses:
                logger.debug(f"[CACHE] Using cached courses: {len(cached_courses)} courses")
                # Deserialize from dict back to Course objects, filtering out invalid faculty
                valid_courses = []
                skipped = 0
                for c in cached_courses:
                    if _is_valid_uuid(c.get('faculty_id')):
                        valid_courses.append(Course(**c))
                    else:
                        skipped += 1
                if skipped > 0:
                    logger.warning(f"[CACHE] Filtered out {skipped} courses with invalid faculty from cache")
                return valid_courses
        
        # Fetch from database using a thread-pool worker so asyncio.gather()
        # in _load_data can run all 5 fetches truly in parallel.
        # psycopg2 releases the GIL during network I/O, so threads run concurrently.
        try:
            semester_type = 'ODD' if semester == 1 else 'EVEN'
            params: list = [semester_type, org_id]
            if department_id:
                params.append(department_id)

            def _sync_query() -> list:
                """Blocking DB work — runs in executor thread, not the event loop."""
                conn = self._borrow_conn()
                try:
                    cursor = conn.cursor()

                    # Validate org once, cheaply
                    cursor.execute(
                        "SELECT org_name FROM organizations WHERE org_id = %s",
                        (org_id,),
                    )
                    org_row = cursor.fetchone()
                    if not org_row:
                        cursor.execute(
                            "SELECT org_id, org_name FROM organizations LIMIT 5"
                        )
                        available = [r['org_name'] for r in cursor.fetchall()]
                        cursor.close()
                        logger.error(
                            "[COURSE LOAD] org not found",
                            extra={"org_id": org_id, "available": available},
                        )
                        return []
                    logger.debug(
                        "[COURSE LOAD] org resolved",
                        extra={"org_name": org_row['org_name'], "org_id": org_id},
                    )

                    # ----------------------------------------------------------
                    # PERF FIX: Replace correlated subquery with pre-aggregated JOIN.
                    #
                    # BEFORE (N+1 — re-executes once per offering row):
                    #   (SELECT ARRAY_AGG(DISTINCT student_id)
                    #    FROM course_enrollments
                    #    WHERE offering_id = co.offering_id AND is_active = true)
                    #
                    # AFTER (single full scan + hash-aggregate, O(1) complexity):
                    #   LEFT JOIN (...GROUP BY offering_id) ce_agg ON ...
                    #
                    # At 2,494 offerings the correlated version re-scans the index
                    # 2,494 times.  The JOIN version scans course_enrollments ONCE.
                    # Expected speedup: 2–6 seconds → 200–400 ms on Neon.tech.
                    # ----------------------------------------------------------
                    dept_filter = "AND c.dept_id = %s" if department_id else ""
                    query = f"""
                        SELECT c.course_id, c.course_code, c.course_name,
                               COALESCE(c.dept_id, f.dept_id) as dept_id,
                               c.lecture_hours_per_week, c.room_type_required,
                               c.min_room_capacity, c.course_type,
                               co.offering_id, co.primary_faculty_id, co.co_faculty_ids,
                               ce_agg.student_ids
                        FROM courses c
                        INNER JOIN course_offerings co
                            ON c.course_id = co.course_id
                            AND co.is_active = true
                            AND co.primary_faculty_id IS NOT NULL
                            AND co.semester_type = %s
                        LEFT JOIN faculty f ON co.primary_faculty_id = f.faculty_id
                        -- Pre-aggregated enrollments: ONE scan instead of N correlated queries
                        LEFT JOIN (
                            SELECT offering_id,
                                   ARRAY_AGG(DISTINCT student_id) AS student_ids
                            FROM course_enrollments
                            WHERE is_active = true
                            GROUP BY offering_id
                        ) ce_agg ON ce_agg.offering_id = co.offering_id
                        WHERE c.org_id = %s
                          AND c.is_active = true
                          AND ce_agg.student_ids IS NOT NULL
                          {dept_filter}
                        LIMIT 5000
                    """

                    t0 = time.monotonic()
                    cursor.execute(query, params)
                    rows = cursor.fetchall()
                    elapsed = time.monotonic() - t0
                    logger.debug(
                        "[COURSE LOAD] query complete",
                        extra={
                            "rows": len(rows),
                            "query_seconds": round(elapsed, 3),
                            "org_id": org_id,
                            "semester_type": semester_type,
                        },
                    )

                    # Summary count query (cheap aggregate, runs with pooled conn)
                    cursor.execute(
                        "SELECT COUNT(DISTINCT student_id) AS total_students"
                        " FROM course_enrollments WHERE is_active = true"
                    )
                    total_row = cursor.fetchone()
                    cursor.close()
                    # Attach total_students_count as first sentinel row so caller
                    # can log it without a second round-trip.
                    return [{"_total_students": total_row["total_students"] if total_row else 0}] + list(rows)
                finally:
                    self._return_conn(conn)

            # Run blocking query in thread — allows parallel execution with other fetches
            all_rows = await asyncio.to_thread(_sync_query)

            if not all_rows:
                return []

            # Extract sentinel (first element injected above)
            total_students = all_rows[0].get("_total_students", 0) if "_total_students" in (all_rows[0] or {}) else 0
            rows = all_rows[1:]

            courses = []
            unique_students = set()  # Track unique students across all courses
            enrollment_counts = []  # Track enrollment per offering
            
            for row in rows:
                try:
                    student_ids_raw = row.get('student_ids')
                    
                    # PostgreSQL returns array as string like "{uuid1,uuid2}", parse it
                    if student_ids_raw and isinstance(student_ids_raw, str):
                        student_ids_raw = student_ids_raw.strip('{}').split(',') if student_ids_raw != '{}' else []
                    elif not student_ids_raw:
                        student_ids_raw = []
                    
                    student_ids = [str(sid).strip() for sid in student_ids_raw if sid and str(sid).strip()]
                    enrollment_counts.append(len(student_ids))
                    unique_students.update(student_ids)
                    
                    # CRITICAL: Split large courses (>60 students) into parallel sections
                    # Sections can be scheduled SIMULTANEOUSLY using different faculty and rooms
                    if len(student_ids) > 60:
                        # Parse co_faculty_ids (PostgreSQL array format: "{id1,id2}")
                        co_faculty_raw = row.get('co_faculty_ids')
                        co_faculty_list = []
                        if co_faculty_raw and isinstance(co_faculty_raw, str):
                            # Filter out NULL/None/empty UUIDs from PostgreSQL array
                            co_faculty_list = [
                                f.strip() for f in co_faculty_raw.strip('{}').split(',') 
                                if _is_valid_uuid(f)
                            ]
                        
                        # Determine available faculty for parallel sections:
                        # - Primary faculty: MUST be from same department as course
                        # - Co-faculty: Can be from ANY department (cross-department teaching)
                        primary_fid = str(row['primary_faculty_id'])
                        # Safety check: primary faculty must be valid UUID
                        if not _is_valid_uuid(primary_fid):
                            logger.warning(f"[PARALLEL] Course {row['course_code']} has invalid primary_faculty_id: {primary_fid}, skipping")
                            continue
                        
                        # Build faculty pool: primary (same dept) + co-faculty (any dept)
                        available_faculty = [primary_fid]
                        available_faculty.extend(co_faculty_list)
                        
                        # Number of sections = MUST be enough to keep each section ≤60 students
                        # BUG FIX: Don't limit by faculty count - faculty can teach multiple sections
                        max_sections_by_students = (len(student_ids) + 59) // 60
                        num_sections = max_sections_by_students  # Force split based on student count ONLY
                        
                        students_per_section = len(student_ids) // num_sections
                        remainder = len(student_ids) % num_sections
                        
                        logger.debug(f"[PARALLEL SECTIONS] {row['course_code']}: {len(student_ids)} students -> {num_sections} sections")
                        
                        start_idx = 0
                        for section_idx in range(num_sections):
                            # Distribute remainder students to first sections
                            section_size = students_per_section + (1 if section_idx < remainder else 0)
                            section_students = student_ids[start_idx:start_idx + section_size]
                            start_idx += section_size
                            
                            # Assign faculty (cycle through available faculty if needed)
                            # BUG FIX: Use modulo to cycle - same faculty can teach multiple sections
                            section_faculty_id = available_faculty[section_idx % len(available_faculty)]
                            
                            # Double-check faculty validity before creating course
                            if not _is_valid_uuid(section_faculty_id):
                                logger.error(f"[PARALLEL SECTION] Course {row['course_code']} section {section_idx} has invalid faculty_id: {section_faculty_id}, skipping this section")
                                continue
                            
                            course = Course(
                                course_id=f"{row['course_id']}_off_{row['offering_id']}_sec{section_idx}",
                                course_code=f"{row['course_code']}",
                                course_name=f"{row['course_name']} (Sec {section_idx+1}/{num_sections})",
                                department_id=str(row['dept_id']),
                                faculty_id=section_faculty_id,  # DIFFERENT faculty per section
                                credits=row.get('lecture_hours_per_week', 3) or 3,
                                duration=row.get('lecture_hours_per_week', 3) or 3,
                                type=row.get('course_type', 'core'),
                                subject_type=row.get('course_type', 'core'),
                                required_features=[],
                                student_ids=section_students,
                                batch_ids=[]
                            )
                            courses.append(course)
                    else:
                        # Single section course (≤60 students)
                        primary_fid = str(row['primary_faculty_id'])
                        # Safety check: primary faculty must be valid UUID
                        if not _is_valid_uuid(primary_fid):
                            logger.warning(f"[COURSE LOAD] Course {row['course_code']} has invalid primary_faculty_id: {primary_fid}, skipping")
                            continue
                        
                        course = Course(
                            course_id=f"{row['course_id']}_off_{row['offering_id']}",
                            course_code=f"{row['course_code']}",
                            course_name=row['course_name'],
                            department_id=str(row['dept_id']),
                            faculty_id=primary_fid,
                            credits=row.get('lecture_hours_per_week', 3) or 3,
                            duration=row.get('lecture_hours_per_week', 3) or 3,
                            type=row.get('course_type', 'core'),
                            subject_type=row.get('course_type', 'core'),
                            required_features=[],
                            student_ids=student_ids,
                            batch_ids=[]
                        )
                        courses.append(course)
                except Exception as e:
                    logger.warning(f"Skipping course {row.get('course_code')}: {e}")
                    continue
            
            # Count parallel sections created
            parallel_sections = sum(1 for c in courses if '_sec' in c.course_id)
            original_offerings = len(set(c.course_id.split('_off_')[1].split('_sec')[0] for c in courses if '_off_' in c.course_id))
            
            logger.info(
                "[COURSE LOAD] sections built",
                extra={
                    "sections": len(courses),
                    "offerings": original_offerings,
                    "parallel": parallel_sections,
                    "unique_students": len(unique_students),
                    "total_enrolled": total_students,
                },
            )
            
            # Cache courses for 30 minutes (convert to dict for JSON serialization)
            courses_dict = [c.dict() for c in courses]
            await self.cache_manager.set('courses', org_id, courses_dict, ttl=1800, semester=semester, department_id=department_id)
            
            # Store cache version for invalidation detection
            if self.cache_manager.redis_client:
                try:
                    version_key = f"ttdata:version:{org_id}:{semester}"
                    current_version = self.cache_manager.redis_client.get(version_key)
                    if not current_version:
                        current_version = str(int(time.time()))
                        self.cache_manager.redis_client.setex(version_key, 86400, current_version)
                    
                    cache_key = self.cache_manager._generate_cache_key('courses', org_id, semester=semester, department_id=department_id)
                    cache_version_key = f"{cache_key}:version"
                    self.cache_manager.redis_client.setex(cache_version_key, 1800, current_version)
                except Exception as e:
                    logger.warning("[CACHE] Version storage error: %s", e)
            
            return courses

        except Exception as exc:
            logger.error("[COURSE LOAD] fetch failed", extra={"org_id": org_id, "error": str(exc)})
            return []



    async def fetch_faculty(self, org_id: str) -> Dict[str, Faculty]:
        """Fetch faculty from database with caching.

        Org validation is NOT repeated here — the caller (saga._load_data) already
        resolved org_id via resolve_org_id().  Removing the redundant round-trip
        saves one DB query per generation job.
        """
        cached_faculty = await self.cache_manager.get('faculty', org_id)
        if cached_faculty:
            logger.debug(
                "[CACHE] faculty hit",
                extra={"count": len(cached_faculty), "org_id": org_id},
            )
            return {fid: Faculty(**fdata) for fid, fdata in cached_faculty.items()}

        def _sync_query() -> list:
            conn = self._borrow_conn()
            try:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    SELECT faculty_id, faculty_code, first_name, last_name,
                           dept_id, max_hours_per_week, specialization
                    FROM faculty
                    WHERE org_id = %s AND is_active = true
                    """,
                    (org_id,),
                )
                rows = cursor.fetchall()
                cursor.close()
                return list(rows)
            finally:
                self._return_conn(conn)

        rows = await asyncio.to_thread(_sync_query)

        faculty_dict: Dict[str, Faculty] = {}
        for row in rows:
            try:
                fac = Faculty(
                    faculty_id=str(row['faculty_id']),
                    faculty_code=row.get('faculty_code', ''),
                    faculty_name=f"{row['first_name']} {row['last_name']}",
                    department_id=str(row['dept_id']),
                    max_hours_per_week=row.get('max_hours_per_week', 18) or 18,
                    specialization=row.get('specialization', '') or '',
                )
                faculty_dict[fac.faculty_id] = fac
            except Exception as exc:
                logger.warning("[FACULTY] skip row: %s", exc)

        logger.debug(
            "[FACULTY] fetched from DB",
            extra={"count": len(faculty_dict), "org_id": org_id},
        )
        faculty_cache = {fid: fac.dict() for fid, fac in faculty_dict.items()}
        await self.cache_manager.set('faculty', org_id, faculty_cache, ttl=3600)
        return faculty_dict



    async def fetch_rooms(self, org_id: str) -> List[Room]:
        """Fetch rooms from database with caching.

        Org validation removed — org was already resolved by the caller.
        """
        cached_rooms = await self.cache_manager.get('rooms', org_id)
        if cached_rooms:
            logger.debug(
                "[CACHE] rooms hit",
                extra={"count": len(cached_rooms), "org_id": org_id},
            )
            return [Room(**r) for r in cached_rooms]

        def _sync_query() -> list:
            conn = self._borrow_conn()
            try:
                cursor = conn.cursor()
                # BUG 4 FIX: fetch features and allow_cross_department_usage from DB
                cursor.execute(
                    """
                    SELECT room_id, room_code, room_number, room_type,
                           seating_capacity, building_id, dept_id,
                           features, allow_cross_department_usage
                    FROM rooms
                    WHERE org_id = %s AND is_active = true
                    """,
                    (org_id,),
                )
                rows = cursor.fetchall()
                cursor.close()
                return list(rows)
            finally:
                self._return_conn(conn)

        raw_rows = await asyncio.to_thread(_sync_query)
        rooms: List[Room] = []
        for row in raw_rows:
            try:
                # Parse features: PostgreSQL array column → Python list
                raw_features = row.get('features')
                if raw_features is None:
                    features_list = []
                elif isinstance(raw_features, list):
                    features_list = [str(f) for f in raw_features if f]
                elif isinstance(raw_features, str):
                    cleaned = raw_features.strip('{}')
                    features_list = (
                        [f.strip().strip('"') for f in cleaned.split(',') if f.strip()]
                        if cleaned else []
                    )
                else:
                    features_list = []

                room = Room(
                    room_id=str(row['room_id']),
                    room_code=row.get('room_code', ''),
                    room_name=row.get('room_number', ''),
                    room_type=row.get('room_type', 'classroom') or 'classroom',
                    capacity=row.get('seating_capacity', 60) or 60,
                    features=features_list,
                    dept_id=str(row['dept_id']) if row.get('dept_id') else None,
                    department_id=str(row['dept_id']) if row.get('dept_id') else None,
                )
                object.__setattr__(
                    room,
                    'allow_cross_department_usage',
                    bool(row.get('allow_cross_department_usage', True)),
                )
                rooms.append(room)
            except Exception as exc:
                logger.warning("[ROOM] skip row: %s", exc)

        logger.debug(
            "[ROOM] fetched from DB",
            extra={"count": len(rooms), "org_id": org_id},
        )
        rooms_cache = [r.dict() for r in rooms]
        await self.cache_manager.set('rooms', org_id, rooms_cache, ttl=3600)
        return rooms

    async def fetch_time_slots(self, org_id: str, time_config: dict = None, departments: List[str] = None) -> List[TimeSlot]:
        """
        Generate UNIVERSAL time slots for NEP 2020 centralized scheduling.
        
        NEP 2020 Architecture FIX:
        - ALL departments share the SAME 54 time slots (9 periods × 6 days)
        - Wall-clock synchronization is automatic - slot_id=0 is Monday Period 1 for EVERYONE
        - Students can take courses across departments without conflicts
        - Example: CS course at "Monday 9-10" and Physics course at "Monday 9-10" share slot_id=0
        
        Args:
            org_id: Organization ID (UUID) - kept for compatibility, not used for slot generation
            time_config: Time configuration dict with working_days, slots_per_day, start_time, etc.
            departments: DEPRECATED - no longer needed (universal slots)
        
        Returns:
            List of 54 universal TimeSlot objects (shared by all departments)
        """
        try:
            logger.debug(f"[NEP 2020] Generating UNIVERSAL time slots (no department filtering)")
            from datetime import datetime, timedelta
            
            # Use time_config if provided, otherwise use defaults
            if time_config:
                working_days = time_config.get('working_days', 6)
                slots_per_day = time_config.get('slots_per_day', 9)
                start_time_str = time_config.get('start_time', '08:00')
                end_time_str = time_config.get('end_time', '17:00')
                slot_duration = time_config.get('slot_duration_minutes', 60)
                lunch_break_enabled = time_config.get('lunch_break_enabled', True)
                lunch_break_start = time_config.get('lunch_break_start', '12:00')
                lunch_break_end = time_config.get('lunch_break_end', '13:00')
                logger.debug(f"[TIME_SLOTS] Using config: {working_days} days, {slots_per_day} slots/day, {start_time_str}-{end_time_str}")
            else:
                # Default configuration (matches old behavior)
                working_days = 6
                slots_per_day = 9
                start_time_str = '08:00'
                end_time_str = '17:00'
                slot_duration = 60
                lunch_break_enabled = True
                lunch_break_start = '12:00'
                lunch_break_end = '13:00'
                logger.warning("[TIME_SLOTS] No time_config provided, using defaults")
            
            # Parse start time - handle both HH:MM and HH:MM:SS formats
            def parse_time(time_str: str) -> datetime:
                """Parse time string in HH:MM or HH:MM:SS format"""
                # Remove seconds if present
                time_str = time_str.strip()
                if time_str.count(':') == 2:
                    time_str = ':'.join(time_str.split(':')[:2])
                return datetime.strptime(time_str, '%H:%M')
            
            start_time = parse_time(start_time_str)
            
            # Parse lunch break times
            lunch_start = parse_time(lunch_break_start) if lunch_break_enabled else None
            lunch_end = parse_time(lunch_break_end) if lunch_break_enabled else None
            
            # NEP 2020 FIX: Generate UNIVERSAL time slots (ONE grid for ALL departments)
            days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][:working_days]
            time_slots = []
            
            # Global slot ID counter (0 to 53 for 9 periods × 6 days)
            global_slot_id = 0
            
            for day_idx, day in enumerate(days):
                current_time = start_time
                period_idx = 0
                
                for _ in range(slots_per_day):
                    # Calculate slot end time
                    slot_end = current_time + timedelta(minutes=slot_duration)
                    
                    # Check if this slot overlaps with lunch break
                    if lunch_break_enabled and lunch_start and lunch_end:
                        # Skip if slot starts during lunch break
                        if lunch_start <= current_time < lunch_end:
                            current_time = lunch_end  # Jump to end of lunch break
                            continue
                    
                    # Create UNIVERSAL time slot (shared by all departments)
                    start_str = current_time.strftime('%H:%M')
                    end_str = slot_end.strftime('%H:%M')
                    
                    slot = TimeSlot(
                        slot_id=str(global_slot_id),  # Sequential: 0, 1, 2, ..., 53
                        day_of_week=day,
                        day=day_idx,
                        period=period_idx,
                        start_time=start_str,
                        end_time=end_str,
                        slot_name=f"{day.capitalize()} P{period_idx+1} ({start_str}-{end_str})"
                    )
                    time_slots.append(slot)
                    
                    # Move to next slot
                    current_time = slot_end
                    period_idx += 1
                    global_slot_id += 1
            
            logger.info(f"[NEP 2020] Generated {len(time_slots)} time slots ({working_days}d x {len(time_slots)//working_days if working_days else 0} slots/day)")
            
            return time_slots

        except Exception as e:
            logger.error(f"[TIME_SLOTS] Failed to generate time slots: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return []

    async def fetch_students(self, org_id: str) -> Dict[str, Student]:
        """Fetch students from database with caching.

        Org validation removed — org was already resolved by the caller.
        For BHU scale (19 072 students) this runs in a thread-pool worker so it
        does not block the event loop while asyncio.gather waits for the other
        fetch_* coroutines.
        """
        cached_students = await self.cache_manager.get('students', org_id)
        if cached_students:
            logger.debug(
                "[CACHE] students hit",
                extra={"count": len(cached_students), "org_id": org_id},
            )
            return {sid: Student(**sdata) for sid, sdata in cached_students.items()}

        def _sync_query() -> list:
            conn = self._borrow_conn()
            try:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    SELECT student_id, enrollment_number, first_name, last_name,
                           dept_id, current_semester
                    FROM students
                    WHERE org_id = %s AND is_active = true
                    """,
                    (org_id,),
                )
                rows = cursor.fetchall()
                cursor.close()
                return list(rows)
            finally:
                self._return_conn(conn)

        rows = await asyncio.to_thread(_sync_query)

        students_dict: Dict[str, Student] = {}
        for row in rows:
            try:
                student = Student(
                    student_id=str(row['student_id']),
                    enrollment_number=row.get('enrollment_number', ''),
                    student_name=f"{row['first_name']} {row['last_name']}",
                    department_id=str(row['dept_id']),
                    semester=row.get('current_semester', 1) or 1,
                    batch_id="",
                )
                students_dict[student.student_id] = student
            except Exception as exc:
                logger.warning("[STUDENT] skip row: %s", exc)

        logger.debug(
            "[STUDENT] fetched from DB",
            extra={"count": len(students_dict), "org_id": org_id},
        )
        students_cache = {sid: stud.dict() for sid, stud in students_dict.items()}
        await self.cache_manager.set('students', org_id, students_cache, ttl=1800)
        return students_dict

    async def fetch_batches(self, org_name: str) -> Dict[str, Batch]:
        """Fetch batches from database"""
        try:
            cursor = self.db_conn.cursor()
            
            # Get org_id
            cursor.execute("SELECT org_id FROM organizations WHERE org_name = %s", (org_name,))
            org_row = cursor.fetchone()
            if not org_row:
                return {}
            org_id = org_row['org_id']
            
            cursor.execute("""
                SELECT batch_id, batch_code, batch_name, dept_id,
                       current_semester, total_students
                FROM batches 
                WHERE org_id = %s AND is_active = true
            """, (org_id,))
            
            rows = cursor.fetchall()
            batches_dict = {}
            
            for row in rows:
                try:
                    batch = Batch(
                        batch_id=str(row['batch_id']),
                        batch_code=row.get('batch_code', ''),
                        batch_name=row.get('batch_name', ''),
                        department_id=str(row['dept_id']),
                        semester=row.get('current_semester', 1) or 1,
                        total_students=row.get('total_students', 60) or 60
                    )
                    batches_dict[batch.batch_id] = batch
                except Exception as e:
                    logger.warning(f"Skipping batch {row.get('batch_code')}: {e}")
                    continue
            
            cursor.close()
            logger.debug(f"Fetched {len(batches_dict)} batches from database")
            return batches_dict

        except Exception as e:
            logger.error(f"Failed to fetch batches: {e}")
            if self.db_conn:
                self.db_conn.rollback()
            return {}

    async def save_timetable(self, job_id: str, timetable_data: Dict):
        """Save generated timetable back to Django"""
        try:
            response = await self.client.post(
                f"{self.base_url}/academics/timetables/",
                json=timetable_data
            )
            response.raise_for_status()

            logger.info(f"Saved timetable {job_id} to Django")
            return response.json()

        except Exception as e:
            logger.error(f"Failed to save timetable: {e}")
            raise
