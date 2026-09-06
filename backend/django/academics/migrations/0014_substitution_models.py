from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('academics', '0013_add_student_org_active_index'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ChangeAuditLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('action', models.CharField(max_length=64)),
                ('entity_type', models.CharField(max_length=64)),
                ('entity_id', models.CharField(max_length=100)),
                ('reason', models.TextField(blank=True)),
                ('old_state', models.JSONField(blank=True, default=dict)),
                ('new_state', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('actor', models.ForeignKey(blank=True, db_column='actor_id', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='change_audit_actions', to=settings.AUTH_USER_MODEL)),
                ('organization', models.ForeignKey(db_column='org_id', on_delete=django.db.models.deletion.CASCADE, related_name='change_audit_logs', to='academics.organization')),
            ],
            options={
                'db_table': 'change_audit_logs',
            },
        ),
        migrations.CreateModel(
            name='SubstitutionRequest',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('variant_id', models.CharField(db_index=True, max_length=80)),
                ('schedule_date', models.DateField(db_index=True)),
                ('day_index', models.PositiveSmallIntegerField()),
                ('time_slot', models.CharField(max_length=64)),
                ('subject_code', models.CharField(blank=True, max_length=64)),
                ('subject_name', models.CharField(blank=True, max_length=255)),
                ('reason', models.TextField(blank=True)),
                ('urgency', models.CharField(choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('critical', 'Critical')], default='high', max_length=20)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('recommended', 'Recommended'), ('applied', 'Applied'), ('cancelled', 'Cancelled'), ('rolled_back', 'Rolled Back')], default='pending', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('job', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='substitution_requests', to='academics.generationjob')),
                ('offering', models.ForeignKey(blank=True, db_column='offering_id', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='substitution_requests', to='academics.CourseOffering')),
                ('organization', models.ForeignKey(db_column='org_id', on_delete=django.db.models.deletion.CASCADE, related_name='substitution_requests', to='academics.organization')),
                ('original_faculty', models.ForeignKey(db_column='original_faculty_id', on_delete=django.db.models.deletion.CASCADE, related_name='original_substitution_requests', to='academics.faculty')),
                ('requested_by', models.ForeignKey(blank=True, db_column='requested_by', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='substitution_requests_created', to=settings.AUTH_USER_MODEL)),
                ('substitute_faculty', models.ForeignKey(blank=True, db_column='substitute_faculty_id', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='substitute_substitution_requests', to='academics.faculty')),
            ],
            options={
                'db_table': 'substitution_requests',
            },
        ),
        migrations.CreateModel(
            name='SubstitutionProposal',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('rank', models.PositiveSmallIntegerField(default=1)),
                ('score', models.DecimalField(decimal_places=2, default=0, max_digits=6)),
                ('score_breakdown', models.JSONField(blank=True, default=dict)),
                ('is_selected', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('candidate_faculty', models.ForeignKey(db_column='candidate_faculty_id', on_delete=django.db.models.deletion.CASCADE, related_name='substitution_proposals', to='academics.faculty')),
                ('request', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='proposals', to='academics.substitutionrequest')),
            ],
            options={
                'db_table': 'substitution_proposals',
                'unique_together': {('request', 'candidate_faculty')},
            },
        ),
        migrations.CreateModel(
            name='SubstitutionAssignment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('status', models.CharField(choices=[('applied', 'Applied'), ('rolled_back', 'Rolled Back')], default='applied', max_length=20)),
                ('applied_at', models.DateTimeField(auto_now_add=True)),
                ('rollback_at', models.DateTimeField(blank=True, null=True)),
                ('notes', models.TextField(blank=True)),
                ('applied_by', models.ForeignKey(blank=True, db_column='applied_by', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='substitution_assignments_applied', to=settings.AUTH_USER_MODEL)),
                ('proposal', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assignments', to='academics.substitutionproposal')),
                ('request', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='assignment', to='academics.substitutionrequest')),
                ('substitute_faculty', models.ForeignKey(db_column='substitute_faculty_id', on_delete=django.db.models.deletion.CASCADE, related_name='substitution_assignments', to='academics.faculty')),
            ],
            options={
                'db_table': 'substitution_assignments',
            },
        ),
        migrations.CreateModel(
            name='TimetableOverlayEntry',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('variant_id', models.CharField(db_index=True, max_length=80)),
                ('schedule_date', models.DateField(db_index=True)),
                ('day_index', models.PositiveSmallIntegerField()),
                ('time_slot', models.CharField(max_length=64)),
                ('original_entry', models.JSONField(blank=True, default=dict)),
                ('patched_entry', models.JSONField(blank=True, default=dict)),
                ('version', models.PositiveIntegerField(default=1)),
                ('status', models.CharField(choices=[('active', 'Active'), ('rolled_back', 'Rolled Back')], default='active', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('assignment', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='overlay_entry', to='academics.substitutionassignment')),
                ('created_by', models.ForeignKey(blank=True, db_column='created_by', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='timetable_overlays_created', to=settings.AUTH_USER_MODEL)),
                ('job', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='overlay_entries', to='academics.generationjob')),
                ('organization', models.ForeignKey(db_column='org_id', on_delete=django.db.models.deletion.CASCADE, related_name='timetable_overlays', to='academics.organization')),
                ('request', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='overlay_entries', to='academics.substitutionrequest')),
            ],
            options={
                'db_table': 'timetable_overlay_entries',
            },
        ),
        migrations.AddIndex(
            model_name='changeauditlog',
            index=models.Index(fields=['organization', 'created_at'], name='audit_org_created_idx'),
        ),
        migrations.AddIndex(
            model_name='changeauditlog',
            index=models.Index(fields=['entity_type', 'entity_id'], name='audit_entity_idx'),
        ),
        migrations.AddIndex(
            model_name='substitutionrequest',
            index=models.Index(fields=['organization', 'schedule_date'], name='sub_req_org_date_idx'),
        ),
        migrations.AddIndex(
            model_name='substitutionrequest',
            index=models.Index(fields=['status', 'created_at'], name='sub_req_status_created_idx'),
        ),
        migrations.AddIndex(
            model_name='substitutionrequest',
            index=models.Index(fields=['job', 'variant_id'], name='sub_req_job_variant_idx'),
        ),
        migrations.AddIndex(
            model_name='substitutionproposal',
            index=models.Index(fields=['request', 'rank'], name='sub_prop_req_rank_idx'),
        ),
        migrations.AddIndex(
            model_name='substitutionassignment',
            index=models.Index(fields=['status', 'applied_at'], name='sub_assign_status_applied_idx'),
        ),
        migrations.AddIndex(
            model_name='timetableoverlayentry',
            index=models.Index(fields=['organization', 'schedule_date'], name='overlay_org_date_idx'),
        ),
        migrations.AddIndex(
            model_name='timetableoverlayentry',
            index=models.Index(fields=['job', 'variant_id'], name='overlay_job_variant_idx'),
        ),
        migrations.AddIndex(
            model_name='timetableoverlayentry',
            index=models.Index(fields=['status', 'updated_at'], name='overlay_status_updated_idx'),
        ),
    ]
