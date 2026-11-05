"""
Document and Text Extraction Data Models for Quivers.
Includes page-by-page extraction, smart semantic chunking, and metadata summaries.
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
    ocr_applied: bool = Field(default=False, description="True if Tesseract OCR was executed on this page")
    ocr_method: Optional[str] = Field(default=None, description="Engine used e.g. 'pymupdf-tesseract' or 'pytesseract'")


class TextChunk(BaseModel):
    """
    Semantic chunk bounded by headings or page groups, with precise page range tracking.
    """
    chunk_index: int = Field(description="1-based index of the chunk in the document")
    heading: Optional[str] = Field(default=None, description="Detected section heading or topic title")
    content: str = Field(description="Clean text content of this chunk")
    start_page: int = Field(description="Starting page number (1-indexed)")
    end_page: int = Field(description="Ending page number (1-indexed)")
    page_range: str = Field(description="Human-readable page range e.g. 'Page 3' or 'Pages 3–5'")
    word_count: int = Field(description="Total word count in chunk")
    character_count: int = Field(description="Total character count in chunk")
    chunk_strategy: str = Field(default="heading", description="'heading', 'topic', or 'page_group'")


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
    total_chunks: int = 0
    chunk_strategy: str = "heading"
    ocr_pages_processed: int = 0
    ocr_engine: Optional[str] = None


class PDFExtractionResponse(BaseModel):
    """
    Complete response returned by the PDF extraction endpoint.
    """
    success: bool = True
    message: str = "PDF text extracted and chunked successfully"
    summary: DocumentExtractionSummary
    pages: List[PageExtraction]
    chunks: List[TextChunk] = Field(
        default_factory=list,
        description="Smart topic and heading-based chunks with source page ranges",
    )
    total_chunks: int = Field(default=0, description="Total number of chunks created")
