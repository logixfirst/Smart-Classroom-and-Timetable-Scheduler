# 🎯 Stage Usage Mapping - Which Files Use Which Stages

## 📊 Current System Architecture

The new hierarchical system has **3 stages**, but they work differently than the old system:

---

## 🔄 NEW HIERARCHICAL SYSTEM (Current)

### Stage 1: Course Categorization (Built into orchestrator.py)
**Purpose:** Split courses into 3 categories
- Core courses (no interdisciplinary)
- Departmental electives (some cross-enrollment)
- Open electives (high interdisciplinary)

**Implementation:** `orchestrator.py` → `_categorize_courses()` method

**Files that use Stage 1:**
- ✅ `orchestrator.py` (HierarchicalScheduler class)
  - Method: `_categorize_courses()`
  - Returns: CourseCategory with 3 lists

**No separate file** - Stage 1 is a simple categorization function, not a complex clustering algorithm

---

### Stage 2: CP-SAT + GA Solving (stage2_hybrid.py)
**Purpose:** Solve each category using constraint satisfaction + genetic algorithm
- CP-SAT: Hard constraints (no conflicts)
- GA: Soft constraints (optimization)

**Implementation:** `stage2_hybrid.py`

**Files that use Stage 2:**
1. ✅ `orchestrator.py` (HierarchicalScheduler)
   - Calls: `CPSATSolver` and `GeneticAlgorithmOptimizer`
   - For: Each department in each stage

2. ✅ `incremental_scheduler.py` (IncrementalScheduler)
   - Calls: `CPSATSolver` and `GeneticAlgorithmOptimizer`
   - For: Rescheduling changed courses

**Classes in stage2_hybrid.py:**
- `CPSATSolver` - Google OR-Tools constraint solver
- `GeneticAlgorithmOptimizer` - Genetic algorithm optimizer
- `HybridScheduler` - Orchestrates parallel solving (NOT USED in new system)

---

### Stage 3: Conflict Resolution (Built into orchestrator.py)
**Purpose:** Merge schedules from all 3 categories, resolve conflicts
- Merge Stage 1 → Stage 2 → Stage 3 schedules
- Detect and resolve any cross-stage conflicts

**Implementation:** `orchestrator.py` → `_merge_schedules()` method

**Files that use Stage 3:**
- ✅ `orchestrator.py` (HierarchicalScheduler class)
  - Method: `_merge_schedules()`
  - Method: `_get_blocked_slots()`
  - Returns: Conflict-free merged schedule

**No separate file** - Stage 3 is a merge/conflict resolution function, not Q-Learning

---

## 📁 File-by-File Breakdown

### 1. variant_generator.py (Entry Point)
**Uses:**
- ❌ No stages directly
- ✅ Calls `orchestrator.py` which uses all 3 stages

**Purpose:** Main entry point, always uses hierarchical strategy

---

### 2. orchestrator.py (Main Scheduler)
**Uses:**
- ✅ **Stage 1:** `_categorize_courses()` - Built-in categorization
- ✅ **Stage 2:** Imports from `stage2_hybrid.py`
  - `CPSATSolver` - For constraint satisfaction
  - `GeneticAlgorithmOptimizer` - For optimization
- ✅ **Stage 3:** `_merge_schedules()` - Built-in conflict resolution

**Purpose:** 3-stage hierarchical scheduler

**Code Flow:**
```python
# Stage 1: Categorize
categories = self._categorize_courses()

# Stage 2: Solve each category
for dept in categories.core_courses:
    solver = CPSATSolver(...)  # From stage2_hybrid.py
    optimizer = GeneticAlgorithmOptimizer(...)  # From stage2_hybrid.py

# Stage 3: Merge
final_schedule = self._merge_schedules(...)
```

---

### 3. stage2_hybrid.py (Solver Library)
**Uses:**
- ❌ No stages (this IS stage 2)
- ✅ Provides solvers used by other files

