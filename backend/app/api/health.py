"""
Health Check and Service Diagnostics Endpoint.
Enables frontend pre-flight verification, monitoring, and viva demonstration.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from app.config import Settings, get_settings

router = APIRouter(tags=["Health"])


@router.get("/health")
@router.get("/api/health")
async def health_check(settings: Settings = Depends(get_settings)):
    """
    Returns system status, environment metadata, and service readiness checks.
    """
    # Check PyMuPDF availability
    pymupdf_status = "unavailable"
    try:
        import fitz  # PyMuPDF
        pymupdf_status = f"available (v{fitz.__doc__.split()[1] if fitz.__doc__ else 'ready'})"
    except Exception:
        pymupdf_status = "not_installed"

    # Check Tesseract availability
    tesseract_status = "unconfigured"
    try:
        import pytesseract
        tesseract_status = "library_installed"
    except Exception:
        tesseract_status = "not_installed"

    # Check Claude API configuration
    claude_status = "configured" if settings.ANTHROPIC_API_KEY else "pending_key (set in .env)"

    # Check Supabase configuration
    supabase_status = "configured" if (settings.SUPABASE_URL and settings.SUPABASE_KEY) else "pending_key (set in .env)"

    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "motifs": {
            "arrow": "each arrow is an individual question",
            "quiver": "the quiver holds the whole set generated from a document",
            "bullseye": "source-grounded correct answer with page citation",
            "my_quiver": "saved-quizzes workspace",
        },
        "services": {
            "claude_llm": claude_status,
            "supabase_db": supabase_status,
            "pymupdf_engine": pymupdf_status,
            "tesseract_ocr": tesseract_status,
        },
    }
