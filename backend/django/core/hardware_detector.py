"""
Hardware Detection & Auto-Configuration
Automatically detects available resources and configures system accordingly
Zero manual configuration needed - works on any hardware
"""

import psutil
import os
from typing import Dict, Tuple

class HardwareDetector:
    """Detect hardware and auto-configure system"""
    
    @staticmethod
    def get_system_resources() -> Dict:
        """Get current system resources"""
        cpu_count = psutil.cpu_count(logical=True)
        memory = psutil.virtual_memory()
        
        return {
            'cpu_count': cpu_count,
            'memory_total_gb': memory.total / (1024**3),
            'memory_available_gb': memory.available / (1024**3),
            'memory_percent': memory.percent,
        }
    
    @staticmethod
    def detect_tier() -> Tuple[str, Dict]:
        """
        Auto-detect hardware tier and return optimal configuration
        
        Returns:
            (tier_name, config_dict)
        """
        resources = HardwareDetector.get_system_resources()
        memory_gb = resources['memory_total_gb']
        cpu_count = resources['cpu_count']
        
        # Free Tier: < 1GB RAM
        if memory_gb < 1:
            return 'free', {
                'celery_workers': 1,
                'celery_concurrency': 1,
                'max_concurrent_generations': 1,
                'db_pool_size': 5,
                'cache_ttl_multiplier': 1.0,
                'enable_parallel': False,
            }
        
        # Starter Tier: 1-2GB RAM
        elif memory_gb < 2:
            return 'starter', {
                'celery_workers': 2,
                'celery_concurrency': 2,
                'max_concurrent_generations': 2,
                'db_pool_size': 10,
                'cache_ttl_multiplier': 1.5,
                'enable_parallel': True,
            }
        
        # Pro Tier: 2-4GB RAM
        elif memory_gb < 4:
            return 'pro', {
                'celery_workers': min(4, cpu_count),
                'celery_concurrency': 4,
                'max_concurrent_generations': 4,
                'db_pool_size': 20,
                'cache_ttl_multiplier': 2.0,
                'enable_parallel': True,
            }
        
        # Business Tier: 4-7GB RAM
        elif memory_gb < 7:
            return 'business', {
                'celery_workers': min(10, cpu_count * 2),
                'celery_concurrency': 8,
                'max_concurrent_generations': 10,
                'db_pool_size': 50,
                'cache_ttl_multiplier': 3.0,
                'enable_parallel': True,
            }
        
        # Enterprise Tier: 7GB+ RAM
        else:
            return 'enterprise', {
                'celery_workers': min(40, cpu_count * 4),
                'celery_concurrency': min(16, cpu_count * 2),
                'max_concurrent_generations': 40,
                'db_pool_size': 100,
                'cache_ttl_multiplier': 4.0,
                'enable_parallel': True,
            }
    
    @staticmethod
    def can_handle_load(required_memory_gb: float = 2.0) -> bool:
        """Check if system can handle additional load"""
        resources = HardwareDetector.get_system_resources()
        # Allow if memory usage is below 95% (more realistic for production)
        return resources['memory_percent'] < 95
    
    @staticmethod
    def get_optimal_workers() -> int:
        """Calculate optimal number of workers based on current load"""
        resources = HardwareDetector.get_system_resources()
        
        # If memory usage > 80%, reduce workers
        if resources['memory_percent'] > 80:
            return 1
        
        # Otherwise use tier-based config
        _, config = HardwareDetector.detect_tier()
        return config['celery_workers']
    
    @staticmethod
    def print_system_info():
        """Print detected system configuration"""
        tier, config = HardwareDetector.detect_tier()
        resources = HardwareDetector.get_system_resources()
        
        print("\n" + "="*70)
        print("🖥️  HARDWARE DETECTION")
        print("="*70)
        print(f"CPU Cores: {resources['cpu_count']}")
        print(f"Total RAM: {resources['memory_total_gb']:.2f} GB")
        print(f"Available RAM: {resources['memory_available_gb']:.2f} GB")
        print(f"Memory Usage: {resources['memory_percent']:.1f}%")
        print("\n" + "-"*70)
        print(f"🎯 DETECTED TIER: {tier.upper()}")
        print("-"*70)
        print(f"Celery Workers: {config['celery_workers']}")
        print(f"Worker Concurrency: {config['celery_concurrency']}")
        print(f"Max Concurrent Generations: {config['max_concurrent_generations']}")
        print(f"Database Pool Size: {config['db_pool_size']}")
        print(f"Parallel Processing: {'Enabled' if config['enable_parallel'] else 'Disabled'}")
        print("="*70 + "\n")


# Auto-configure on import
TIER, CONFIG = HardwareDetector.detect_tier()

# Export for use in settings
def get_config(key: str, default=None):
    """Get configuration value"""
    return CONFIG.get(key, default)
