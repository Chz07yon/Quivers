"""
Document and Text Extraction Data Models for Quivers.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class PageExtraction(BaseModel):
    """
    Structured text extraction for an individual page in a document.
    """
    page_number: int = Field(description="1-indexed page number")
    text: str = Field(description="Extracted clean text content of the page")
    character_count: int = Field(description="Total characters extracted on this page")
    word_count: int = Field(description="Total words extracted on this page")
    has_selectable_text: bool = Field(description="Whether selectable digital text was found")
    is_flagged_for_ocr: bool = Field(description="True if page appears scanned or empty, flagging for Phase 8 OCR")
    flag_reason: Optional[str] = Field(default=None, description="Explanation when page is flagged for OCR")


class DocumentExtractionSummary(BaseModel):
    """
    Summary metrics for the extracted document.
    """
    filename: str
    file_size_bytes: int
    file_size_formatted: str
    total_pages: int
    total_characters: int
    total_words: int
    selectable_pages_count: int
    scanned_pages_count: int
    is_fully_digital: bool


class PDFExtractionResponse(BaseModel):
    """
    Complete response returned by the PDF extraction endpoint.
    """
    success: bool = True
    message: str = "PDF text extracted successfully"
    summary: DocumentExtractionSummary
    pages: List[PageExtraction]
