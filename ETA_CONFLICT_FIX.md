# ETA Reset Bug Fix - Complete

## Problem
User reported: "ETA showing 0% after cpsat completion but then shows 7 min as ga start"

## Root Cause
Multiple conflicting progress tracking systems writing to Redis simultaneously:

1. **EnterpriseProgressTracker** (background task) - Smooth stage-based ETA calculation ✅
2. **CP-SAT direct writes** (main.py lines 590-622) - Recalculated ETA from cluster completion rate ❌
3. **RL fallback writes** (stage3_rl.py lines 866-881, 1247-1262) - Episode-based ETA calculation ❌

### Why This Caused ETA Reset

```python
# PROBLEM: CP-SAT calculated its own ETA
avg_time_per_cluster = elapsed / completed
time_remaining_seconds = int(avg_time_per_cluster * remaining_clusters * 1.2)
redis_client_global.setex(...)  # OVERWRITES background tracker!
redis_client_global.publish(...)
```

When CP-SAT completed:
1. Direct write sets `time_remaining_seconds=0` or stale value
2. Background tracker's smooth ETA gets overwritten
3. GA starts and recalculates fresh → shows "7 minutes"
4. User sees ETA jump from 0 → 7 minutes

## Solution
**Single Source of Truth**: Only `EnterpriseProgressTracker` manages all progress/ETA updates.

### Changes Made

#### 1. Removed CP-SAT Direct Redis Writes (main.py)
**File**: `backend/fastapi/main.py`

**Lines 588-622 (Removed)**:
```python
# BEFORE: Conflicting Redis write
progress_data = {
    'progress': progress_pct,
    'time_remaining_seconds': time_remaining_seconds or 0,
    'eta': eta,  # Calculated from cluster completion
}
redis_client_global.setex(f"progress:job:{job_id}", 3600, json.dumps(progress_data))
redis_client_global.publish(f"progress:{job_id}", json.dumps(progress_data))

# AFTER: Use background tracker
self.progress_tracker.update_work_progress(completed)
```

**Lines 1149-1250 (Removed)**:
- Deleted unused `_update_progress()` function with complex stage-based ETA calculation
- This function calculated ETA differently for each stage (CP-SAT: <60%, GA: <80%, RL: <96%)
- Conflicted with background tracker's smooth stage-based calculation

#### 2. Removed RL Fallback Direct Writes (stage3_rl.py)
**File**: `backend/fastapi/engine/stage3_rl.py`

**Lines 866-881 (Removed)**:
```python
# BEFORE: Fallback path direct write
progress_data = {
    'progress': progress_pct,
    'time_remaining_seconds': time_remaining_seconds or 0,
}
redis_client.setex(f"progress:job:{job_id}", 3600, json.dumps(progress_data))

# AFTER: Rely on background tracker
# Progress tracker handles all Redis updates - no direct writes
```

**Lines 1247-1262 (Removed)**:
- Same conflicting Redis write in global repair fallback path
- Now relies on `progress_tracker.update_work_progress()`

### Remaining Redis Writes (OK - Non-Conflicting)

These writes are **intentional** and don't conflict with progress tracking:

1. **Initial Progress** (main.py:1810-1812)
   - Sets up initial progress **before** background tracker starts
   - Only runs once at job start
   - OK ✅

2. **Cancel Notification** (main.py:1276-1277)
   - User-triggered cancellation event
   - Not part of normal progress flow
   - OK ✅

3. **Timeout Notification** (main.py:1547-1548)
   - Job exceeded max time limit
   - Terminal error state
   - OK ✅

4. **Error Notification** (main.py:1578-1579)
   - Job crashed or failed
   - Terminal error state
   - OK ✅

5. **Stage Messages** (stage1_clustering.py:77, stage2_cpsat.py:94)
   - Informational messages only (publish, no setex)
   - Don't write progress/ETA data
   - OK ✅

## Testing Verification

### Expected Behavior After Fix

1. **Progress starts at 0.1%** with initial ETA
2. **CP-SAT runs (5%→60%)** with smooth ETA updates
3. **CP-SAT completes at 60%** with ETA showing remaining time for GA+RL
4. **GA starts at 60.1%** with **same or lower ETA** (never jumps to 7 min)
5. **GA runs (60%→80%)** with smooth decreasing ETA
6. **RL runs (80%→96%)** with smooth decreasing ETA
7. **ETA never shows 0 seconds** during stage transitions
8. **ETA never resets or jumps** (always decreases smoothly)

### Monitor These Logs

```bash
# Watch for smooth progress transitions
grep "PROGRESS" fastapi_logs.txt

# Verify no conflicting Redis writes
grep "redis_client.*setex.*progress" backend/fastapi/*.py
grep "redis_client.*publish.*progress" backend/fastapi/*.py

# Check ETA values at stage transitions
grep -E "(CP-SAT.*complete|GA.*starting)" fastapi_logs.txt -A 2
```

### Test Commands

```powershell
# Run generation and monitor progress
cd backend/fastapi
python -m uvicorn main:app --reload

# In another terminal, watch logs
Get-Content fastapi_logs.txt -Wait | Select-String "PROGRESS|ETA"
```

## Architecture Benefits

### Single Source of Truth
- **Before**: 3+ systems calculating ETA independently
- **After**: Only EnterpriseProgressTracker manages ETA

### Smooth Stage Transitions
- **Before**: ETA recalculated at each stage (causes jumps)
- **After**: Stage-based ETA with exponential smoothing (alpha=0.2)

### TensorFlow-Style Progress
- **Before**: Progress jumped 1%→5%→10%
- **After**: Smooth 0.1%→0.2%→0.3%... at 1%/sec

### User-Friendly Names
- **Before**: Technical names ("cpsat", "rl")
- **After**: Display names ("Creating initial schedule", "Resolving conflicts")

## Related Documents
- `CPSAT_FIX_IMPLEMENTED.md` - Cluster size fix (10→50 courses)
- `CPSAT_QUALITY_FIX.md` - RL progress tracking fix
- `PERFORMANCE_OPTIMIZATIONS.md` - Background task architecture

## Status
✅ **COMPLETE** - All conflicting Redis writes removed. Only EnterpriseProgressTracker writes progress/ETA to Redis.
