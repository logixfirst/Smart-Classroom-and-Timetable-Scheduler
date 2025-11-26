-- Add critical indexes to speed up course fetching (4 minutes -> <5 seconds)

-- Course table indexes
CREATE INDEX IF NOT EXISTS idx_course_org_active ON courses(org_id, is_active);

-- Course offerings indexes (CRITICAL - this is the slow query)
CREATE INDEX IF NOT EXISTS idx_offering_org_sem_active ON course_offerings(org_id, semester_type, is_active);
CREATE INDEX IF NOT EXISTS idx_offering_course_faculty ON course_offerings(course_id, primary_faculty_id);

-- Analyze tables to update statistics
ANALYZE courses;
ANALYZE course_offerings;
