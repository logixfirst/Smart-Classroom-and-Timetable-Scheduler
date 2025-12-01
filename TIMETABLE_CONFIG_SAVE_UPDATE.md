# ✅ Timetable Configuration Save/Update Implementation

## 🎯 What Was Implemented

Your timetable form now properly **saves and updates** configurations in the database.

---

## 📋 Form Fields → Database Mapping

### **Basic Settings**
```
Academic Year: 2024-2025     → academic_year
Semester: Odd Semester        → semester (1=Odd, 2=Even)
```

### **Time Configuration**
```
Working Days: 6               → working_days
Slots Per Day: 9              → slots_per_day
Start Time: 08:00 AM          → start_time
End Time: 05:00 PM            → end_time
Enable Lunch Break: ✓         → lunch_break_enabled
Break Start: 12:00 PM         → lunch_break_start
Break End: 01:00 PM           → lunch_break_end
```

### **Constraints**
```
Max Classes Per Day: 6        → max_classes_per_day
Faculty Max Continuous: 3     → faculty_max_continuous
```

### **Optimization**
```
Priority: Balanced            → optimization_priority
Number of Variants: 5         → number_of_variants
Timeout: 30 seconds           → timeout_minutes
```

---

## 🔄 Save/Update Logic

### **Smart Create or Update**

**Before Fix:** Always created new records (duplicates)

**After Fix:** 
1. Check if config exists for **same organization + academic_year + semester**
2. If exists → **UPDATE** existing record
3. If not exists → **CREATE** new record

### **Implementation** (`timetable_config_views.py`)

```python
def create(self, request, *args, **kwargs):
    organization = request.user.organization
    academic_year = request.data.get('academic_year')
    semester = request.data.get('semester')
    
    # Check if configuration exists
    existing_config = TimetableConfiguration.objects.filter(
        organization=organization,
        academic_year=academic_year,
        semester=semester
    ).first()
    
    if existing_config:
        # UPDATE existing
        serializer.save()
        return Response({'action': 'updated'})
    else:
        # CREATE new
        serializer.save(organization=organization)
        return Response({'action': 'created'})
```

---

## 📊 Database Schema

**Table:** `timetable_configurations`

| Field | Type | Description |
|-------|------|-------------|
| `config_id` | UUID | Primary key |
| `organization` | FK | Organization reference |
| `academic_year` | VARCHAR | "2024-2025" |
| `semester` | INT | 1 (Odd) or 2 (Even) |
| `working_days` | INT | 5-7 days |
| `slots_per_day` | INT | 7-10 slots |
| `start_time` | TIME | "08:00:00" |
| `end_time` | TIME | "17:00:00" |
| `slot_duration_minutes` | INT | 60 minutes |
| `lunch_break_enabled` | BOOL | true/false |
| `lunch_break_start` | TIME | "12:00:00" |
| `lunch_break_end` | TIME | "13:00:00" |
| `max_classes_per_day` | INT | 6 classes |
| `faculty_max_continuous` | INT | 3 classes |
| `optimization_priority` | VARCHAR | balanced/compact/spread |
| `number_of_variants` | INT | 5 variants |
| `timeout_minutes` | INT | 30 seconds = 1 minute |
| `last_used_at` | TIMESTAMP | Auto-updated |
| `created_at` | TIMESTAMP | Creation time |

**Unique Constraint:** `(organization, academic_year, semester)`

---

## 🔧 How It Works

### **1. User Fills Form**
```
Academic Year: 2024-2025
Semester: Odd
Working Days: 6
...
```

### **2. Frontend Saves Configuration**
```typescript
// frontend/src/app/admin/timetables/new/page.tsx
const configPayload = {
  config_name: "2024-2025 - odd",
  academic_year: "2024-2025",
  semester: 1,  // Odd = 1
  working_days: 6,
  slots_per_day: 9,
  start_time: "08:00",
  end_time: "17:00",
  lunch_break_enabled: true,
  lunch_break_start: "12:00",
  lunch_break_end: "13:00",
  max_classes_per_day: 6,
  faculty_max_continuous: 3,
  optimization_priority: "balanced",
  number_of_variants: 5,
  timeout_minutes: 1  // 30 seconds → 1 minute
}

await fetch('/api/timetable-configs/', {
  method: 'POST',
  body: JSON.stringify(configPayload)
})
```

