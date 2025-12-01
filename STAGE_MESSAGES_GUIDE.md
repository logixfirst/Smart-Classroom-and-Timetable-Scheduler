# Progress Stage Messages - User-Friendly

## Stage Mapping (Technical → User-Friendly)

| Technical Name | User Sees | Progress Range | Typical Duration |
|----------------|-----------|----------------|------------------|
| `load_data` | **Loading courses and students** | 0% → 5% | 5 seconds |
| `clustering` | **Analyzing course groups** | 5% → 10% | 10 seconds |
| `cpsat` | **Creating initial schedule** | 10% → 60% | 3-6 minutes |
| `ga` | **Optimizing quality** | 60% → 85% | 2-5 minutes |
| `rl` | **Resolving conflicts** | 85% → 95% | 0.5-2 minutes |
| `finalize` | **Finalizing timetable** | 95% → 100% | 5 seconds |

## What Each Stage Means (Plain English)

### 1. Loading courses and students (0-5%)
**What's happening**: System is reading your course data, student enrollments, faculty information, and room details from the database.

**User understands**: "The system is getting ready by loading all my data"

---

### 2. Analyzing course groups (5-10%)
**What's happening**: Intelligent grouping of courses based on student overlap, faculty availability, and department relationships.

**Technical**: Louvain clustering with graph-based community detection

**User understands**: "The system is figuring out which courses are related and should be scheduled together"

---

### 3. Creating initial schedule (10-60%)
**What's happening**: Building the core timetable using constraint programming to ensure no hard conflicts (faculty, rooms, time slots).

**Technical**: CP-SAT constraint solver with adaptive strategies

**User understands**: "The system is creating your timetable and making sure professors, rooms, and times work for everyone"

**Why it takes longest**: This is the most critical phase - ensures feasibility

---

### 4. Optimizing quality (60-85%)
**What's happening**: Improving the timetable to maximize quality metrics like schedule compactness, faculty preferences, and workload balance.

**Technical**: Genetic Algorithm with tournament selection and smart crossover

**User understands**: "The system is making your timetable better by reducing gaps and balancing workloads"

---

### 5. Resolving conflicts (85-95%)
**What's happening**: Using reinforcement learning to fix any remaining student conflicts, room conflicts, or faculty conflicts.

**Technical**: Q-Learning with behavioral context and transfer learning

**User understands**: "The system is fixing any remaining scheduling conflicts"

**Note**: If conflicts > 50,000, this stage completes instantly (root cause is clustering, not fixable here)

---

### 6. Finalizing timetable (95-100%)
**What's happening**: Converting the optimized schedule into a database-ready format and calculating final metrics.

**User understands**: "The system is finishing up and saving your timetable"

---

## Progress Message Examples

### Typical User Experience

```
0:00  →  0.1%   "Preparing your timetable..."              ETA: 10:30
0:02  →  0.3%   "Loading courses and students"            ETA: 10:28
0:05  →  0.6%   "Loading courses and students"            ETA: 10:25
0:10  →  1.2%   "Analyzing course groups"                 ETA: 10:20
0:20  →  3.0%   "Analyzing course groups"                 ETA: 10:10
0:30  →  5.5%   "Creating initial schedule"               ETA: 10:00
1:00  →  11.0%  "Creating initial schedule"               ETA: 9:30
2:00  →  25.0%  "Creating initial schedule"               ETA: 8:00
3:00  →  40.0%  "Creating initial schedule"               ETA: 5:00
4:00  →  60.0%  "Optimizing quality"                      ETA: 4:00
5:00  →  68.0%  "Optimizing quality"                      ETA: 3:00
6:00  →  76.0%  "Optimizing quality"                      ETA: 2:00
7:00  →  85.0%  "Resolving conflicts"                     ETA: 1:00
8:00  →  90.0%  "Resolving conflicts"                     ETA: 0:30
9:00  →  95.0%  "Finalizing timetable"                    ETA: 0:10
10:00 →  100%   "Timetable generation completed"          ETA: 0:00
```

---

## Frontend Display Recommendations

### Progress Bar Component

