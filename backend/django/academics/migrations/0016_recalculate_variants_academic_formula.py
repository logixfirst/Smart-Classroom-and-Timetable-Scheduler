"""
Migration: Recalculate all existing timetable variants with new academic formula.

This migration:
1. Adds formula_version field to track which formula was used
2. Recalculates all old variants with the new formula
3. Saves the new scores permanently
4. Never recalculates again (uses saved values)

Before: score calculated on-the-fly using old formula
After: score saved permanently, reused without recalculation
"""
from django.db import migrations, models
from django.db.models import JSONField
import json


def recalculate_variants_forward(apps, schema_editor):
    """
    Recalculate all existing variants using new academic formula.

    This is a one-time operation that:
    - Reads old timetable_data
    - Recalculates scores with new formula
    - Saves formula_version to prevent future recalculation
    """
    GenerationJob = apps.get_model('academics', 'GenerationJob')

    total_jobs = 0
    total_variants = 0
    updated_count = 0
    error_count = 0

    print("\n" + "="*80)
    print("MIGRATION: Recalculating variants with new academic formula")
    print("="*80)

    for job in GenerationJob.objects.filter(timetable_data__isnull=False):
        total_jobs += 1
        timetable_data = job.timetable_data or {}
        variants = timetable_data.get('variants', [])

        if not variants:
            continue

        updated_variants = []

        for idx, variant in enumerate(variants):
            total_variants += 1

            try:
                # Skip if already recalculated with new formula
                if variant.get('formula_version') == '2':
                    updated_variants.append(variant)
                    continue

                # Extract data for scoring
                qm = variant.get("quality_metrics", {}) or {}
                sta = variant.get("statistics", {}) or {}

                total_classes = int(sta.get("total_classes", variant.get("entry_count", 0)) or 0)
                score_room = int(round(float(qm.get("room_utilization_score", variant.get("room_utilization", 0)) or 0)))
                score_faculty = extract_faculty_score(qm)
                score_student = extract_student_score(qm)
                conflict_count = int(qm.get("total_conflicts", variant.get("conflicts", 0)) or 0)

                # Calculate new score using academic formula
                new_score = calculate_academic_score(
                    conflict_count=conflict_count,
                    total_classes=total_classes,
                    score_room=score_room,
                    score_faculty=score_faculty,
                    score_student=score_student,
                )

                # Update variant with new score and metadata
                variant['overall_score'] = new_score
                variant['formula_version'] = '2'  # Mark as recalculated
                variant['recalculated_at'] = str(__import__('datetime').datetime.now().isoformat())

                # Store old score for reference (optional)
                if 'old_score' not in variant and 'overall_score' in variant:
                    variant['old_score'] = variant.get('quality_metrics', {}).get('overall_score')

                updated_variants.append(variant)
                updated_count += 1

            except Exception as e:
                error_count += 1
                print(f"  ❌ Error recalculating variant {idx+1} in job {job.id}: {str(e)}")
                updated_variants.append(variant)  # Keep original if error

        # Save updated timetable_data back to database
        timetable_data['variants'] = updated_variants
        job.timetable_data = timetable_data
        job.save(update_fields=['timetable_data'])

    # Print summary
    print(f"\n✅ MIGRATION COMPLETE:")
    print(f"   Total jobs processed: {total_jobs}")
    print(f"   Total variants processed: {total_variants}")
    print(f"   Variants recalculated: {updated_count}")
    print(f"   Errors: {error_count}")
    print("="*80 + "\n")


def recalculate_variants_backward(apps, schema_editor):
    """
    Rollback: Remove formula_version and recalculated_at fields.
    Scores will be recalculated on-the-fly using old formula if accessed.
    """
    GenerationJob = apps.get_model('academics', 'GenerationJob')

    rollback_count = 0

    print("\n" + "="*80)
    print("ROLLBACK: Removing formula_version metadata")
    print("="*80)

    for job in GenerationJob.objects.filter(timetable_data__isnull=False):
        timetable_data = job.timetable_data or {}
        variants = timetable_data.get('variants', [])

        updated = False
        for variant in variants:
            if 'formula_version' in variant:
                del variant['formula_version']
                updated = True
            if 'recalculated_at' in variant:
                del variant['recalculated_at']
                updated = True

        if updated:
            job.timetable_data = timetable_data
            job.save(update_fields=['timetable_data'])
            rollback_count += 1

    print(f"\n✅ ROLLBACK COMPLETE:")
    print(f"   Jobs updated: {rollback_count}")
    print("="*80 + "\n")


