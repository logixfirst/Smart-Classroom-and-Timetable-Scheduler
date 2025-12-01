# Generated migration for adding academic_year and semester fields to GenerationJob

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academics', '0009_add_generation_job_indexes'),
    ]

    operations = [
        migrations.AddField(
            model_name='generationjob',
            name='academic_year',
            field=models.CharField(blank=True, db_index=True, max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='generationjob',
            name='semester',
            field=models.IntegerField(blank=True, db_index=True, null=True),
        ),
        migrations.AddIndex(
            model_name='generationjob',
            index=models.Index(fields=['academic_year', 'semester'], name='idx_job_year_sem'),
        ),
        # Backfill existing records from timetable_data
        migrations.RunPython(
            code=lambda apps, schema_editor: backfill_academic_data(apps, schema_editor),
            reverse_code=migrations.RunPython.noop,
        ),
    ]


def backfill_academic_data(apps, schema_editor):
    """Populate academic_year and semester from existing timetable_data"""
    GenerationJob = apps.get_model('academics', 'GenerationJob')
    
    for job in GenerationJob.objects.filter(timetable_data__isnull=False):
        try:
            data = job.timetable_data
            if isinstance(data, dict):
                # Extract academic_year
                if 'academic_year' in data:
                    job.academic_year = str(data['academic_year'])
                
                # Extract and normalize semester
                if 'semester' in data:
                    semester = data['semester']
                    if isinstance(semester, str):
                        job.semester = 1 if semester.lower() == 'odd' else 2
                    elif isinstance(semester, int):
                        job.semester = semester
                
                job.save(update_fields=['academic_year', 'semester'])
        except Exception as e:
            print(f"Warning: Failed to backfill job {job.id}: {e}")
