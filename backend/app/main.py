"""
Quivers FastAPI Backend Application
Main initialization, CORS policy, global exception handling, and routing.
"""

from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.config import get_settings
from app.api.health import router as health_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("quivers.backend")

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle management."""
    logger.info("Initializing Quivers Backend Service (Phase 1: Project Setup)...")
    logger.info("Allowed CORS Origins: %s", settings.CORS_ORIGINS)
    logger.info("Environment: %s", settings.ENVIRONMENT)
    yield
    logger.info("Shutting down Quivers Backend Service.")


app = FastAPI(
    title=f"{settings.PROJECT_NAME} API",
    description="Backend API powering Quivers: turns uploaded PDFs into interactive, source-grounded quizzes.",
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Configuration
# Ensures the Next.js frontend (http://localhost:3000) can make API calls smoothly
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# Friendly Validation Error Handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Transforms raw Pydantic validation errors into readable, user-friendly responses."""
    errors = []
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err["loc"] if loc != "body")
        errors.append(f"{field}: {err['msg']}")

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error_type": "ValidationError",
            "message": "The submitted data was incomplete or invalid.",
            "details": errors,
        },
    )


# Generic Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catches unexpected exceptions and formats clean error message without leaking trace."""
    logger.error("Unhandled exception processing request to %s: %s", request.url.path, str(exc), exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error_type": "InternalServerError",
            "message": "An unexpected error occurred while processing your request. Please try again.",
        },
    )


# Include Routers
app.include_router(health_router)


@app.get("/", tags=["Root"])
async def root():
    """Welcome endpoint with direct links to documentation and healthcheck."""
    return {
        "project": "Quivers",
        "tagline": "Turn any PDF into a quiz",
        "docs": "/docs",
        "health": "/health",
        "version": settings.VERSION,
    }