def extract_faculty_score(qm):
    """Extract faculty load score (0-100) from quality_metrics."""
    raw = (
        qm.get("workload_balance_score")
        or qm.get("faculty_satisfaction")
        or qm.get("workload_balance")
    )
    if raw is not None:
        return min(100, max(0, int(round(float(raw)))))

    overload = qm.get("overload_ratio") or qm.get("faculty_overload_rate")
    if overload is not None:
        return min(100, max(0, int(round(100 - float(overload) * 100))))

    return 70


def extract_student_score(qm):
    """Extract student gap score (0-100) from quality_metrics."""
    raw = (
        qm.get("compactness_score")
        or qm.get("schedule_density")
        or qm.get("student_gap_score")
    )
    if raw is not None:
        return min(100, max(0, int(round(float(raw)))))

    gap_rate = qm.get("avg_gap_hours_per_day") or qm.get("gap_rate")
    if gap_rate is not None:
        return min(100, max(0, int(round(100 - float(gap_rate) * 20))))

    return 70


def calculate_academic_score(
    conflict_count,
    total_classes,
    score_room,
    score_faculty,
    score_student,
):
    """
    Calculate score using very lenient academic formula (50/45 hard/soft split).

    This is the same logic as TimetableVariantViewSet._compute_overall_score()
    but extracted here for the migration.
    """
    # ===== HARD CONSTRAINTS SCORE (50 points max) =====
    hard_score = 50.0

    teacher_conflicts_weight = 12
    room_conflicts_weight = 10
    student_conflicts_weight = 15
    valid_room_weight = 5

    max_teacher_conflicts = max(total_classes // 3, 3)
    max_room_conflicts = max(total_classes // 2, 3)
    max_student_conflicts = max(total_classes // 2, 3)
    max_room_validity = max(total_classes // 5, 3)

    # Distribute conflicts proportionally
    estimated_teacher_conflicts = max(0, conflict_count * 0.20)
    estimated_room_conflicts = max(0, conflict_count * 0.30)
    estimated_student_conflicts = max(0, conflict_count * 0.40)
    estimated_room_validity_violations = max(0, conflict_count * 0.10)

    # Calculate penalties with 0.4x multiplier (very forgiving)
    teacher_penalty = (estimated_teacher_conflicts / max_teacher_conflicts) * teacher_conflicts_weight * 0.4 if max_teacher_conflicts > 0 else 0
    room_penalty = (estimated_room_conflicts / max_room_conflicts) * room_conflicts_weight * 0.4 if max_room_conflicts > 0 else 0
    student_penalty = (estimated_student_conflicts / max_student_conflicts) * student_conflicts_weight * 0.4 if max_student_conflicts > 0 else 0
    room_validity_penalty = (estimated_room_validity_violations / max_room_validity) * valid_room_weight * 0.4 if max_room_validity > 0 else 0

    hard_score -= (teacher_penalty + room_penalty + student_penalty + room_validity_penalty)
    hard_score = max(0, hard_score)

    # ===== SOFT CONSTRAINTS SCORE (45 points max) =====
    soft_score = 45.0

    teacher_pref_weight = 12
    schedule_gaps_weight = 12
    class_balance_weight = 12
    back_to_back_weight = 9

    teacher_pref_deduction = (100 - score_faculty) / 100 * teacher_pref_weight * 0.3
    schedule_gaps_deduction = (100 - score_student) / 100 * schedule_gaps_weight * 0.3
    class_balance_deduction = (100 - score_room) / 100 * class_balance_weight * 0.3
    back_to_back_deduction = (100 - score_student) / 100 * back_to_back_weight * 0.2

    soft_score -= (teacher_pref_deduction + schedule_gaps_deduction + class_balance_deduction + back_to_back_deduction)
    soft_score = max(0, soft_score)

    # ===== FINAL SCORE =====
    base_bonus = 10.0
    overall = hard_score + soft_score + base_bonus
    return min(100, max(0, int(round(overall))))


class Migration(migrations.Migration):
    """
    Migration to recalculate all timetable variants with new academic formula.

    This migration:
    1. Recalculates all existing variants using new academic formula
    2. Saves the new scores permanently in the database
    3. Marks variants with formula_version='2' to avoid recalculation
    4. Can be rolled back if needed (though old scores won't be recoverable)
    """

    dependencies = [
        ('academics', '0015_add_lookup_indexes'),
    ]

    operations = [
        migrations.RunPython(
            recalculate_variants_forward,
            recalculate_variants_backward,
        ),
    ]
