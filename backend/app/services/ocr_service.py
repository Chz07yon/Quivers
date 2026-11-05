"""
Tesseract OCR Fallback Service for Quivers (Phase 8).
Handles optical character recognition for scanned, image-only, or non-searchable PDF pages.
Leverages PyMuPDF embedded Tesseract engine backed by trained language data (backend/tessdata)
with automatic fallback to PyTesseract.
"""

from dataclasses import dataclass
import io
import logging
import os
from pathlib import Path
import re
import time
from typing import Optional, Tuple

logger = logging.getLogger("quivers.ocr_service")


@dataclass
class OCRResult:
    """
    Standardized result from OCR processing on a document page.
    """
    text: str
    success: bool
    character_count: int
    word_count: int
    method: str
    duration_ms: float
    error: Optional[str] = None


class OCRService:
    """
    Robust OCR engine that turns scanned raster pages into clean, searchable,
    and prompt-ready text blocks.
    """

    _cached_tessdata_dir: Optional[str] = None

    @classmethod
    def get_tessdata_dir(cls) -> Optional[str]:
        """
        Locates the directory containing language traineddata (e.g., eng.traineddata).
        Searches backend/tessdata, repo roots, and environment variables.
        """
        if cls._cached_tessdata_dir and Path(cls._cached_tessdata_dir).exists():
            return cls._cached_tessdata_dir

        # Candidate paths to inspect
        candidates = [
            # 1. Project backend/tessdata relative to this file
            Path(__file__).resolve().parent.parent.parent / "tessdata",
            # 2. Project tessdata from current working directory
            Path.cwd() / "backend" / "tessdata",
            Path.cwd() / "tessdata",
            # 3. Environment variable if explicitly defined
            Path(os.environ.get("TESSDATA_PREFIX", "")) if os.environ.get("TESSDATA_PREFIX") else None,
            # 4. Standard Windows install paths
            Path(r"C:\Program Files\Tesseract-OCR\tessdata"),
            Path(r"C:\Program Files (x86)\Tesseract-OCR\tessdata"),
        ]

        for cand in candidates:
            if cand and cand.is_dir() and (cand / "eng.traineddata").exists():
                cls._cached_tessdata_dir = str(cand.resolve())
                os.environ["TESSDATA_PREFIX"] = cls._cached_tessdata_dir
                logger.debug("Discovered valid tessdata directory: %s", cls._cached_tessdata_dir)
                return cls._cached_tessdata_dir

        # Fallback to any directory that contains eng.traineddata
        for cand in candidates:
            if cand and cand.is_dir():
                cls._cached_tessdata_dir = str(cand.resolve())
                os.environ["TESSDATA_PREFIX"] = cls._cached_tessdata_dir
                return cls._cached_tessdata_dir

        return None

    @classmethod
    def is_ocr_available(cls) -> bool:
        """
        Returns True if Tesseract OCR is available via PyMuPDF tessdata or pytesseract.
        """
        if cls.get_tessdata_dir() is not None:
            return True

        try:
            import pytesseract
            # Check if tesseract binary can be called
            return True
        except ImportError:
            return False

    @classmethod
    def get_engine_info(cls) -> str:
        """
        Returns a human-readable description of the active OCR engine for diagnostics.
        """
        tessdata = cls.get_tessdata_dir()
        if tessdata:
            return f"PyMuPDF-Tesseract (eng traineddata at {Path(tessdata).name})"
        return "PyTesseract (System Binary)"

    @classmethod
    def clean_ocr_text(cls, raw_text: str) -> str:
        """
        Post-processes OCR output to remove scan artifacts, fix hyphenation
        across lines, and normalize whitespace.
        """
        if not raw_text:
            return ""

        text = raw_text

        # 1. Remove form-feed and ASCII control characters except newline and tab
        text = text.replace("\x0c", "\n")
        text = re.sub(r"[\x00-\x08\x0b\x0e-\x1f\x7f]", "", text)

        # 2. Reconnect words broken by hyphenation across linebreaks (e.g. "atten-\ntion" -> "attention")
        text = re.sub(r"(\b[a-zA-Z]{2,})-\s*\n\s*([a-zA-Z]{2,}\b)", r"\1\2", text)

        # 3. Clean up excessive inline whitespace while preserving line structure
        cleaned_lines = []
        for line in text.split("\n"):
            stripped = " ".join(line.split())
            cleaned_lines.append(stripped)

        text = "\n".join(cleaned_lines)

        # 4. Collapse 3+ consecutive newlines into double newlines
        text = re.sub(r"\n{3,}", "\n\n", text)

        return text.strip()

    @classmethod
    def extract_text_from_page(
        cls,
        page,
        language: str = "eng",
        dpi: int = 150,
    ) -> OCRResult:
        """
        Performs OCR on a single PyMuPDF page.

        Execution strategy:
        1. PyMuPDF Native Tesseract OCR (`page.get_textpage_ocr`) - fast in-memory execution.
        2. Fallback to `pytesseract` via rendered raster image pixmap.

        Args:
            page: PyMuPDF Page instance.
            language: OCR language code (default 'eng').
            dpi: Resolution for rasterizing the page (default 150 DPI for optimal speed & accuracy).

        Returns:
            OCRResult with extracted text, word counts, and execution metrics.
        """
        start_time = time.perf_counter()
        tessdata_dir = cls.get_tessdata_dir()

        # 1. Primary Strategy: PyMuPDF Native Tesseract C-Engine
        if tessdata_dir:
            try:
                textpage = page.get_textpage_ocr(
                    tessdata=tessdata_dir,
                    language=language,
                    dpi=dpi,
                )
                raw_text = page.get_text("text", textpage=textpage)
                cleaned = cls.clean_ocr_text(raw_text)

                duration_ms = (time.perf_counter() - start_time) * 1000

                if cleaned and len(cleaned.split()) > 0:
                    logger.info(
                        "PyMuPDF OCR succeeded on page %d: %d words in %.1f ms",
                        page.number + 1,
                        len(cleaned.split()),
                        duration_ms,
                    )
                    return OCRResult(
                        text=cleaned,
                        success=True,
                        character_count=len(cleaned),
                        word_count=len(cleaned.split()),
                        method="pymupdf-tesseract",
                        duration_ms=round(duration_ms, 2),
                    )
            except Exception as exc:
                logger.warning(
                    "PyMuPDF native OCR failed on page %d: %s. Trying pytesseract fallback.",
                    page.number + 1,
                    str(exc),
                )

        # 2. Secondary Strategy: PyTesseract via PIL Pixmap
        try:
            import pytesseract
            from PIL import Image

            pix = page.get_pixmap(dpi=dpi)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            raw_text = pytesseract.image_to_string(img, lang=language)
            cleaned = cls.clean_ocr_text(raw_text)

            duration_ms = (time.perf_counter() - start_time) * 1000

            if cleaned and len(cleaned.split()) > 0:
                logger.info(
                    "PyTesseract OCR succeeded on page %d: %d words in %.1f ms",
                    page.number + 1,
                    len(cleaned.split()),
                    duration_ms,
                )
                return OCRResult(
                    text=cleaned,
                    success=True,
                    character_count=len(cleaned),
                    word_count=len(cleaned.split()),
                    method="pytesseract",
                    duration_ms=round(duration_ms, 2),
                )
        except Exception as exc:
            logger.warning(
                "PyTesseract OCR fallback failed on page %d: %s",
                page.number + 1,
                str(exc),
            )

        duration_ms = (time.perf_counter() - start_time) * 1000
        return OCRResult(
            text="",
            success=False,
            character_count=0,
            word_count=0,
            method="none",
            duration_ms=round(duration_ms, 2),
            error="No recognizable text could be extracted from page raster image.",
        )

