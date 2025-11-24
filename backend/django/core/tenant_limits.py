"""
Multi-Tenant Resource Limits
Hardware-adaptive limits per organization tier
"""

from typing import Dict, Optional
from django.core.cache import cache
from .hardware_detector import HardwareDetector
import logging

logger = logging.getLogger(__name__)


class TenantLimits:
    """
    Manage per-tenant resource limits
    Adapts to available hardware automatically
    """
    
    # Base limits (multiplied by hardware tier)
    BASE_LIMITS = {
        'free': {
            'max_concurrent_generations': 1,
            'timeout_seconds': 600,  # 10 minutes
            'max_departments': 50,
            'max_courses': 500,
            'priority': 1,  # Low priority
        },
        'starter': {
            'max_concurrent_generations': 2,
            'timeout_seconds': 900,  # 15 minutes
            'max_departments': 100,
            'max_courses': 1000,
            'priority': 3,
        },
        'pro': {
            'max_concurrent_generations': 5,
            'timeout_seconds': 1200,  # 20 minutes
            'max_departments': 200,
            'max_courses': 3000,
            'priority': 5,  # Normal priority
        },
        'business': {
            'max_concurrent_generations': 10,
            'timeout_seconds': 1800,  # 30 minutes
            'max_departments': 500,
            'max_courses': 10000,
            'priority': 7,
        },
        'enterprise': {
            'max_concurrent_generations': 50,
            'timeout_seconds': 3600,  # 60 minutes
            'max_departments': 9999,
            'max_courses': 99999,
            'priority': 9,  # High priority
        },
    }
    
    @staticmethod
    def get_org_tier(org_id: str) -> str:
        """
        Get organization tier from database or cache
        Default: 'free' tier
        """
        # Try cache first
        cache_key = f"org_tier:{org_id}"
        tier = cache.get(cache_key)
        
        if tier:
            return tier
        
        # TODO: Query from database when org tiers are implemented
        # For now, return 'free' for all
        tier = 'free'
        
        # Cache for 1 hour
        cache.set(cache_key, tier, 3600)
        return tier
    
    @staticmethod
    def get_limits(org_id: str) -> Dict:
        """
        Get resource limits for organization
        Adapts to both org tier AND available hardware
        """
        # Get org tier
        org_tier = TenantLimits.get_org_tier(org_id)
        base_limits = TenantLimits.BASE_LIMITS.get(org_tier, TenantLimits.BASE_LIMITS['free'])
        
        # Get hardware tier
        hw_tier, hw_config = HardwareDetector.detect_tier()
        
        # Adjust limits based on hardware
        # If hardware is limited, reduce org limits proportionally
        hardware_multiplier = {
            'free': 0.5,      # 50% of org limits on free hardware
            'starter': 0.75,  # 75% of org limits
            'pro': 1.0,       # 100% of org limits
            'business': 1.25, # 125% of org limits
            'enterprise': 1.5 # 150% of org limits
        }.get(hw_tier, 1.0)
        
        # Calculate final limits
        final_limits = {
            'max_concurrent_generations': max(1, int(
                min(
                    base_limits['max_concurrent_generations'] * hardware_multiplier,
                    hw_config['max_concurrent_generations']
                )
            )),
            'timeout_seconds': base_limits['timeout_seconds'],
            'max_departments': base_limits['max_departments'],
            'max_courses': base_limits['max_courses'],
            'priority': base_limits['priority'],
            'org_tier': org_tier,
            'hardware_tier': hw_tier,
        }
        
        return final_limits
    
    @staticmethod
    def can_start_generation(org_id: str) -> tuple[bool, Optional[str]]:
        """
        Check if organization can start a new generation
        Returns: (can_start, error_message)
        """
        limits = TenantLimits.get_limits(org_id)
        
        # Check current concurrent generations
        cache_key = f"org_concurrent:{org_id}"
        current_concurrent = cache.get(cache_key, 0)
        
        # Verify against actual running jobs in database
        if current_concurrent >= limits['max_concurrent_generations']:
            # Double-check with database to avoid stale cache
            try:
                from academics.models import GenerationJob
                actual_running = GenerationJob.objects.filter(
                    organization_id=org_id,
                    status__in=['pending', 'running']
                ).count()
                
                # If cache is stale, reset it
                if actual_running == 0:
                    cache.set(cache_key, 0, timeout=7200)
                    current_concurrent = 0
                    logger.info(f"Reset stale concurrent count for org {org_id}")
                elif actual_running < current_concurrent:
                    cache.set(cache_key, actual_running, timeout=7200)
                    current_concurrent = actual_running
                    logger.info(f"Corrected concurrent count for org {org_id} to {actual_running}")
            except Exception as e:
                logger.warning(f"Could not verify concurrent jobs: {e}")
        
        if current_concurrent >= limits['max_concurrent_generations']:
            return False, f"Maximum concurrent generations ({limits['max_concurrent_generations']}) reached. Please wait for current jobs to complete."
        
        # Check hardware resources (allow if memory usage < 95%)
        if not HardwareDetector.can_handle_load():
            return False, "System resources exhausted (memory usage > 95%). Please try again in a few minutes."
        
        return True, None
    
    @staticmethod
    def increment_concurrent(org_id: str):
        """Increment concurrent generation count"""
        cache_key = f"org_concurrent:{org_id}"
        current = cache.get(cache_key, 0)
        cache.set(cache_key, current + 1, timeout=7200)  # 2 hours
        logger.info(f"Org {org_id} concurrent generations: {current + 1}")
    
    @staticmethod
    def decrement_concurrent(org_id: str):
        """Decrement concurrent generation count"""
        cache_key = f"org_concurrent:{org_id}"
        current = cache.get(cache_key, 0)
        if current > 0:
            cache.set(cache_key, current - 1, timeout=7200)
            logger.info(f"Org {org_id} concurrent generations: {current - 1}")
    
    @staticmethod
    def get_priority(org_id: str) -> int:
        """Get Celery priority for organization (1-9)"""
        limits = TenantLimits.get_limits(org_id)
        return limits['priority']
    
    @staticmethod
    def print_limits(org_id: str):
        """Print current limits for organization"""
        limits = TenantLimits.get_limits(org_id)
        
        print("\n" + "="*70)
        print(f"🏢 TENANT LIMITS: Organization {org_id}")
        print("="*70)
        print(f"Organization Tier: {limits['org_tier'].upper()}")
        print(f"Hardware Tier: {limits['hardware_tier'].upper()}")
        print(f"Max Concurrent Generations: {limits['max_concurrent_generations']}")
        print(f"Timeout: {limits['timeout_seconds']}s ({limits['timeout_seconds']//60} min)")
        print(f"Max Departments: {limits['max_departments']}")
        print(f"Max Courses: {limits['max_courses']}")
        print(f"Priority: {limits['priority']}/9")
        print("="*70 + "\n")
