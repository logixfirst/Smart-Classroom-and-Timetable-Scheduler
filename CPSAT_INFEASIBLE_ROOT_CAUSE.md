# CP-SAT INFEASIBLE Root Cause Analysis

## Problem Summary
- **CP-SAT Success Rate**: 0% (all 294 clusters INFEASIBLE)
- **Total Conflicts**: 87,585 (97% student conflicts)
- **RL Stage**: Stuck at 98% for 666 seconds trying to resolve conflicts
- **GA Progress**: Resets due to stage-based calculation (expected behavior)

## Root Cause

### 1. **Cross-Cluster Student Enrollment**
The Louvain clustering algorithm splits students across multiple independent clusters:

```
Student A enrolled in: [Course1, Course2, Course3, Course4, Course5, Course6]

Louvain Clustering (target_size=10):
├─ Cluster 1: [Course1, Course2, Course3, ...]  (10 courses)
├─ Cluster 2: [Course4, Course5, ...]            (10 courses)
└─ Cluster 3: [Course6, ...]                     (10 courses)

Each cluster schedules INDEPENDENTLY → Student A has 3 classes at same time!
```

### 2. **Why CP-SAT Fails**
Individual feasibility checks pass:
- ✓ Each course has 4,800 valid room-time slots
- ✓ Faculty load within limits
- ✓ Room capacity sufficient

But CP-SAT model becomes INFEASIBLE when adding:
- 232 CRITICAL student constraints (students in 5+ courses)
- 3,520 total student constraints
- These constraints conflict because students span multiple clusters

### 3. **Why RL Gets Stuck**
RL tries to fix conflicts by re-solving super-clusters:
```
[GLOBAL] Processing cluster 93 (559 conflicts)
[GLOBAL] Super-cluster: 10 -> 100 courses
[CP-SAT] INFEASIBLE in 0.50s (trying to reschedule 100 courses)
[GLOBAL] Cluster 93 timeout after 383s - skipping to next
```

Each super-cluster:
- Takes 283-383 seconds
- Still returns INFEASIBLE
- Progress stuck at 98% (no work tracking during super-clustering)

## Solutions

### Option 1: **Fix Clustering Strategy** ⭐ RECOMMENDED
Modify Louvain clustering to respect student enrollments:

**File**: `backend/fastapi/engine/stage1_clustering.py`

```python
def cluster_courses(self, courses: List[Course]) -> List[List[Course]]:
    """Cluster courses while keeping student enrollments together"""
    
    # Build student-course graph
    student_courses = defaultdict(set)
    for course in courses:
        for student in course.students:
            student_courses[student.id].add(course.id)
    
    # CRITICAL: Don't split students across clusters
    # Use LARGER cluster size or hierarchical clustering
    target_cluster_size = 50  # Increase from 10 to 50
    
    # Alternative: Use constrained clustering
    # Keep all courses for same student group together
```

### Option 2: **Add Global Student Constraints to CP-SAT**
Run CP-SAT with ALL student constraints from the start:

**File**: `backend/fastapi/engine/stage2_cpsat.py`

```python
def solve_cluster(self, cluster: List[Course]) -> List[Assignment]:
    # BEFORE: Only add intra-cluster student constraints
    # AFTER: Add GLOBAL student constraints across all clusters
    
    # Get students who span multiple clusters
    cross_cluster_students = self._get_cross_cluster_students()
    
    # Add constraints to prevent conflicts
    for student in cross_cluster_students:
        courses = student.enrolled_courses  # All courses, not just cluster
        for c1, c2 in combinations(courses, 2):
            model.Add(time_vars[c1] != time_vars[c2])  # Different time slots
```

### Option 3: **Two-Phase Scheduling** ⭐ RECOMMENDED
1. **Phase 1**: Schedule "anchor courses" (courses with most student overlap)
2. **Phase 2**: Schedule remaining courses around fixed anchors

**File**: `backend/fastapi/main.py`

```python
async def _stage2_cpsat_scheduling(self, job_id: str):
    # Phase 1: Identify anchor courses (courses with 50+ students or 5+ cross-enrollments)
    anchor_courses = [c for c in courses if c.enrollment_count > 50 
                      or c.cross_cluster_count > 5]
    
    # Schedule anchors first with GLOBAL student constraints
    anchor_assignments = cpsat_solver.solve_global(anchor_courses)
    
    # Phase 2: Schedule remaining courses with anchors FIXED
    remaining = [c for c in courses if c not in anchor_courses]
    clusters = louvain.cluster_courses(remaining)
    
    for cluster in clusters:
        assignments = cpsat_solver.solve_cluster(cluster, fixed=anchor_assignments)
```

### Option 4: **Fix RL Progress Tracking**
Add work tracking to super-clustering:

**File**: `backend/fastapi/engine/stage3_rl.py`

```python
def resolve_conflicts_global(self, assignments, conflicts):
    problem_clusters = identify_problem_clusters(conflicts)
    total_clusters = len(problem_clusters)
    
    # SET WORK ITEMS for progress tracking
    self.progress_tracker.set_stage('rl', total_items=total_clusters)
    
    for i, cluster in enumerate(problem_clusters):
        super_cluster = build_super_cluster(cluster)
        resolved = cpsat_solver.solve(super_cluster)
        
        # UPDATE PROGRESS after each cluster
        self.progress_tracker.update_work_progress(i + 1)
```

## Immediate Actions

### 1. **Increase Cluster Size** (Quick Fix)
```python
# backend/fastapi/main.py, line 426
clusterer = LouvainClusterer(target_cluster_size=50)  # Changed from 10 to 50
```

### 2. **Add Cross-Enrollment Detection** (Quick Fix)
```python
# After clustering, log cross-enrollment statistics
cross_enrollments = detect_cross_cluster_students(clusters, courses)
logger.warning(f"[CLUSTERING] {len(cross_enrollments)} students span multiple clusters")

if len(cross_enrollments) > 100:
    logger.error("[CLUSTERING] Too many cross-enrollments - consider re-clustering")
```

### 3. **Skip Super-Clustering in RL** (Quick Fix)
```python
# backend/fastapi/engine/stage3_rl.py
if len(conflicts) > 50000:  # If conflicts > 50k, don't try super-clustering
    logger.warning("[RL] Too many conflicts - using local resolution only")
    return resolve_conflicts_local(assignments, conflicts[:1000])
```

## Expected Outcomes

After fixes:
- ✅ CP-SAT success rate: 60-85% (instead of 0%)
- ✅ Student conflicts: < 1,000 (instead of 87,585)
- ✅ RL completes in < 60 seconds (instead of 666 seconds)
- ✅ Progress tracks smoothly through RL stage

## Testing

1. **Verify cluster sizes**:
```bash
# Should see fewer, larger clusters
[CLUSTERING] Created 59 clusters (avg size: 42) ← GOOD
# Instead of:
[CLUSTERING] Created 294 clusters (avg size: 8) ← BAD
```

2. **Check student distribution**:
```bash
[CLUSTERING] Cross-cluster students: 45 (2% of total) ← GOOD
# Instead of:
[CLUSTERING] Cross-cluster students: 1,847 (97% of total) ← BAD
```

3. **Monitor CP-SAT success**:
```bash
[CP-SAT SUMMARY] Success rate: 78.5% ← GOOD
# Instead of:
[CP-SAT SUMMARY] Success rate: 0.0% ← BAD
```
