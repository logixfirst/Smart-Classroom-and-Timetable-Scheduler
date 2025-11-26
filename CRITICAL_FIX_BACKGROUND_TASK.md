# CRITICAL FIX - Background Task Overwriting GA/RL Progress

## Root Cause Found!

**The background task was overwriting GA and RL progress updates!**

### The Problem

1. **Background task** runs every 1 second with smooth time-based progress
2. **GA/RL** run in `asyncio.to_thread()` (separate threads) and send their own updates
3. **Background task overwrites GA/RL updates** because it runs more frequently (1s vs 12s)

### Example Timeline

```
Time    GA Update           Background Task      What User Sees
----    ---------           ---------------      --------------
0s      65% Gen 1/6         -                    65% ✅
1s      -                   66% (time-based)     66% ❌ (overwrites GA)
2s      -                   67% (time-based)     67% ❌ (overwrites GA)
12s     68% Gen 2/6         -                    68% ✅
13s     -                   69% (time-based)     69% ❌ (overwrites GA)
14s     -                   70% (time-based)     70% ❌ (overwrites GA)
```

**Result**: User sees inconsistent jumps (66→67→68→69→70) instead of smooth GA updates.

## Solution

**Stop the background task during GA and RL stages**, let them handle their own progress.

### Changes Made

#### 1. Stop Background Task Before GA
```python
# Before GA starts
await self.progress_task.stop()
logger.info("[STAGE2B] Background task stopped, GA will handle progress")
```

#### 2. Restart Background Task After GA
```python
# After GA completes
await self.progress_task.start()
logger.info("[STAGE2B] Background task restarted")
```

#### 3. Same for RL
```python
# Before RL starts
await self.progress_task.stop()

# After RL completes
await self.progress_task.start()
```

#### 4. Handle Errors
```python
except asyncio.TimeoutError:
    # Restart background task on timeout
    await self.progress_task.start()
    
except Exception as e:
    # Restart background task on error
    await self.progress_task.start()
```

## Expected Behavior Now

### Before Fix
```
65% → 66% → 67% → 68% → 69% → 70% (background overwrites GA)
```

### After Fix
```
65% Gen 1/6 → 67% Gen 2/6 → 69% Gen 3/6 → 71% Gen 4/6 (GA controls progress)
```

## Progress Flow

```
Stage           Background Task    Progress Source
-----           ---------------    ---------------
load_data       ✅ Running         Background (1s)
clustering      ✅ Running         Background (1s)
cpsat           ✅ Running         Background (1s)
ga_init         ❌ STOPPED         GA internal
ga_evolve       ❌ STOPPED         GA internal
rl              ❌ STOPPED         RL internal
finalize        ✅ Running         Background (1s)
```

## Why This Fixes The Issue

1. **No Conflicts**: Background task doesn't overwrite GA/RL updates
2. **Consistent Updates**: GA updates every generation, RL updates every batch
3. **Smooth Progress**: Each stage controls its own progress without interference

## Files Modified

1. **main.py**: 
   - Stop background task before GA/RL
   - Restart background task after GA/RL
   - Handle errors and timeouts

## Testing

Run a generation and observe:
1. ✅ Progress updates smoothly during GA (every generation)
2. ✅ Progress updates smoothly during RL (every batch)
3. ✅ No inconsistent jumps or overwrites
4. ✅ Background task resumes after GA/RL complete

## Summary

**Root Cause**: Background task (1s updates) was overwriting GA/RL updates (12s updates)

**Solution**: Stop background task during GA/RL, let them control progress

**Result**: Smooth, consistent progress updates without conflicts! 🎉