### **3. Django Checks for Existing Config**
```python
existing = TimetableConfiguration.objects.filter(
    organization=org,
    academic_year="2024-2025",
    semester=1
).first()

if existing:
    # UPDATE existing record
    existing.working_days = 6
    existing.slots_per_day = 9
    existing.save()
else:
    # CREATE new record
    TimetableConfiguration.objects.create(...)
```

### **4. Configuration Used in Generation**
```python
# When user clicks "Generate Timetable"
time_config = TimetableConfiguration.objects.filter(
    organization=org,
    academic_year="2024-2025",
    semester=1
).first()

# Extract settings
time_config_dict = {
    'working_days': time_config.working_days,  # 6
    'slots_per_day': time_config.slots_per_day,  # 9
    ...
}

# Update last_used_at timestamp
time_config.save(update_fields=['last_used_at'])

# Pass to FastAPI for dynamic time slot generation
job.timetable_data['time_config'] = time_config_dict
```

---

## 🎯 Benefits

### **1. No Duplicate Records**
- Same org + year + semester → UPDATE (not create new)
- Database stays clean

### **2. Change Tracking**
- `last_used_at` updated when config is used
- Latest config automatically selected for next generation

### **3. Historical Configurations**
- Different semesters have different configs
- Example:
  - `2024-2025 Odd`: 6 days, 9 slots
  - `2024-2025 Even`: 5 days, 8 slots
  - `2025-2026 Odd`: 6 days, 10 slots

### **4. User Experience**
- Form auto-loads last used configuration
- User can modify and save changes
- Changes are preserved for next time

---

## 🧪 Testing

### **Test Case 1: First Time Save**
```
1. Fill form with configuration
2. Click "Generate Timetable"
3. Check database:
   SELECT * FROM timetable_configurations WHERE academic_year='2024-2025' AND semester=1
   
Expected: 1 new record created
Response: {"action": "created", "success": true}
```

### **Test Case 2: Update Existing**
```
1. Modify configuration (change working_days from 6 to 5)
2. Click "Generate Timetable"
3. Check database:
   SELECT * FROM timetable_configurations WHERE academic_year='2024-2025' AND semester=1
   
Expected: Same record updated, working_days=5
Response: {"action": "updated", "success": true}
```

### **Test Case 3: Different Semester**
```
1. Change semester to "Even"
2. Fill form with different configuration
3. Click "Generate Timetable"
4. Check database:
   SELECT * FROM timetable_configurations WHERE academic_year='2024-2025'
   
Expected: 2 records (1 for Odd, 1 for Even)
Response: {"action": "created", "success": true}
```

### **Test Case 4: Last Used Timestamp**
```
1. Generate timetable using config
2. Check database:
   SELECT last_used_at FROM timetable_configurations WHERE academic_year='2024-2025' AND semester=1
   
Expected: last_used_at updated to current timestamp
```

---

## 📝 Files Modified

1. **`backend/django/academics/timetable_config_views.py`**
   - Added `create()` method with create-or-update logic
   - Checks for existing config before saving
   - Returns action type ("created" or "updated")

2. **`backend/django/academics/generation_views.py`**
   - Updates `last_used_at` when config is used
   - Fetches config for time slot generation

---

## ✅ Summary

**Form Behavior:**

| Action | Database Operation | Result |
|--------|-------------------|--------|
| First time submit | CREATE | New record in database |
| Modify and submit | UPDATE | Existing record updated |
| Change semester | CREATE | New record for different semester |
| Generate timetable | UPDATE | `last_used_at` timestamp updated |

**Configuration Flow:**

```
User Form → POST /api/timetable-configs/
    ↓
Check existing (org + year + semester)
    ↓
Exists? → UPDATE record
Not exists? → CREATE record
    ↓
Save to timetable_configurations table
    ↓
Return success response
    ↓
Start timetable generation
    ↓
Fetch saved config from database
    ↓
Pass to FastAPI for dynamic time slot generation
    ↓
Update last_used_at timestamp
```

Your form now properly saves and updates configurations! 🎉
