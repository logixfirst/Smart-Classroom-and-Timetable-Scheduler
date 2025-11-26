# Unified Progress Tracker - Single Source of Truth

## Best Solution

Use **EnterpriseProgressTracker everywhere** - including inside GA and RL. Single source of truth, no conflicts.

## Implementation

### 1. Pass Progress Tracker to GA/RL

**File: `main.py`**
```python
# GA
ga_optimizer.progress_tracker = self.progress_tracker  # ✅ Unified tracker
ga_optimizer.job_id = job_id

# RL
resolver = RLConflictResolver(
    ...,
    progress_tracker=self.progress_tracker  # ✅ Unified tracker
)
```

### 2. GA Uses Progress Tracker

**File: `stage2_ga.py`**
```python
# Before: Direct Redis updates
self.redis_client.setex(f"progress:job:{job_id}", ...)

# After: Unified tracker
asyncio.create_task(self.progress_tracker.update(message))
```

### 3. RL Uses Progress Tracker

**File: `stage3_rl.py`**
```python
# Before: Direct Redis updates
r.setex(f"progress:job:{job_id}", ...)

# After: Unified tracker
asyncio.create_task(progress_tracker.update(message))
```

### 4. Background Task Always Runs

**File: `progress_tracker.py`**
```python
# Runs every 2 seconds
while self.running:
    await self.tracker.update(f"Processing: {self.tracker.current_stage}")
    await asyncio.sleep(2)
```

## How It Works

### Single Source of Truth

```
┌─────────────────────────────────┐
│  EnterpriseProgressTracker      │
│  (Single Source of Truth)       │
└─────────────────────────────────┘
         ▲         ▲         ▲
         │         │         │
    ┌────┴───┐ ┌──┴───┐ ┌───┴────┐
    │ Main   │ │  GA  │ │   RL   │
    │ (BG)   │ │      │ │        │
    └────────┘ └──────┘ └────────┘
```

### Update Flow

1. **Background Task**: Calls `tracker.update()` every 2s
2. **GA**: Calls `tracker.update()` every generation
3. **RL**: Calls `tracker.update()` every batch
4. **Tracker**: Handles all updates, calculates smooth progress

### No Conflicts

- ✅ All updates go through same tracker
- ✅ Tracker handles timing and smoothing
- ✅ No overwrites or race conditions
- ✅ Consistent progress calculation

## Benefits

### 1. Single Source of Truth
- ✅ One progress tracker for everything
- ✅ Consistent progress calculation
- ✅ No duplicate logic

### 2. No Conflicts
- ✅ All updates through same channel
- ✅ Tracker handles concurrency
- ✅ No overwrites

### 3. Simpler Code
- ✅ No redis_client passing
- ✅ No manual progress calculation
- ✅ Just call `tracker.update(message)`

### 4. Better Maintainability
- ✅ Change progress logic in one place
- ✅ Easy to add new stages
- ✅ Consistent behavior everywhere

## Progress Updates

### Background Task (Every 2s)
```python
await tracker.update("Processing: load_data")
await tracker.update("Processing: clustering")
await tracker.update("Processing: cpsat")
```

### GA (Every Generation)
```python
message = f'GA Gen {gen}/{total} (GPU): fitness={fitness:.2f}'
asyncio.create_task(tracker.update(message))
```

### RL (Every Batch)
```python
message = f'RL Episode {ep}/{total}: {resolved}/{conflicts} resolved'
asyncio.create_task(tracker.update(message))
```

### Tracker Handles Everything
- Calculates smooth progress (time-based + stage-based)
- Prevents backward movement
- Limits jumps
- Updates Redis
- Publishes to WebSocket

## Expected Behavior

### Load Data (Background)
```
0% Processing: load_data
1% Processing: load_data
2% Processing: load_data
```

### Clustering (Background)
```
5% Processing: clustering
6% Processing: clustering
7% Processing: clustering
```

### CP-SAT (Background)
```
15% Processing: cpsat
16% Processing: cpsat
17% Processing: cpsat
```

### GA (GA + Background)
```
65% GA Gen 1/6 (GPU): fitness=0.72
67% GA Gen 2/6 (GPU): fitness=0.74
69% GA Gen 3/6 (GPU): fitness=0.76
```

### RL (RL + Background)
```
80% RL Episode 0/100: 0/45 resolved
82% RL Episode 8/100: 5/45 resolved
84% RL Episode 16/100: 12/45 resolved
```

## Files Modified

1. ✅ `main.py` - Pass progress_tracker to GA/RL
2. ✅ `stage2_ga.py` - Use progress_tracker instead of redis_client
3. ✅ `stage3_rl.py` - Use progress_tracker instead of redis_client
4. ✅ `progress_tracker.py` - Always run (no skip logic)

## Summary

**Old Approach**: Multiple progress updaters (background, GA, RL)
- ❌ Conflicts and overwrites
- ❌ Inconsistent progress
- ❌ Complex coordination

**New Approach**: Single unified progress tracker
- ✅ No conflicts
- ✅ Consistent progress
- ✅ Simple and clean

**Result**: One tracker to rule them all! 🎉
