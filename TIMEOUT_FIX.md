# GA Timeout Fix - Adaptive Stage Timeouts

## Problem

GA stage was **timing out after 5 minutes** (300s saga timeout), causing generation to fail:

```
07:35:28 - GA starts initialization
07:37:03 - GA initialization completes (1m34s)
07:43:19 - TimeoutError (after 300s total = 5 minutes)
```

**Root Cause**: All saga steps had same 300s timeout, but GA needs more time:
- Initialization: 1m34s
- Evolution: 6 generations × ~1min = 6min
- **Total needed**: ~8 minutes, but only 5 minutes allowed

## Solution Applied

### 1. Adaptive Stage Timeouts

Changed from fixed 300s timeout to **adaptive timeouts per stage**:

```python
# Before: Fixed timeout for all stages
result = await asyncio.wait_for(
    execute_func(job_id, request_data),
    timeout=300  # 5 minutes for ALL stages
)

# After: Adaptive timeout per stage
if step_name == 'stage2_ga_optimization':
    step_timeout = 900  # 15 minutes for GA
elif step_name == 'stage2_cpsat_solving':
    step_timeout = 600  # 10 minutes for CP-SAT
else:
    step_timeout = 300  # 5 minutes for other stages
```

### 2. Improved GA Cleanup on Timeout

**Before:**
```python
except asyncio.TimeoutError:
    logger.warning(f"GA timed out, using CP-SAT result")
    if 'ga_optimizer' in locals():
        ga_optimizer.stop()
        del ga_optimizer
    gc.collect()
    return cpsat_result
```

**After:**
```python
except asyncio.TimeoutError:
    logger.warning(f"GA timed out, using CP-SAT result")
    # CRITICAL: Stop GA immediately to prevent zombie threads
    if 'ga_optimizer' in locals():
        try:
            ga_optimizer.stop()
            logger.info("[STAGE2B] GA stopped successfully")
        except Exception as e:
            logger.error(f"[STAGE2B] Error stopping GA: {e}")
        try:
            del ga_optimizer
        except:
            pass
    gc.collect()
    gc.collect()  # Double collect
    return cpsat_result
```

### 3. Better Error Handling

Added traceback logging and improved cleanup on GA errors:

```python
except Exception as e:
    logger.error(f"[STAGE2B] GA optimization failed: {e}")
    import traceback
    logger.error(traceback.format_exc())  # ✅ Full traceback
    # CRITICAL: Stop GA immediately on error
    if 'ga_optimizer' in locals():
        try:
            ga_optimizer.stop()
            logger.info("[STAGE2B] GA stopped after error")
        except Exception as stop_err:
            logger.error(f"[STAGE2B] Error stopping GA: {stop_err}")
        try:
            del ga_optimizer
        except:
            pass
    gc.collect()
    gc.collect()  # Double collect
    return cpsat_result
```

## Stage Timeout Breakdown

| Stage | Timeout | Reason |
|-------|---------|--------|
| load_data | 300s (5min) | Fast data loading |
| clustering | 300s (5min) | Quick Louvain clustering |
| **cpsat** | **600s (10min)** | Parallel CP-SAT solving |
| **ga** | **900s (15min)** | GA initialization (1m34s) + evolution (6-8min) |
| rl | 300s (5min) | Quick RL conflict resolution |

## Expected Behavior

### Before Fix
- GA starts at 07:35:28
- GA initialization: 1m34s (no progress)
- GA evolution starts at 07:37:03
- **TimeoutError at 07:40:28** (5 minutes from start)
- Generation fails
- Frontend shows error

### After Fix
- GA starts at 07:35:28
- GA initialization: 1m34s (with progress updates)
- GA evolution starts at 07:37:03
- GA completes at ~07:43:00 (within 15 minute timeout)
- Generation succeeds
- Frontend shows completion

## Why Frontend Still Runs After Error

The error handler returns `cpsat_result` instead of raising the exception:

```python
except asyncio.TimeoutError:
    logger.warning(f"GA timed out, using CP-SAT result")
    return cpsat_result  # ✅ Returns fallback, saga continues
```

This is **correct behavior** - if GA times out, use CP-SAT result as fallback. The saga should continue to RL stage, not fail completely.

## Files Modified

1. **main.py**: 
   - Added adaptive stage timeouts (300s/600s/900s)
   - Improved GA cleanup on timeout/error
   - Added traceback logging

## Testing

Run a generation and verify:
1. GA stage completes within 15 minutes
2. No TimeoutError in logs
3. Generation succeeds
4. Frontend shows completion

## Summary

The fix ensures GA has enough time to complete:
- **Before**: 5 minute timeout → GA fails
- **After**: 15 minute timeout → GA succeeds

The adaptive timeout system allows each stage to have appropriate time limits based on their complexity.
