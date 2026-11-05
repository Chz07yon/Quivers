"""
Document Upload and Extraction API Router.
Handles multipart PDF file uploads, size validation (10 MB limit),
and invokes PyMuPDF to extract per-page text with OCR candidate detection.
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from supabase import Client
from app.config import Settings, get_settings
from app.core.auth import AuthenticatedUser, get_current_user, get_supabase_client
from app.models.document import PageExtraction, PDFExtractionResponse, TextChunk
from app.models.storage import SaveDocumentRequest, DocumentRecord
from app.services.storage_service import StorageService
from app.services.pdf_extractor import extract_text_from_pdf_bytes
from app.services.chunker import smart_chunk_document

logger = logging.getLogger("quivers.api.documents")
router = APIRouter(prefix="/api/documents", tags=["Documents"])


class ChunkRequest(BaseModel):
    pages: List[PageExtraction]
    max_chunk_words: int = Field(default=750, ge=100, le=3000)


@router.post(
    "/chunk",
    response_model=List[TextChunk],
    summary="Chunk pages by headings or page groups (Smart Chunking)",
    description="Splits structured pages into semantic chunks by headings, falling back to page groups, preserving source page ranges.",
)
async def chunk_pages_endpoint(request: ChunkRequest) -> List[TextChunk]:
    return smart_chunk_document(request.pages, max_chunk_words=request.max_chunk_words)


@router.post(
    "/save",
    response_model=DocumentRecord,
    summary="Save an extracted document and chunks for authenticated user (Protected)",
    description="Persists document metadata and text chunks linked to the caller's verified user ID.",
)
async def save_document_endpoint(
    request: SaveDocumentRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    supabase: Optional[Client] = Depends(get_supabase_client),
) -> DocumentRecord:
    return StorageService.save_document(
        user_id=user.id,
        data=request,
        supabase=supabase,
    )


@router.get(
    "",
    summary="List caller's uploaded documents (Protected)",
    description="Returns all documents owned by the authenticated caller. User ID is derived exclusively from verified JWT.",
)
async def list_user_documents(
    user: AuthenticatedUser = Depends(get_current_user),
    supabase: Optional[Client] = Depends(get_supabase_client),
):
    """
    Demonstrates RLS and user isolation: caller can only see rows where user_id == user.id.
    User ID is never accepted in request query or body.
    """
    if supabase is not None:
        try:
            response = (
                supabase.table("documents")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", desc=True)
                .execute()
            )
            if response.data:
                return {
                    "documents": response.data,
                    "count": len(response.data),
                    "user_id": user.id,
                }
        except Exception as e:
            logger.warning("Error querying Supabase documents for user %s: %s. Using local store.", user.id, str(e))

    from app.services.storage_service import _get_user_store
    store = _get_user_store(user.id)
    return {
        "documents": store["documents"],
        "count": len(store["documents"]),
        "user_id": user.id,
    }


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
