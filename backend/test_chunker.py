import os
import sys

# Ensure backend is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models.document import PageExtraction
from app.services.chunker import smart_chunk_document

def test_heading_chunking():
    print("Test 1: Testing heading-based chunking...")
    pages = [
        PageExtraction(
            page_number=1,
            text="1. Introduction\nMachine learning is a field of artificial intelligence. It focuses on training models on data.\n\nDeep learning uses multilayer neural networks to learn representations.",
            character_count=180,
            word_count=26,
            has_selectable_text=True,
            is_flagged_for_ocr=False,
        ),
        PageExtraction(
            page_number=2,
            text="2. Transformer Architecture\nThe Transformer is a model architecture that relies entirely on an attention mechanism to draw global dependencies between input and output.",
            character_count=160,
            word_count=23,
            has_selectable_text=True,
            is_flagged_for_ocr=False,
        ),
        PageExtraction(
            page_number=3,
            text="3. Conclusion\nIn this work, we presented the Transformer, the first sequence transduction model based entirely on self-attention.",
            character_count=130,
            word_count=17,
            has_selectable_text=True,
            is_flagged_for_ocr=False,
        ),
    ]

    chunks = smart_chunk_document(pages, max_chunk_words=500)
    print(f"  Generated {len(chunks)} chunks.")
    assert len(chunks) == 3, f"Expected 3 chunks, got {len(chunks)}"
    assert chunks[0].chunk_strategy == "heading"
    assert "Introduction" in chunks[0].heading
    assert chunks[0].page_range == "Page 1"
    assert chunks[0].start_page == 1 and chunks[0].end_page == 1

    assert "Transformer Architecture" in chunks[1].heading
    assert chunks[1].page_range == "Page 2"
    assert chunks[1].start_page == 2 and chunks[1].end_page == 2

    assert "Conclusion" in chunks[2].heading
    assert chunks[2].page_range == "Page 3"
    print("  [PASS] Heading-based chunking with exact page ranges succeeded.")


def test_page_group_fallback():
    print("Test 2: Testing page group fallback (no headings)...")
    pages = [
        PageExtraction(
            page_number=1,
            text="This is continuous unstructured narrative text. There are no headings here. Just continuous explanation of concepts that flow across pages without formal section headers.",
            character_count=170,
            word_count=25,
            has_selectable_text=True,
            is_flagged_for_ocr=False,
        ),
        PageExtraction(
            page_number=2,
            text="The narrative continues on the second page with more detailed analysis. Still no headings or markdown titles appear in this document stream.",
            character_count=145,
            word_count=22,
            has_selectable_text=True,
            is_flagged_for_ocr=False,
        ),
    ]

    # Set max_chunk_words low enough to test multiple page grouping or high enough to group
    chunks_grouped = smart_chunk_document(pages, max_chunk_words=100)
    print(f"  Generated {len(chunks_grouped)} chunks for fallback.")
    assert len(chunks_grouped) >= 1
    assert chunks_grouped[0].chunk_strategy == "page_group"
    assert chunks_grouped[0].page_range == "Pages 1-2"
    assert chunks_grouped[0].start_page == 1 and chunks_grouped[0].end_page == 2
    print("  [PASS] Page group fallback succeeded with correct 'Pages 1–2' range.")


def test_max_chunk_size_split():
    print("Test 3: Testing max chunk size enforcement...")
    long_paragraph = "The attention mechanism computes a weighted sum of values. " * 30  # ~270 words
    pages = [
        PageExtraction(
            page_number=1,
            text=f"1. Scaled Dot-Product Attention\n{long_paragraph}\n\n{long_paragraph}\n\n{long_paragraph}",
            character_count=len(long_paragraph) * 3,
            word_count=800,
            has_selectable_text=True,
            is_flagged_for_ocr=False,
        ),
    ]

    # Set max_chunk_words to 300 words
    chunks = smart_chunk_document(pages, max_chunk_words=300)
    print(f"  Long text split into {len(chunks)} chunks.")
    assert len(chunks) > 1, "Long text should have been split into multiple chunks"
    for chunk in chunks:
        assert chunk.word_count <= 400, f"Chunk exceeded size: {chunk.word_count}"
        assert chunk.start_page == 1 and chunk.end_page == 1
        assert chunk.page_range == "Page 1"
    print("  [PASS] Max chunk size enforcement succeeded.")


if __name__ == "__main__":
    test_heading_chunking()
    test_page_group_fallback()
    test_max_chunk_size_split()
    print("\nALL SMART CHUNKING TESTS PASSED PERFECTLY!")
