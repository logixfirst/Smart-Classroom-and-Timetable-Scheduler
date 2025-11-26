from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Add critical database indexes to speed up queries'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            self.stdout.write('Adding indexes...')
            
            # Course table index
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_course_org_active 
                ON courses(org_id, is_active)
            """)
            self.stdout.write(self.style.SUCCESS('+ Added idx_course_org_active'))
            
            # Course offerings indexes (CRITICAL)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_offering_org_sem_active 
                ON course_offerings(org_id, semester_type, is_active)
            """)
            self.stdout.write(self.style.SUCCESS('+ Added idx_offering_org_sem_active'))
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_offering_course_faculty 
                ON course_offerings(course_id, primary_faculty_id)
            """)
            self.stdout.write(self.style.SUCCESS('+ Added idx_offering_course_faculty'))
            
            # Analyze tables
            cursor.execute("ANALYZE courses")
            cursor.execute("ANALYZE course_offerings")
            self.stdout.write(self.style.SUCCESS('+ Analyzed tables'))
            
        self.stdout.write(self.style.SUCCESS('\nAll indexes added successfully!'))
        self.stdout.write('Query time should now be <5 seconds (was 4 minutes)')
