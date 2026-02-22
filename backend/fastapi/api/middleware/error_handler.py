"""
Error Handler Middleware
Centralized error handling following industry best practices
"""
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import logging
import traceback
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """
    Global error handler middleware.
    
    Catches all unhandled exceptions and returns consistent error responses.
    Logs errors with full stack traces for debugging.
    """
    
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
            
        except HTTPException as e:
            # FastAPI HTTPException - pass through
            raise e
            
        except Exception as e:
            # Unhandled exception - log and return 500
            error_id = datetime.now(timezone.utc).isoformat()
            
            logger.error(f"Unhandled error [{error_id}]: {str(e)}")
            logger.error(traceback.format_exc())
            
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "error": "Internal server error",
                    "message": str(e),
                    "error_id": error_id,
                    "timestamp": error_id
                }
            )


def setup_error_handler(app):
    """Add error handler middleware to FastAPI app"""
    app.add_middleware(ErrorHandlerMiddleware)
