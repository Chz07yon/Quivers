"""
Document Upload and Extraction API Router.
Handles multipart PDF file uploads, size validation (10 MB limit),
and invokes PyMuPDF to extract per-page text with OCR candidate detection.
"""

import logging
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from app.config import Settings, get_settings
from app.models.document import PDFExtractionResponse
from app.services.pdf_extractor import extract_text_from_pdf_bytes

logger = logging.getLogger("quivers.api.documents")
router = APIRouter(prefix="/api/documents", tags=["Documents"])


@router.post(
    "/extract",
    response_model=PDFExtractionResponse,
    summary="Extract structured per-page text from uploaded PDF",
    description=(
        "Uploads a PDF document (up to 10 MB), validates PDF format, "
        "and extracts text page-by-page using PyMuPDF while flagging pages "
        "with no selectable text for Phase 8 OCR fallback."
    ),
)
async def extract_pdf_document(
    file: UploadFile = File(..., description="PDF document file (max 10 MB)"),
    settings: Settings = Depends(get_settings),
) -> PDFExtractionResponse:
    """
    Validates PDF upload and returns structured per-page text.
    """
    # 1. Filename validation
    filename = file.filename or "uploaded_document.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file extension for '{filename}'. Only PDF files (.pdf) are accepted.",
        )

    # 2. Content-Type check (allow standard PDF MIME types or octet-stream with .pdf)
    valid_content_types = [
        "application/pdf",
        "application/x-pdf",
        "application/acrobat",
        "applications/vnd.pdf",
        "text/pdf",
        "text/x-pdf",
        "application/octet-stream",  # Browsers sometimes send generic octet-stream for PDFs
    ]
    if file.content_type and file.content_type.lower() not in valid_content_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid file type '{file.content_type}'. "
                "Quivers exclusively processes PDF documents. Please upload a .pdf file."
            ),
        )

    # 3. Size validation: Read up to MAX_UPLOAD_SIZE_MB + 1 byte
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    contents = await file.read()
    file_size = len(contents)

    if file_size > max_bytes:
        size_mb = file_size / (1024 * 1024)
        raise HTTPException(
            status_code=413,
            detail=(
                f"File size ({size_mb:.2f} MB) exceeds the strict 10 MB limit. "
                "Please upload a PDF document under 10 MB."
            ),
        )

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded PDF file is empty (0 bytes).",
        )

    # 4. Extract text per page with PyMuPDF
    result = extract_text_from_pdf_bytes(contents, filename)
    return result
