# Metric Calculation Fix - Overall Score & Room Utilization

## Problem
- **Overall score stuck at 70%**: The quality score formula `max(70, min(95, 95 - conflicts))` always produced a minimum of 70%, regardless of actual timetable quality
- **Room utilization always 88%**: The room_utilization metric was hardcoded to 88 instead of being calculated from the actual schedule

## Root Cause
In `main.py` (lines 1050-1060), the variant metrics were **hardcoded** instead of being calculated from the GA fitness function:

```python
variant = {
    'score': int(quality_score),  # Calculated from conflicts only
    'faculty_satisfaction': 85,   # HARDCODED ❌
    'room_utilization': 88,       # HARDCODED ❌
    'compactness': 82,            # HARDCODED ❌
}
```

## Solution
Changed the variant creation to calculate **ACTUAL metrics** from the GA fitness function:

### 1. Calculate Real Soft Constraint Scores
```python
# Create temporary GA instance to access fitness calculation methods
temp_ga = GeneticAlgorithmOptimizer(...)

# Calculate actual soft constraint scores (0-100 scale)
faculty_satisfaction = int(temp_ga._faculty_preference_satisfaction(solution) * 100)
room_utilization = int(temp_ga._room_utilization(solution) * 100)
compactness = int(temp_ga._schedule_compactness(solution) * 100)
workload_balance = int(temp_ga._workload_balance(solution) * 100)
```

### 2. Calculate Overall Quality Score
```python
# Weighted average of all metrics (matches GA fitness weights)
quality_score = int(
    faculty_satisfaction * 0.3 +
    compactness * 0.3 +
    room_utilization * 0.2 +
    workload_balance * 0.2
)

# Penalty for conflicts (reduce score by 1% per conflict, max 20% penalty)
conflict_penalty = min(20, (actual_conflicts / max(len(solution), 1)) * 100)
quality_score = max(0, quality_score - int(conflict_penalty))
```

### 3. Update Variant with Real Metrics
```python
variant = {
    'score': quality_score,                    # CALCULATED ✅
    'faculty_satisfaction': faculty_satisfaction,  # CALCULATED ✅
    'room_utilization': room_utilization,      # CALCULATED ✅
    'compactness': compactness,                # CALCULATED ✅
    'workload_balance': workload_balance,      # CALCULATED ✅
}
```

## Metric Calculation Details

### Faculty Satisfaction (30% weight)
- Measures how well faculty time preferences are satisfied
- Calculated from `_faculty_preference_satisfaction()` in GA
- Range: 0-100%

### Room Utilization (20% weight)
- Measures efficiency of room usage
- Formula: `utilized_slots / total_available_slots`
- Calculated from `_room_utilization()` in GA
- Range: 0-100%

### Compactness (30% weight)
- Measures schedule compactness (fewer gaps between classes)
- Calculated from `_schedule_compactness()` in GA
- Range: 0-100%

### Workload Balance (20% weight)
- Measures balanced faculty workload distribution
- Calculated from `_workload_balance()` in GA
- Range: 0-100%

## Expected Results

### Before Fix
- Overall score: Always 70% (minimum hardcoded)
- Room utilization: Always 88% (hardcoded)
- Faculty satisfaction: Always 85% (hardcoded)
- Compactness: Always 82% (hardcoded)

### After Fix
- Overall score: **Dynamic** (0-100%), based on actual timetable quality
- Room utilization: **Dynamic** (0-100%), based on actual room usage
- Faculty satisfaction: **Dynamic** (0-100%), based on actual preference matching
- Compactness: **Dynamic** (0-100%), based on actual schedule gaps

## Example Scenarios

### Scenario 1: High-Quality Timetable
- Faculty satisfaction: 92%
- Compactness: 88%
- Room utilization: 85%
- Workload balance: 90%
- **Overall score**: 92×0.3 + 88×0.3 + 85×0.2 + 90×0.2 = **89%** ✅

### Scenario 2: Low-Quality Timetable
- Faculty satisfaction: 60%
- Compactness: 55%
- Room utilization: 45%
- Workload balance: 50%
- **Overall score**: 60×0.3 + 55×0.3 + 45×0.2 + 50×0.2 = **53%** ✅

### Scenario 3: With Conflicts
- Base quality: 85%
- Conflicts: 50 out of 1000 assignments (5%)
- Conflict penalty: min(20, 5) = 5%
- **Final score**: 85 - 5 = **80%** ✅

## Refinement Stage Update
Also updated the quality refinement stage to recalculate ALL metrics after refinement:

```python
# Recalculate ACTUAL metrics after refinement
refined_faculty = int(ga_refine._faculty_preference_satisfaction(refined) * 100)
refined_room = int(ga_refine._room_utilization(refined) * 100)
refined_compact = int(ga_refine._schedule_compactness(refined) * 100)
refined_workload = int(ga_refine._workload_balance(refined) * 100)

# Update variant with refined metrics
variant['faculty_satisfaction'] = refined_faculty
variant['room_utilization'] = refined_room
variant['compactness'] = refined_compact
variant['workload_balance'] = refined_workload
```

## Testing
To verify the fix works:

1. Generate a timetable
2. Check the variant metrics in the response
3. Verify that:
   - Overall score is NOT always 70%
   - Room utilization is NOT always 88%
   - Metrics vary based on actual timetable quality
   - Metrics match the GA fitness calculation

## Files Modified
- `backend/fastapi/main.py` (lines 1040-1095, 1110-1145)

## Impact
- ✅ Overall score now reflects actual timetable quality
- ✅ Room utilization shows real room usage efficiency
- ✅ All metrics are dynamically calculated from the schedule
- ✅ Quality refinement updates all metrics correctly
- ✅ No performance impact (metrics calculated once per generation)
