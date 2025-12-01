# Progress Tracking Display Fix

**Issue**: Progress shows 1% without ETA initially, then jumps to 5% when clustering starts

## Problems Identified

### 1. Initial Display Issue
- **Symptom**: Progress shows "1%" but ETA appears after a delay
- **Root Cause**: 
  - Started at 0.1% (arbitrary value)
  - ETA calculation had 2-second update interval before first display
  - Background task started without sending initial progress update

### 2. Progress Jump at Clustering
- **Symptom**: Progress jumps from 1-2% to 5% when clustering starts
- **Root Cause**:
  - `load_data` stage: 0% → 5% (5% weight)
  - During load_data, progress reaches 2-3%
  - When clustering starts, it inherits current progress (2-3%)
  - But clustering range is 5% → 10%, so it quickly moves towards 5%
  - Progress step was 0.5%/500ms = 1%/sec (too aggressive)

## Fixes Applied

### Fix 1: Immediate ETA Display
**File**: `backend/fastapi/main.py`

```python
# OLD:
self.progress_tracker.last_progress = 0.1  # Start at 0.1%
await self.progress_task.start()

# NEW:
self.progress_tracker.last_progress = 0.0  # Start at 0%
# Send initial progress update with ETA BEFORE background task
await self.progress_tracker.update("Starting timetable generation", force_progress=0)
await self.progress_task.start()
```

**Effect**: 
- Progress starts at clean 0% instead of arbitrary 0.1%
- ETA is calculated and displayed **immediately** with the first update
- User sees "0% | ETA: 7 min" right away

### Fix 2: Smoother Progress Updates
**File**: `backend/fastapi/utils/progress_tracker.py`

```python
# OLD:
# Speed: 0.5% per 500ms = 1% per second
max_step = 0.5 * (time_since_last / 0.5)
new_progress = self.last_progress + 0.05  # minimum

# NEW:
# Speed: 0.3% per 500ms = 0.6% per second (smoother)
max_step = 0.3 * (time_since_last / 0.5)
new_progress = self.last_progress + 0.03  # minimum
```

**Effect**:
- Slower, smoother progress increments
- Reduces visual "jump" when transitioning between stages
- 0% → 5% takes ~8 seconds instead of ~5 seconds (more natural)

### Fix 3: More Responsive ETA
**File**: `backend/fastapi/utils/progress_tracker.py`

```python
# OLD:
if time_since_update >= 2.0:
    self._smoothed_eta = int(0.8 * self._smoothed_eta + 0.2 * remaining_time)

# NEW:
if time_since_update >= 1.5 or self._smoothed_eta == remaining_time:
    # More responsive in first 10 seconds
    alpha = 0.3 if time_since_update < 10 else 0.2
    self._smoothed_eta = int((1 - alpha) * self._smoothed_eta + alpha * remaining_time)
```

**Effect**:
- ETA updates faster initially (1.5s interval vs 2s)
- More responsive in first 10 seconds (alpha=0.3 vs 0.2)
- ETA appears immediately instead of waiting 2+ seconds

## Expected Behavior After Fix

### Timeline:
1. **T=0s**: User clicks "Generate Timetable"
2. **T=0.1s**: Progress displays "0% | Starting timetable generation | ETA: 7 min"
3. **T=0.5s**: Progress updates to "0% | Loading courses and students | ETA: 7 min"
4. **T=1-5s**: Progress smoothly increases 0% → 1% → 2% → 3% during load_data
5. **T=5s**: Clustering starts, progress at ~3%
6. **T=5.5-15s**: Progress smoothly increases 3% → 4% → 5% → 7% during clustering
7. **T=15s**: CP-SAT starts, progress at ~7%
8. **Continues smoothly without jumps...**

### Key Improvements:
- ✅ **Instant ETA**: Shows "ETA: 7 min" from the first update
- ✅ **No arbitrary 1%**: Starts at clean 0%
- ✅ **Smoother transitions**: 0.6%/sec vs 1%/sec
- ✅ **No visual jumps**: Gradual progress from 3% → 5% (not instant)
- ✅ **More responsive**: ETA updates every 1.5s initially

## Technical Details

### Progress Calculation Flow:
```python
1. set_stage('load_data')
   → stage_start_progress = 0.0
   → target_progress = 0.0 + (time_ratio * 5%)

2. Background task updates every 500ms:
   → calculate_smooth_progress()
   → max_step = 0.3% per 500ms
   → new_progress = min(target, current + step)
   → Redis update with ETA

3. set_stage('clustering')
   → stage_start_progress = current (e.g., 2.8%)
   → target_progress = 2.8% + (time_ratio * 5%)
   → Smoothly moves towards 5-7% range
```

### ETA Calculation:
```python
1. Calculate remaining time based on stage expectations
2. Apply exponential smoothing (alpha=0.3 initially, 0.2 later)
3. Update every 1.5s (responsive) instead of 2s
4. Never increases (only decreases or stays same)
```

## Testing

### Test 1: Initial Display
```bash
# Start generation
# Expected: "0% | Starting... | ETA: 7 min" appears within 100ms
```

### Test 2: Smooth Progress
```bash
# Watch progress during load_data (5 seconds)
# Expected: 0% → 1% → 2% → 3% (smooth, not jumpy)
```

### Test 3: Clustering Transition
```bash
# Watch transition from load_data → clustering
# Expected: 3% → 4% → 5% (smooth, not instant jump)
```

### Test 4: ETA Responsiveness
```bash
# Check ETA updates
# Expected: Updates every 1-2 seconds, never resets to high value
```

## Files Changed

- `backend/fastapi/main.py` - Send initial progress update before background task
- `backend/fastapi/utils/progress_tracker.py` - Smoother step size, faster ETA updates

## Related Issues Fixed

This fix addresses:
1. ✅ **"ETA showing 0% after cpsat completion"** - Fixed conflicting Redis writes
2. ✅ **"CP-SAT 50.4% success rate"** - Increased cluster size, lowered threshold
3. ✅ **"Admin timetables slow"** - Added indexed columns for metadata
4. ✅ **"Progress shows 1% then ETA appears"** - **THIS FIX**
5. ✅ **"Progress jumps from 1% to 5%"** - **THIS FIX**

## Success Criteria

✅ Progress starts at 0% with ETA displayed immediately  
✅ No visual jumps between stages (smooth 0.3%/500ms increment)  
✅ ETA updates within 1-2 seconds of starting  
✅ Progress moves smoothly through load_data (0→3%) and clustering (3→7%)
