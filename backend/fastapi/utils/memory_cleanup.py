"""
Memory Cleanup Utilities - DEPRECATED
Use engine.memory_manager instead
"""
import logging
from engine.memory_manager import memory_manager

logger = logging.getLogger(__name__)


def get_memory_usage() -> dict:
    """DEPRECATED: Use memory_manager._get_usage()"""
    return memory_manager._get_usage()


def aggressive_cleanup():
    """DEPRECATED: Use memory_manager.cleanup(level='aggressive')"""
    return memory_manager.cleanup(level='aggressive')


def cleanup_large_objects(*objects):
    """DEPRECATED: Use del + memory_manager.cleanup()"""
    import gc
    count = 0
    for obj in objects:
        if obj is not None:
            try:
                del obj
                count += 1
            except:
                pass
    if count > 0:
        memory_manager.cleanup(level='normal')