**Purpose:** Constraint satisfaction and optimization solvers

**Classes:**
- `CPSATSolver` - Google OR-Tools CP-SAT solver
- `GeneticAlgorithmOptimizer` - GA optimizer with island model
- `HybridScheduler` - Legacy parallel scheduler (NOT USED)

---

### 4. incremental_scheduler.py (Fast Updates)
**Uses:**
- ❌ No Stage 1 (uses existing schedule)
- ✅ **Stage 2:** Imports from `stage2_hybrid.py`
  - `CPSATSolver` - For rescheduling changed courses
  - `GeneticAlgorithmOptimizer` - For optimization
- ❌ No Stage 3 (conflicts prevented by respecting existing schedule)

**Purpose:** Fast updates for mid-semester changes

---

### 5. context_engine.py (Optimization Helper)
**Uses:**
- ❌ No stages directly
- ✅ Used BY Stage 2 (provides context-aware weights)

**Purpose:** 5-dimensional context-aware optimization

**Used by:**
- `stage2_hybrid.py` (GeneticAlgorithmOptimizer)
- `orchestrator.py` (HierarchicalScheduler)

---

### 6. gpu_scheduler.py (Future)
**Uses:**
- 🔄 Would use Stage 2 (GPU-accelerated CP-SAT)
- 🔄 Placeholder - not implemented

---

### 7. distributed_scheduler.py (Future)
**Uses:**
- 🔄 Would use Stage 2 (distributed CP-SAT via Celery)
- 🔄 Placeholder - not implemented

---

## 🎯 Stage Usage Summary

### Stage 1: Course Categorization
**Used by:**
- `orchestrator.py` only
- Built-in method, no separate file

### Stage 2: CP-SAT + GA Solving
**Implemented in:**
- `stage2_hybrid.py`

**Used by:**
- `orchestrator.py` (main scheduler)
- `incremental_scheduler.py` (fast updates)

### Stage 3: Conflict Resolution
**Used by:**
- `orchestrator.py` only
- Built-in method, no separate file

---

## 📊 Visual Flow

```
variant_generator.py (Entry Point)
    ↓
orchestrator.py (HierarchicalScheduler)
    ↓
    ├─ Stage 1: _categorize_courses()
    │   └─ Returns: core, dept_electives, open_electives
    ↓
    ├─ Stage 2: For each category
    │   ├─ CPSATSolver (from stage2_hybrid.py)
    │   └─ GeneticAlgorithmOptimizer (from stage2_hybrid.py)
    ↓
    └─ Stage 3: _merge_schedules()
        └─ Returns: Final conflict-free schedule
```

---

## 🔍 Key Differences from Old System

### Old System (DELETED)
- **Stage 1:** `stage1_clustering.py` - Complex Louvain clustering
- **Stage 2:** `stage2_hybrid.py` - CP-SAT + GA (same)
- **Stage 3:** `stage3_rl.py` - Q-Learning conflict resolution

### New System (CURRENT)
- **Stage 1:** Built into `orchestrator.py` - Simple categorization
- **Stage 2:** `stage2_hybrid.py` - CP-SAT + GA (same)
- **Stage 3:** Built into `orchestrator.py` - Simple merge logic

**Why simpler?**
- Hierarchical prevents conflicts upfront (no need for Q-Learning)
- Categorization is straightforward (no need for complex clustering)
- Faster and more maintainable

---

## ✅ Summary

**Stage 2 is the only separate file:**
- `stage2_hybrid.py` - Contains CP-SAT and GA solvers

**Stages 1 & 3 are built into orchestrator.py:**
- Stage 1: `_categorize_courses()` method
- Stage 3: `_merge_schedules()` method

**Files that use Stage 2 (stage2_hybrid.py):**
1. `orchestrator.py` - Main scheduler
2. `incremental_scheduler.py` - Fast updates

**That's it!** Simple, clean architecture.
