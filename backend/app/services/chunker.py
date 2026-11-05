"""
Smart Document Chunking Service for Quivers.
Splits extracted document text into semantic chunks by headings, section titles,
or topic boundaries, falling back to page groups when structured headings are absent.
Guarantees every chunk retains its exact starting and ending page range for source citations.
"""

import re
import logging
from typing import List, Optional, Tuple
from app.models.document import PageExtraction, TextChunk

logger = logging.getLogger("quivers.chunker")

# Regex patterns for detecting structured headings and sections
HEADING_PATTERNS = [
    # Markdown style headings: # Heading, ## Section
    re.compile(r"^(#{1,6})\s+(.+)$"),
    # Numbered sections: 1. Introduction, 1.2 System Architecture, Section 3: Methods
    re.compile(
        r"^(?:section|chapter|part|module|unit)?\s*(\d+(?:\.\d+)*)[:.]?\s+([A-Z0-9].+)$",
        re.IGNORECASE,
    ),
    # Roman numerals: I. Introduction, IV. Experimental Results
    re.compile(r"^([IVXLCDM]+)[:.]\s+([A-Z].+)$"),
    # Standard academic & textbook section names standalone
    re.compile(
        r"^(abstract|introduction|background|literature review|related work|architecture|"
        r"methodology|methods|system design|implementation|experiments|evaluation|results|"
        r"discussion|conclusion|conclusions|future work|summary|references|appendix|"
        r"overview|problem formulation|prerequisites)\b[:.]?$",
        re.IGNORECASE,
    ),
]


def format_page_range(start_page: int, end_page: int) -> str:
    """Formats 1-indexed page bounds into a clean citation string."""
    if start_page == end_page:
        return f"Page {start_page}"
    return f"Pages {start_page}-{end_page}"


def detect_heading(line: str) -> Optional[str]:
    """
    Determines if a text line represents a section heading or topic boundary.
    Returns clean heading text if detected, otherwise None.
    """
    clean = line.strip()
    if not clean or len(clean) > 85:
        return None

    # Check against known regex patterns
    for pattern in HEADING_PATTERNS:
        if pattern.match(clean):
            # Strip leading markdown hashes if present
            return re.sub(r"^#{1,6}\s+", "", clean).strip()

    # Heuristic: Short line (1-8 words) entirely in UPPERCASE or Title Case without trailing sentence punctuation
    words = clean.split()
    if (
        1 <= len(words) <= 8
        and (clean.isupper() or clean.istitle())
        and not clean.endswith((".", ",", ";", ":", "-", "?", "!"))
    ):
        if not clean.isdigit() and len(clean) > 2:
            return clean

    return None


def split_text_into_blocks(pages: List[PageExtraction]) -> List[Tuple[str, int, Optional[str]]]:
    """
    Parses pages into discrete semantic blocks, detecting headings on lines,
    and associating each block with its source page number.
    """
    blocks: List[Tuple[str, int, Optional[str]]] = []

    for page in pages:
        if not page.has_selectable_text or not page.text.strip():
            continue

        # Split into paragraph chunks by double newlines or single newlines
        raw_paras = [p.strip() for p in re.split(r"\n\s*\n", page.text) if p.strip()]

        for para in raw_paras:
            lines = [l.strip() for l in para.split("\n") if l.strip()]
            if not lines:
                continue

            # Check if first line is a heading
            first_line_heading = detect_heading(lines[0])
            if first_line_heading:
                # Add heading as its own marker block
                blocks.append((lines[0], page.page_number, first_line_heading))
                # If there are remaining lines in the paragraph, add them as body
                if len(lines) > 1:
                    body = "\n".join(lines[1:]).strip()
                    if body:
                        blocks.append((body, page.page_number, None))
            else:
                blocks.append((para, page.page_number, None))

    return blocks


