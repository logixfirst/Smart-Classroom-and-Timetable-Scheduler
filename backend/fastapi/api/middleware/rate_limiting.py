"""
Rate Limiting Middleware
Protects API endpoints from excessive requests
"""
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, Response
from engine.rate_limiter import rate_limiter
import logging

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware that applies rate limiting to all incoming requests.
    Uses client IP address as the rate limit key.
    """
    
    async def dispatch(self, request: Request, call_next):
        """
        Process each request through rate limiter.
        
        Args:
            request: Incoming HTTP request
            call_next: Next middleware/endpoint in chain
            
        Returns:
            Response with 429 status if rate limit exceeded
        """
        # Get client identifier (IP address)
        client_ip = request.client.host if request.client else "unknown"
        
        try:
            # Check rate limit (raises HTTPException if exceeded)
            rate_limiter.check_rate_limit(client_ip)
            
            # Process request
            response = await call_next(request)
            return response
            
        except Exception as e:
            # Rate limit exceeded - return 429
            logger.warning(f"Rate limit exceeded for client {client_ip}: {str(e)}")
            return Response(
                content=f"Rate limit exceeded. Please try again later.",
                status_code=429,
                media_type="text/plain"
            )


def setup_rate_limiting(app):
    """
    Setup rate limiting middleware for FastAPI app.
    
    Usage:
        from api.middleware.rate_limiting import setup_rate_limiting
        setup_rate_limiting(app)
    
    Args:
        app: FastAPI application instance
    """
    app.add_middleware(RateLimitMiddleware)
