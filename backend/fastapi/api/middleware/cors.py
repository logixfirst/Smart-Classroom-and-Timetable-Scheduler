"""
CORS Middleware Configuration
Follows industry standards for API security
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

logger = logging.getLogger(__name__)


def setup_cors(app: FastAPI):
    """
    Configure CORS middleware for FastAPI app.
    
    Allows cross-origin requests from frontend applications.
    In production, restrict origins to specific domains.
    """
    origins = [
        "http://localhost:3000",  # Next.js dev
        "http://localhost:8000",  # Django dev
        "http://127.0.0.1:3000",
        "https://sih28.onrender.com",  # Production
        # Add your production domains here
    ]
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    logger.debug(f"CORS configured with {len(origins)} allowed origins")
