# Progress Tracking Architecture: Google/TensorFlow Pattern

## How Google & TensorFlow Handle Progress Tracking

### 1. **Callback-Based Architecture**
TensorFlow uses a callback system where progress tracking is **decoupled** from computation:

```python
# TensorFlow Pattern
model.fit(
    data, 
    epochs=100,
    callbacks=[
        tf.keras.callbacks.ProgbarLogger(),  # Progress bar
        tf.keras.callbacks.CSVLogger(),      # Log to file
        tf.keras.callbacks.TensorBoard()     # Real-time dashboard
    ]
)
```

**Key Principles:**
- **Separation of Concerns**: Progress tracking is separate from algorithm logic
- **Work-Based Progress**: Based on completed batches/epochs, not time estimates
- **Callback Invocation**: Framework calls callbacks at specific points (batch_end, epoch_end)
- **No Async in Sync**: Callbacks run synchronously within the training loop

### 2. **Work-Based Progress Tracking**
Google's approach uses **completed work units** rather than time estimates:

```python
# Work-based progress (TensorFlow style)
total_batches = 1000
for batch_idx in range(total_batches):
    train_batch(batch_idx)
    progress = (batch_idx + 1) / total_batches * 100
    update_progress(progress)  # Sync call, no async
```

**Benefits:**
- **Predictable**: Progress moves linearly with work completed
- **No Stalls**: Always updates after each work unit
- **Accurate ETA**: Based on actual completion rate, not estimates

### 3. **Batch Processing with Progress**
Google Cloud Dataflow and TensorFlow use batch processing with progress updates:

```python
# Batch processing pattern
def process_large_dataset(items, batch_size=100):
    total_items = len(items)
    for i in range(0, total_items, batch_size):
        batch = items[i:i+batch_size]
        process_batch(batch)
        
        # Update progress after each batch
        completed = min(i + batch_size, total_items)
        progress_tracker.update_work_progress(completed)
```

---

## Your Original Issues

### Issue 1: Clustering Stage - NO Progress Updates
**Problem**: `stage1_clustering.py` had no progress tracking during:
- Graph building (parallel edge computation)
- Louvain clustering
- Cluster size optimization

**Impact**: Progress stuck at 2-5% for 3+ seconds with no updates

### Issue 2: GA Stage - Async Calls from Sync Context
**Problem**: GA tried to use `asyncio.create_task()` from sync `evolve()` method
```python
# WRONG (your original code)
def evolve(self):  # Sync method
    for generation in range(self.generations):
        # ...
        asyncio.create_task(self.progress_tracker.update(...))  # ❌ Fails
```

**Impact**: Progress stuck at 15% with no Redis updates

### Issue 3: RL Stage - Same Async/Sync Issue
**Problem**: RL used `asyncio.create_task()` from sync conflict resolution
```python
# WRONG (your original code)
def resolve_conflicts(self):  # Sync method
    for episode in range(max_episodes):
        # ...
        asyncio.create_task(progress_tracker.update(...))  # ❌ Fails
```

**Impact**: Progress stuck at 90% with no Redis updates

---

## Our Solution: Google/TensorFlow Pattern

### 1. **Work-Based Progress Tracking**
We implemented TensorFlow-style work-based progress:

```python
# Clustering (stage1_clustering.py)
class LouvainClusterer:
    def __init__(self, progress_tracker=None):
        self.progress_tracker = progress_tracker
    
    def cluster_courses(self, courses):
        # Set total work items (3 phases)
        if self.progress_tracker:
            self.progress_tracker.stage_items_total = 100
            self.progress_tracker.stage_items_done = 0
        
        # Phase 1: Graph building (0-50%)
        G = self._build_constraint_graph(courses)
        if self.progress_tracker:
            self.progress_tracker.update_work_progress(50)
        
        # Phase 2: Louvain clustering (50-80%)
        partition = self._run_louvain(G)
        if self.progress_tracker:
            self.progress_tracker.update_work_progress(80)
        
        # Phase 3: Optimize sizes (80-100%)
        clusters = self._optimize_cluster_sizes(partition, courses)
        if self.progress_tracker:
            self.progress_tracker.update_work_progress(100)
```

### 2. **Sync Progress Updates (No Async)**
We replaced async calls with sync work-based updates:

```python
# GA (stage2_ga.py) - FIXED
def evolve(self, job_id=None):
    # Set total work items
    if self.progress_tracker:
        self.progress_tracker.stage_items_total = self.generations
        self.progress_tracker.stage_items_done = 0
    
    for generation in range(self.generations):
        # ... GA evolution logic ...
        
        # Update progress EVERY generation (sync method)
        if self.progress_tracker:
            self.progress_tracker.update_work_progress(generation + 1)
```

