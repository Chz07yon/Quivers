"""
Phase 8 Scanned PDF & Tesseract OCR Verification Test Suite.
Generates a 100% scanned PDF (raster bitmap pages with zero selectable digital text),
executes the Phase 8 OCR fallback pipeline, confirms text and chunk recovery,
and proves that a usable, grounded quiz is produced from the scanned document.
"""

import io
import sys
from pathlib import Path
import pymupdf
from PIL import Image, ImageDraw, ImageFont

# Ensure backend root is on sys.path
backend_root = Path(__file__).resolve().parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from app.models.document import PDFExtractionResponse
from app.models.question import QuestionGenerationConfig
from app.services.ocr_service import OCRService
from app.services.pdf_extractor import extract_text_from_pdf_bytes
from app.services.question_generator import generate_questions_for_chunks


def create_scanned_pdf_bytes() -> bytes:
    """
    Creates a 2-page PDF document that has NO digital text streams.
    Both pages contain only rasterized images of text (simulating real scanned documents).
    """
    doc = pymupdf.open()

    # --- Page 1: Scanned image of Chapter 1 ---
    img1 = Image.new("RGB", (900, 500), color="white")
    draw1 = ImageDraw.Draw(img1)
    # Draw title heading
    draw1.text((50, 40), "Chapter 1: Multi-Head Attention Mechanism", fill="black")
    draw1.text((50, 90), "In the Transformer architecture, attention allows models to focus on relevant tokens.", fill="black")
    draw1.text((50, 130), "Instead of performing a single attention function, Multi-Head Attention projects queries,", fill="black")
    draw1.text((50, 170), "keys, and values h times with different learned linear projections to dk, dk, and dv dimensions.", fill="black")
    draw1.text((50, 210), "This enables the neural network to jointly attend to information from different representation subspaces.", fill="black")
    draw1.text((50, 250), "Attention formula: Attention(Q, K, V) = softmax(Q * K^T / sqrt(d_k)) * V.", fill="black")

    buf1 = io.BytesIO()
    img1.save(buf1, format="PNG")

    page1 = doc.new_page(width=900, height=500)
    page1.insert_image(pymupdf.Rect(0, 0, 900, 500), stream=buf1.getvalue())

    # --- Page 2: Scanned image of Chapter 2 ---
    img2 = Image.new("RGB", (900, 500), color="white")
    draw2 = ImageDraw.Draw(img2)
    draw2.text((50, 40), "Chapter 2: Positional Encoding in Transformers", fill="black")
    draw2.text((50, 90), "Since Transformer models contain no recurrence and no convolution, they cannot naturally order words.", fill="black")
    draw2.text((50, 130), "To make use of sequence order, positional information must be injected into input embeddings.", fill="black")
    draw2.text((50, 170), "The authors use sine and cosine functions of different frequencies to encode positional coordinates.", fill="black")
    draw2.text((50, 210), "The positional encodings have the exact same dimension d_model as the token embeddings.", fill="black")
    draw2.text((50, 250), "This allows input embeddings and positional encodings to be summed directly together.", fill="black")

    buf2 = io.BytesIO()
    img2.save(buf2, format="PNG")

    page2 = doc.new_page(width=900, height=500)
    page2.insert_image(pymupdf.Rect(0, 0, 900, 500), stream=buf2.getvalue())

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_phase_8_scanned_pdf():
    print("=" * 70)
    print("PHASE 8: SCANNED PDF & TESSERACT OCR PIPELINE TEST")
    print("=" * 70)

    # 1. Check OCR availability
    print("\n[Step 1] Checking OCR Engine Readiness...")
    is_avail = OCRService.is_ocr_available()
    engine_info = OCRService.get_engine_info()
    tessdata_dir = OCRService.get_tessdata_dir()
    print(f"  OCR Available: {is_avail}")
    print(f"  Engine Info:   {engine_info}")
    print(f"  Tessdata Path: {tessdata_dir}")
    assert is_avail, "OCR engine should be available via backend/tessdata or system Tesseract"

    # 2. Generate scanned PDF bytes
    print("\n[Step 2] Synthesizing 100% Scanned PDF Document (Zero Selectable Text)...")
    scanned_bytes = create_scanned_pdf_bytes()
    print(f"  Scanned PDF generated: {len(scanned_bytes)} bytes")

    # Confirm raw PDF has 0 selectable digital characters before extraction pipeline
    test_doc = pymupdf.open(stream=scanned_bytes, filetype="pdf")
    for i, p in enumerate(test_doc):
        raw_text = p.get_text("text").strip()
        print(f"  Raw PyMuPDF digital text on Page {i+1}: '{raw_text}' (Length: {len(raw_text)})")
        assert len(raw_text) == 0, f"Page {i+1} must be an image with 0 selectable text"
    test_doc.close()

    # 3. Execute Phase 8 Extraction Pipeline
    print("\n[Step 3] Running extract_text_from_pdf_bytes with Phase 8 OCR Fallback...")
    extraction: PDFExtractionResponse = extract_text_from_pdf_bytes(
        file_bytes=scanned_bytes,
        filename="scanned_transformer_lecture.pdf",
    )

    summary = extraction.summary
    print("\n[Extraction Summary Metrics]")
    print(f"  Total Pages:          {summary.total_pages}")
    print(f"  Total Words Recovered:{summary.total_words}")
    print(f"  Total Chars Recovered:{summary.total_characters}")
    print(f"  OCR Pages Processed:  {summary.ocr_pages_processed}")
    print(f"  OCR Engine Used:      {summary.ocr_engine}")
    print(f"  Smart Chunks Formed:  {summary.total_chunks}")
    print(f"  Chunk Strategy:       {summary.chunk_strategy}")

    # Assertions on Extraction & OCR recovery
    assert summary.total_pages == 2, "Expected 2 pages"
    assert summary.ocr_pages_processed == 2, f"Both pages should be OCR processed (got {summary.ocr_pages_processed})"
    assert summary.total_words > 50, f"Expected >50 words recovered via OCR (got {summary.total_words})"
    assert len(extraction.chunks) >= 2, f"Expected at least 2 chunks (got {len(extraction.chunks)})"

    # Verify per-page OCR metadata
    for page in extraction.pages:
        print(f"\n  Page {page.page_number} Details:")
        print(f"    OCR Applied:    {page.ocr_applied}")
        print(f"    OCR Method:     {page.ocr_method}")
        print(f"    Word Count:     {page.word_count}")
        print(f"    Selectable:     {page.has_selectable_text}")
        print(f"    Excerpt:        {page.text[:90]}...")
        assert page.ocr_applied is True, f"Page {page.page_number} must have ocr_applied=True"
        assert page.has_selectable_text is True, f"Page {page.page_number} should now have selectable text"
        assert page.word_count > 15, f"Page {page.page_number} should have recovered words"

    # Verify semantic chunks with page ranges
    print("\n[Step 4] Verifying Semantic Chunks with Preserved Page Ranges...")
    for chunk in extraction.chunks:
        print(f"  Chunk #{chunk.chunk_index}:")
        print(f"    Heading:    '{chunk.heading}'")
        print(f"    Page Range: {chunk.page_range} (Pages {chunk.start_page} to {chunk.end_page})")
        print(f"    Words:      {chunk.word_count}")
        assert chunk.start_page in (1, 2)
        assert chunk.end_page in (1, 2)
        assert len(chunk.content.strip()) > 0

    # 4. Verify Usable Quiz Generation from Scanned Document
    print("\n[Step 5] Generating Usable Quiz from Scanned Document Chunks...")
    config = QuestionGenerationConfig(
        total_questions=4,
        difficulty="medium",
        question_types=["mcq", "true_false", "fill_in_the_blank"],
    )

    quiz_response = generate_questions_for_chunks(
        chunks=extraction.chunks,
        config=config,
    )

    print(f"\n[Generated Quiz Results from Scanned PDF]")
    print(f"  Total Questions Generated: {quiz_response.total_generated}")
    print(f"  Model Used:                {quiz_response.model_used}")
    print(f"  Validation Summary:        {quiz_response.validation_report.summary_verdict if quiz_response.validation_report else 'N/A'}")

    assert quiz_response.total_generated >= 2, f"Expected at least 2 questions generated (got {quiz_response.total_generated})"
    assert len(quiz_response.questions) >= 2

    for q in quiz_response.questions:
        print(f"\n  Arrow #{q.arrow_order} [{q.type.upper()}] (Bloom: {q.bloom_level}):")
        print(f"    Question:       {q.question}")
        print(f"    Options:        {q.options}")
        print(f"    Correct Answer: {q.correct_answer}")
        print(f"    Source Page:    Page {q.source_page}")
        print(f"    Explanation:    {q.explanation}")
        if q.source_passage:
            print(f"    Cited Passage:  '{q.source_passage[:80]}...'")

        # Grounding checks: question must cite valid scanned page 1 or 2
        assert q.source_page in (1, 2), f"Question source page must cite Page 1 or 2 (got {q.source_page})"
        assert len(q.question.strip()) > 10
        assert len(q.correct_answer.strip()) > 0
        assert len(q.explanation.strip()) > 10

    # 5. Check Health Check diagnostics
    print("\n[Step 6] Testing Health Diagnostics Endpoint for Tesseract...")
    from app.api.health import health_check
    from app.config import get_settings

    health = health_check(get_settings())
    tess_status = health["services"]["tesseract_ocr"]
    print(f"  Health Report Tesseract OCR: {tess_status}")
    assert "available" in tess_status.lower(), f"Tesseract OCR should be reported available (got {tess_status})"

    print("\n" + "=" * 70)
    print("ALL PHASE 8 SCANNED PDF & TESSERACT OCR TESTS PASSED PERFECTLY!")
    print("=" * 70)


if __name__ == "__main__":
    test_phase_8_scanned_pdf()
