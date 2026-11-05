import os
import sys
import fitz

# Ensure backend is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models.document import TextChunk
from app.models.question import QuestionGenerationConfig
from app.services.question_generator import generate_questions_for_chunks
from app.services.pdf_extractor import extract_text_from_pdf_bytes


def create_sample_pdf_bytes() -> bytes:
    """Creates a 3-page sample PDF on Transformer Neural Networks for testing."""
    doc = fitz.open()

    p1 = doc.new_page()
    p1.insert_text(
        (50, 72),
        "1. Attention Mechanism\n\n"
        "The Attention mechanism allows neural networks to focus on specific parts of an input sequence. "
        "Unlike recurrent neural networks that process tokens sequentially, attention processes all tokens simultaneously. "
        "Self-attention calculates compatibility scores between queries, keys, and values.",
        fontsize=11,
    )

    p2 = doc.new_page()
    p2.insert_text(
        (50, 72),
        "2. Positional Encoding\n\n"
        "Because Transformer models lack recurrence, they must inject positional information into input embeddings. "
        "Sine and cosine functions of varying frequencies generate fixed positional encodings. "
        "This allows the model to learn relative positions of tokens in the sequence.",
        fontsize=11,
    )

    p3 = doc.new_page()
    p3.insert_text(
        (50, 72),
        "3. Multi-Head Attention\n\n"
        "Multi-head attention projects queries, keys, and values multiple times with different learned linear projections. "
        "This allows the model to jointly attend to information from different representation subspaces at different positions. "
        "Standard Transformer architectures typically use eight parallel attention heads.",
        fontsize=11,
    )

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_chunk_question_generation():
    print("Test 1: Testing question generation from chunks...")
    chunks = [
        TextChunk(
            chunk_index=1,
            heading="1. Attention Mechanism",
            content="The Attention mechanism allows neural networks to focus on specific parts of an input sequence. Unlike recurrent neural networks that process tokens sequentially, attention processes all tokens simultaneously. Self-attention calculates compatibility scores between queries, keys, and values.",
            start_page=1,
            end_page=1,
            page_range="Page 1",
            word_count=40,
            character_count=285,
            chunk_strategy="heading",
        ),
        TextChunk(
            chunk_index=2,
            heading="2. Positional Encoding",
            content="Because Transformer models lack recurrence, they must inject positional information into input embeddings. Sine and cosine functions of varying frequencies generate fixed positional encodings. This allows the model to learn relative positions of tokens in the sequence.",
            start_page=2,
            end_page=2,
            page_range="Page 2",
            word_count=37,
            character_count=268,
            chunk_strategy="heading",
        ),
    ]

    # Test user customization: 6 questions, difficulty "hard", custom question types
    config = QuestionGenerationConfig(
        total_questions=6,
        difficulty="hard",
        question_types=["mcq", "true_false", "fill_in_the_blank"],
    )

    response = generate_questions_for_chunks(chunks, config)
    print(f"  Generated {response.total_generated} questions.")
    assert response.success is True
    assert response.total_generated == 6, f"Expected 6 questions, got {response.total_generated}"
    assert len(response.questions) == 6

    # Verify strict schema on EVERY question
    for idx, q in enumerate(response.questions, start=1):
        assert q.arrow_order == idx, f"Expected order {idx}, got {q.arrow_order}"
        assert q.question and len(q.question.strip()) > 5, "Question text missing or too short"
        assert q.type in ("mcq", "true_false", "fill_in_the_blank"), f"Invalid type: {q.type}"

        if q.type in ("mcq", "fill_in_the_blank"):
            assert len(q.options) == 4, f"Expected 4 options for {q.type}, got {len(q.options)}"
        elif q.type == "true_false":
            assert q.options == ["True", "False"], f"Expected True/False options, got {q.options}"

        assert q.correct_answer in q.options, f"Correct answer '{q.correct_answer}' not in options {q.options}"
        assert q.correct_index == q.options.index(q.correct_answer)
        assert q.explanation and len(q.explanation.strip()) > 5, "Explanation missing"
        assert q.source_page in (1, 2), f"Invalid source page: {q.source_page}"
        assert q.bloom_level in ("recall", "understanding", "application"), f"Invalid Bloom level: {q.bloom_level}"

        print(f"    Arrow #{q.arrow_order} [{q.type.upper()}] (Bloom: {q.bloom_level}, Page {q.source_page}): {q.question[:65]}...")
        print(f"      Options: {q.options}")
        print(f"      Correct Answer: '{q.correct_answer}' (Index {q.correct_index})")

    print("  [PASS] All schema fields, Bloom levels, and options validated successfully.")


def test_pdf_to_questions_pipeline():
    print("\nTest 2: Testing complete PDF -> Smart Chunks -> Questions pipeline...")
    pdf_bytes = create_sample_pdf_bytes()
    extraction = extract_text_from_pdf_bytes(pdf_bytes, "transformers_study_guide.pdf")

    assert extraction.total_chunks >= 3, f"Expected at least 3 chunks, got {extraction.total_chunks}"
    print(f"  Extracted {extraction.summary.total_pages} pages into {extraction.total_chunks} chunks.")

    # User chooses 5 questions, only MCQ and True/False, difficulty "medium"
    config = QuestionGenerationConfig(
        total_questions=5,
        difficulty="medium",
        question_types=["mcq", "true_false"],
    )

    result = generate_questions_for_chunks(extraction.chunks, config)
    assert result.total_generated == 5
    for q in result.questions:
        assert q.type in ("mcq", "true_false")
        assert q.source_page in (1, 2, 3)
        assert q.bloom_level in ("recall", "understanding", "application")

    print(f"  Generated {len(result.questions)} questions strictly filtered to types {config.question_types}.")
    print("  [PASS] Sample PDF question generation pipeline succeeded completely.")


if __name__ == "__main__":
    test_chunk_question_generation()
    test_pdf_to_questions_pipeline()
    print("\nALL PHASE 4 QUESTION GENERATION TESTS PASSED PERFECTLY!")

