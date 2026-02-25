from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("academics", "0010_add_academic_year_semester_fields"),
    ]

    operations = [
        migrations.AlterField(
            model_name="generationjob",
            name="status",
            field=models.CharField(
                default="pending",
                max_length=20,
                choices=[
                    ("pending", "Pending"),
                    ("running", "Running"),
                    ("completed", "Completed"),
                    ("failed", "Failed"),
                    ("cancelling", "Cancelling"),
                    ("cancelled", "Cancelled"),
                ],
            ),
        ),
    ]
