"""
PDF Text Extraction Service using PyMuPDF.
Extracts text page by page, tracking page numbers, word/character metrics,
and detects pages with no selectable text to flag for Phase 8 OCR fallback.
"""

import logging
from typing import Tuple
from fastapi import HTTPException, status

try:
    import pymupdf as fitz
except ImportError:
    import fitz  # Fallback for older PyMuPDF versions

from app.models.document import (
    PageExtraction,
    DocumentExtractionSummary,
    PDFExtractionResponse,
)

logger = logging.getLogger("quivers.pdf_extractor")


def format_bytes(size: int) -> str:
    """Formats byte counts into human-readable strings (KB / MB)."""
    if size < 1024:
        return f"{size} B"
    elif size < 1024 * 1024:
        return f"{size / 1024:.1f} KB"
    else:
        return f"{size / (1024 * 1024):.2f} MB"


def extract_text_from_pdf_bytes(
    file_bytes: bytes, filename: str
) -> PDFExtractionResponse:
    """
    Extracts text page by page from raw PDF bytes using PyMuPDF.

    Args:
        file_bytes: Raw bytes of the uploaded PDF file.
        filename: Name of the uploaded file for metadata tracking.

    Returns:
        PDFExtractionResponse: Structured per-page text and summary metadata.

    Raises:
        HTTPException: If the file is not a valid PDF or is password-protected.
    """
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded PDF file is empty.",
        )

    # Magic byte check: Valid PDFs must start with %PDF
    if not file_bytes.startswith(b"%PDF"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid PDF file. The document does not have a valid PDF header signature.",
        )

    doc = None
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as exc:
        logger.error("Failed to parse PDF document '%s': %s", filename, str(exc))
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unable to read PDF file '{filename}'. The file may be corrupt or formatted improperly.",
        )

    try:
        # Check if PDF is encrypted / password-protected
        if doc.is_encrypted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"The PDF '{filename}' is password-protected. Please upload an unlocked PDF.",
            )

        total_pages = len(doc)
        if total_pages == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"The PDF '{filename}' contains 0 pages.",
            )

        pages: list[PageExtraction] = []
        total_chars = 0
        total_words = 0
        selectable_count = 0
        scanned_count = 0

        for page_index in range(total_pages):
            page = doc[page_index]
            page_num = page_index + 1  # 1-indexed

            # Extract digital text
            raw_text = page.get_text("text")
            cleaned_text = raw_text.strip()

            char_count = len(cleaned_text)
            word_count = len(cleaned_text.split()) if char_count > 0 else 0

            # Detect whether page has selectable text
            # A page with 0 selectable characters is considered image-only / scanned
            if char_count == 0:
                is_scanned = True
                flag_reason = "No selectable digital text detected on this page. Scanned or image-only content flagged for Phase 8 OCR fallback."
                scanned_count += 1
            else:
                is_scanned = False
                flag_reason = None
                selectable_count += 1

            total_chars += char_count
            total_words += word_count

            pages.append(
                PageExtraction(
                    page_number=page_num,
                    text=cleaned_text,
                    character_count=char_count,
                    word_count=word_count,
                    has_selectable_text=not is_scanned,
                    is_flagged_for_ocr=is_scanned,
                    flag_reason=flag_reason,
                )
            )

        summary = DocumentExtractionSummary(
            filename=filename,
            file_size_bytes=len(file_bytes),
            file_size_formatted=format_bytes(len(file_bytes)),
            total_pages=total_pages,
            total_characters=total_chars,
            total_words=total_words,
            selectable_pages_count=selectable_count,
            scanned_pages_count=scanned_count,
            is_fully_digital=(scanned_count == 0),
        )

        logger.info(
            "Extracted PDF '%s': %d pages, %d words, %d scanned pages flagged",
            filename,
            total_pages,
            total_words,
            scanned_count,
        )

        return PDFExtractionResponse(
            success=True,
            message=f"Successfully extracted {total_pages} page(s) from '{filename}'.",
            summary=summary,
            pages=pages,
        )

    finally:
        if doc is not None:
            doc.close()