def smart_chunk_document(
    pages: List[PageExtraction],
    max_chunk_words: int = 750,
) -> List[TextChunk]:
    """
    Splits extracted document pages into semantic chunks:
    1. Splits by detected headings / section boundaries.
    2. Falls back to page groups when headings are sparse (< 2 detected).
    3. Respects max_chunk_words so no chunk exceeds LLM context limits.
    4. Guarantees every chunk retains its accurate starting & ending page range.
    """
    blocks = split_text_into_blocks(pages)
    if not blocks:
        return []

    # Count total distinct headings in the document
    heading_count = sum(1 for _, _, h in blocks if h is not None)
    use_heading_strategy = heading_count >= 2

    chunks: List[TextChunk] = []

    if use_heading_strategy:
        strategy = "heading"
        current_heading: Optional[str] = None
        current_texts: List[str] = []
        current_pages: List[int] = []
        current_word_count = 0

        def flush_heading_chunk():
            nonlocal current_texts, current_pages, current_word_count, current_heading
            if not current_texts:
                return

            chunk_text = "\n\n".join(current_texts).strip()
            if not chunk_text:
                return

            start_page = min(current_pages)
            end_page = max(current_pages)
            heading_title = current_heading or f"Section ({format_page_range(start_page, end_page)})"

            chunks.append(
                TextChunk(
                    chunk_index=len(chunks) + 1,
                    heading=heading_title,
                    content=chunk_text,
                    start_page=start_page,
                    end_page=end_page,
                    page_range=format_page_range(start_page, end_page),
                    word_count=len(chunk_text.split()),
                    character_count=len(chunk_text),
                    chunk_strategy=strategy,
                )
            )
            current_texts = []
            current_pages = []
            current_word_count = 0

        for text, page_num, heading in blocks:
            words = len(text.split())

            # If a new heading is encountered
            if heading:
                # If we already have accumulated text from previous heading, flush it
                if current_texts:
                    flush_heading_chunk()
                current_heading = heading
                current_texts.append(text)
                current_pages.append(page_num)
                current_word_count += words
                continue

            # Check if adding this text exceeds max_chunk_words
            if current_word_count + words > max_chunk_words and current_texts:
                prev_heading = current_heading
                flush_heading_chunk()
                # Continue under same heading label
                if prev_heading:
                    current_heading = f"{prev_heading} (Cont.)"

            current_texts.append(text)
            current_pages.append(page_num)
            current_word_count += words

        flush_heading_chunk()

    # Fallback Strategy: Page Groups
    if not use_heading_strategy or not chunks:
        strategy = "page_group"
        chunks = []
        current_texts = []
        current_pages = []
        current_word_count = 0

        def flush_page_group_chunk():
            nonlocal current_texts, current_pages, current_word_count
            if not current_texts:
                return

            chunk_text = "\n\n".join(current_texts).strip()
            if not chunk_text:
                return

            start_page = min(current_pages)
            end_page = max(current_pages)
            range_label = format_page_range(start_page, end_page)

            chunks.append(
                TextChunk(
                    chunk_index=len(chunks) + 1,
                    heading=f"{range_label} Topic Overview",
                    content=chunk_text,
                    start_page=start_page,
                    end_page=end_page,
                    page_range=range_label,
                    word_count=len(chunk_text.split()),
                    character_count=len(chunk_text),
                    chunk_strategy=strategy,
                )
            )
            current_texts = []
            current_pages = []
            current_word_count = 0

        for text, page_num, _ in blocks:
            words = len(text.split())

            if current_word_count + words > max_chunk_words and current_texts:
                flush_page_group_chunk()

            current_texts.append(text)
            current_pages.append(page_num)
            current_word_count += words

        flush_page_group_chunk()

    # Final pass to ensure 1-based sequential indexing
    for idx, chunk in enumerate(chunks, start=1):
        chunk.chunk_index = idx

    logger.info(
        "Smart chunking generated %d chunks using strategy '%s' (max %d words)",
        len(chunks),
        chunks[0].chunk_strategy if chunks else "none",
        max_chunk_words,
    )
    return chunks