```typescript
interface ProgressData {
  progress: number;          // 0.1 to 100.0
  stage: string;            // User-friendly message
  message: string;          // Same as stage
  eta_seconds: number;      // Seconds remaining
  eta: string;              // ISO timestamp
  time_remaining_seconds: number;  // Seconds (same as eta_seconds)
}

// Display example:
<div className="progress-container">
  <div className="progress-header">
    <span className="stage-name">{data.stage}</span>
    <span className="eta-display">
      {formatETA(data.eta_seconds)} remaining
    </span>
  </div>
  <div className="progress-bar">
    <div 
      className="progress-fill" 
      style={{width: `${data.progress}%`}}
    />
  </div>
  <div className="progress-percentage">
    {Math.round(data.progress)}%
  </div>
</div>

function formatETA(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}
```

### Stage-Specific Icons (Optional)

Add visual feedback with icons:

```typescript
const stageIcons = {
  'Loading courses and students': '📚',
  'Analyzing course groups': '🔍',
  'Creating initial schedule': '📅',
  'Optimizing quality': '⚡',
  'Resolving conflicts': '🔧',
  'Finalizing timetable': '✅'
};
```

### Color Coding (Optional)

```css
.stage-loading { color: #3b82f6; }     /* Blue - Starting */
.stage-analyzing { color: #8b5cf6; }   /* Purple - Thinking */
.stage-creating { color: #f59e0b; }    /* Orange - Building */
.stage-optimizing { color: #10b981; }  /* Green - Improving */
.stage-resolving { color: #ef4444; }   /* Red - Fixing */
.stage-finalizing { color: #06b6d4; }  /* Cyan - Wrapping up */
```

---

## Localization Support

### Add translations for each stage:

```json
{
  "en": {
    "load_data": "Loading courses and students",
    "clustering": "Analyzing course groups",
    "cpsat": "Creating initial schedule",
    "ga": "Optimizing quality",
    "rl": "Resolving conflicts",
    "finalize": "Finalizing timetable"
  },
  "es": {
    "load_data": "Cargando cursos y estudiantes",
    "clustering": "Analizando grupos de cursos",
    "cpsat": "Creando horario inicial",
    "ga": "Optimizando calidad",
    "rl": "Resolviendo conflictos",
    "finalize": "Finalizando horario"
  },
  "hi": {
    "load_data": "पाठ्यक्रम और छात्र लोड हो रहे हैं",
    "clustering": "पाठ्यक्रम समूहों का विश्लेषण",
    "cpsat": "प्रारंभिक समय सारणी बना रहे हैं",
    "ga": "गुणवत्ता अनुकूलन",
    "rl": "विवादों का समाधान",
    "finalize": "समय सारणी को अंतिम रूप दे रहे हैं"
  }
}
```

---

## Testing Checklist

### Verify Each Stage Shows Correctly

- [ ] **0.1%**: "Preparing your timetable..." (initial state)
- [ ] **0-5%**: "Loading courses and students"
- [ ] **5-10%**: "Analyzing course groups"
- [ ] **10-60%**: "Creating initial schedule"
- [ ] **60-85%**: "Optimizing quality"
- [ ] **85-95%**: "Resolving conflicts"
- [ ] **95-100%**: "Finalizing timetable"
- [ ] **100%**: "Timetable generation completed"

### Verify ETA Behavior

- [ ] ETA shows immediately (< 1 second)
- [ ] ETA decreases over time (never increases)
- [ ] ETA updates every 2 seconds
- [ ] ETA shows reasonable values (5-15 minutes)

### Verify Progress Behavior

- [ ] Progress starts at 0.1% (not 1%)
- [ ] Progress increments smoothly (no jumps)
- [ ] Progress never goes backward
- [ ] Progress reaches 100% on completion
- [ ] Progress caps at 98% until truly done

---

## Common Issues & Solutions

### Issue: Progress stuck at 98%
**Cause**: RL stage taking too long (> 10 minutes)
**Solution**: Already fixed - RL now has 5-minute timeout and early exit for 50k+ conflicts

### Issue: ETA not showing
**Cause**: `eta_seconds` field missing in Redis data
**Solution**: Already fixed - added `eta_seconds` to initial progress_data

### Issue: Stage names still technical
**Cause**: Frontend not using `stage` field, using `message` instead
**Solution**: Use `data.stage` or `data.message` (both have user-friendly names now)

### Issue: Progress too fast/slow
**Cause**: `max_step` not tuned correctly
**Solution**: Adjust `max_step` in `progress_tracker.py` line 131:
- Too fast: `max_step = 0.25` (0.5% per second)
- Too slow: `max_step = 1.0` (2% per second)
- Default: `max_step = 0.5` (1% per second)