```python
# RL (stage3_rl.py) - FIXED
def resolve_conflicts_with_enhanced_rl(conflicts, timetable_data, rl_agent, progress_tracker):
    max_episodes = min(200, len(conflicts) * 3)
    
    # Set total work items
    if progress_tracker:
        progress_tracker.stage_items_total = max_episodes
        progress_tracker.stage_items_done = 0
    
    for episode in range(0, max_episodes, batch_size):
        # ... RL resolution logic ...
        
        # Update progress EVERY batch (sync method)
        if progress_tracker:
            progress_tracker.update_work_progress(episode)
```

### 3. **Background Task for Redis Updates**
We use a background async task to handle Redis updates:

```python
# progress_tracker.py
class ProgressUpdateTask:
    async def _update_loop(self):
        while self.running:
            # Calculate smooth progress from work-based tracking
            progress = self.tracker.calculate_smooth_progress()
            
            # Update Redis (async, runs in background)
            await self.tracker.update(message)
            
            await asyncio.sleep(0.5)  # Update every 500ms
```

**Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│ Sync Algorithm (Clustering/GA/RL)                          │
│                                                             │
│  for item in work_items:                                   │
│      process(item)                                         │
│      progress_tracker.update_work_progress(completed)  ◄───┼─── Sync call
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Updates internal counter
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ EnterpriseProgressTracker                                   │
│                                                             │
│  stage_items_done = completed                              │
│  stage_items_total = total                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Background task reads
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ ProgressUpdateTask (Async Background)                      │
│                                                             │
│  while running:                                            │
│      progress = calculate_smooth_progress()                │
│      await update_redis(progress)  ◄───────────────────────┼─── Async Redis
│      await asyncio.sleep(0.5)                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Differences: Your System vs TensorFlow

| Aspect | TensorFlow | Your Original | Your Fixed |
|--------|-----------|---------------|------------|
| **Progress Type** | Work-based (batches/epochs) | Time-based estimates | Hybrid (work + time) |
| **Update Method** | Sync callbacks | Async calls from sync | Sync work updates |
| **Update Frequency** | After each batch/epoch | Attempted every iteration | Every work unit |
| **Decoupling** | Callbacks separate from training | Mixed in algorithm | Background task |
| **Stalling** | Never (always updates) | Stuck at 3%, 15%, 90% | Smooth updates |

---

## Implementation Summary

### Files Modified:
1. **stage1_clustering.py**: Added work-based progress (3 phases: graph=50%, louvain=30%, optimize=20%)
2. **stage2_ga.py**: Already fixed (uses work-based progress per generation)
3. **stage3_rl.py**: Fixed progress updates (uses work-based progress per episode)
4. **main.py**: Pass progress_tracker to LouvainClusterer

### Progress Flow:
```
Load Data (2%)
    ↓
Clustering (2% → 5%)
    ├─ Graph Building: 0% → 50% of stage
    ├─ Louvain: 50% → 80% of stage
    └─ Optimize: 80% → 100% of stage
    ↓
CP-SAT (5% → 15%)
    └─ Per cluster: update_work_progress(completed_clusters)
    ↓
GA (15% → 90%)
    └─ Per generation: update_work_progress(current_generation)
    ↓
RL (90% → 97%)
    └─ Per episode: update_work_progress(current_episode)
    ↓
Finalize (97% → 100%)
```

---

## Testing Steps

1. **Start FastAPI service** (CRITICAL - changes require restart):
   ```bash
   cd backend/fastapi
   python main.py
   ```

2. **Trigger generation** and watch logs:
   ```bash
   tail -f backend/fastapi/fastapi_logs.txt
   ```

3. **Expected behavior**:
   - **Clustering (2-5%)**: Progress updates during graph building
   - **CP-SAT (5-15%)**: Progress updates per cluster
   - **GA (15-90%)**: Progress updates every generation
   - **RL (90-97%)**: Progress updates every episode
   - **No stalls**: Progress always moving forward

4. **Success criteria**:
   - ✅ Progress never stuck for >1 second
   - ✅ Smooth updates every 500ms
   - ✅ Redis shows work progress (e.g., "Clustering: 30/100")
   - ✅ No async/sync errors in logs

---

## Why This Works

1. **Work-Based Progress**: Like TensorFlow, we track actual completed work units
2. **Sync Updates**: No async calls from sync context (matches TensorFlow callbacks)
3. **Background Task**: Async Redis updates run separately (like TensorFlow TensorBoard)
4. **Smooth Interpolation**: Background task smooths work-based progress for UI
5. **Never Stalls**: Always updates after each work unit completes

This architecture matches Google/TensorFlow's proven approach for long-running batch operations with real-time progress tracking.
