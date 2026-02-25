"""
Configuration settings for FastAPI Timetable Generation Service
Reads from shared backend/.env file
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from parent backend/.env
backend_dir = Path(__file__).resolve().parent.parent
env_path = backend_dir / ".env"
load_dotenv(dotenv_path=env_path)


class Settings:
    """Application settings loaded from environment variables"""

    # Redis Configuration (shared with Django)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Django Backend API Configuration
    DJANGO_API_BASE_URL: str = os.getenv("DJANGO_API_BASE_URL", "http://localhost:8000")
    DJANGO_API_TIMEOUT: int = int(os.getenv("DJANGO_API_TIMEOUT", "30"))

    # Celery Configuration (for callbacks)
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")

    # FastAPI Service Configuration
    FASTAPI_HOST: str = os.getenv("FASTAPI_HOST", "0.0.0.0")
    FASTAPI_PORT: int = int(os.getenv("FASTAPI_PORT", "8001"))

    # CORS Settings
    CORS_ORIGINS: list = [
        "http://localhost:3000",  # Next.js dev
        "http://localhost:8000",  # Django dev
        "https://sih28.onrender.com",  # Production
    ]

    # Timetable Generation Algorithm Parameters

    # Stage 1: Louvain Clustering
    ALPHA_FACULTY: float = 10.0  # Weight for shared faculty
    ALPHA_STUDENT: float = 10.0  # Weight for student overlap (PRIMARY for NEP 2020)
    ALPHA_ROOM: float = 3.0  # Weight for room competition
    MAX_CLUSTER_SIZE: int = 15  # Maximum courses per cluster
    MIN_CLUSTER_SIZE: int = 3  # Minimum courses per cluster

    # Stage 2A: CP-SAT Solver (OPTIMIZED for base hardware)
    CPSAT_TIMEOUT_SECONDS: int = 30  # Reduced from 60s (50% faster)
    CPSAT_NUM_WORKERS: int = 1  # Auto-adjusted by hardware detector

    # Stage 2B: Genetic Algorithm (OPTIMIZED for base hardware)
    GA_POPULATION_SIZE: int = 20  # Increased from 15 — more seed diversity
    GA_GENERATIONS: int = 30  # Increased from 25 — better convergence across seeds
    GA_MUTATION_RATE: float = 0.20  # Increased for faster exploration
    GA_CROSSOVER_RATE: float = 0.8
    GA_ELITISM_RATE: float = 0.20  # Keep more good solutions
    GA_TOURNAMENT_SIZE: int = 3  # Smaller tournament for speed

    # Soft Constraint Weights (must sum to 1.0)
    WEIGHT_FACULTY_PREFERENCE: float = 0.20  # Faculty preferred time slots
    WEIGHT_COMPACTNESS: float = 0.25  # Minimize gaps in student schedules
    WEIGHT_ROOM_UTILIZATION: float = 0.15  # Efficient room usage
    WEIGHT_WORKLOAD_BALANCE: float = 0.20  # Balance faculty workload
    WEIGHT_PEAK_SPREADING: float = 0.10  # Avoid peak hour clustering
    WEIGHT_CONTINUITY: float = 0.10  # Same course sessions on same days

    # Stage 3: Q-Learning (OPTIMIZED for base hardware)
    RL_LEARNING_RATE: float = 0.15  # α - faster learning
    RL_DISCOUNT_FACTOR: float = 0.85  # γ - slightly reduced for speed
    RL_EPSILON: float = 0.10  # More exploitation, less exploration
    RL_MAX_ITERATIONS: int = 250  # Reduced from 500 (50% faster)
    RL_CONVERGENCE_THRESHOLD: float = 0.05  # Less strict convergence (faster)
    Q_TABLE_PATH: str = str(backend_dir / "fastapi" / "q_table.pkl")
    
    # Optimization Features (NEW)
    ENABLE_EARLY_TERMINATION: bool = True
    QUALITY_THRESHOLD: float = 0.80  # Stop at 80% optimal
    NO_IMPROVEMENT_LIMIT: int = 8  # Stop after 8 generations without improvement
    ENABLE_CONSTRAINT_CACHE: bool = True
    CACHE_SIZE: int = 1000  # LRU cache size
    USE_GREEDY_INITIAL: bool = True
    GREEDY_TIMEOUT: int = 10  # 10 seconds for greedy solution
    LAZY_LOAD_STUDENTS: bool = True
    PARALLEL_DATA_LOADING: bool = True

    # Multi-Dimensional Context Engine
    CONTEXT_ENGINE_ENABLED: bool = True
    CONTEXT_LEARNING_PATH: str = str(backend_dir / "fastapi" / "context_learning.json")

    # Context Dimension Weights (how much each dimension influences decisions)
    CONTEXT_TEMPORAL_WEIGHT: float = 0.25    # Time-of-day effectiveness
    CONTEXT_BEHAVIORAL_WEIGHT: float = 0.25  # Historical patterns
    CONTEXT_ACADEMIC_WEIGHT: float = 0.20    # Curricular coherence
    CONTEXT_SOCIAL_WEIGHT: float = 0.15      # Peer group cohesion
    CONTEXT_SPATIAL_WEIGHT: float = 0.15     # Room and travel optimization

    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    SENTRY_DSN: str = os.getenv("SENTRY_DSN", "")
    SENTRY_ENVIRONMENT: str = os.getenv("SENTRY_ENVIRONMENT", "development")


settings = Settings()
