# Generated migration to add indexes for faculty and student lookup queries

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academics', '0014_substitution_models'),
    ]

    operations = [
        # Faculty lookup indexes
        migrations.AddIndex(
            model_name='faculty',
            index=models.Index(fields=['faculty_code'], name='idx_fac_code'),
        ),
        migrations.AddIndex(
            model_name='faculty',
            index=models.Index(fields=['username'], name='idx_fac_username'),
        ),
        migrations.AddIndex(
            model_name='faculty',
            index=models.Index(fields=['email'], name='idx_fac_email'),
        ),
        
        # Student lookup indexes
        migrations.AddIndex(
            model_name='student',
            index=models.Index(fields=['enrollment_number'], name='idx_stu_enrollment'),
        ),
        migrations.AddIndex(
            model_name='student',
            index=models.Index(fields=['roll_number'], name='idx_stu_roll'),
        ),
        migrations.AddIndex(
            model_name='student',
            index=models.Index(fields=['username'], name='idx_stu_username'),
        ),
    ]
