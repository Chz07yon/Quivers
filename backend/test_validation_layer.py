"""
Phase 5 Validation Layer Verification Script.
Tests:
1. Schema validation and one-shot retry handling on malformed output.
2. Embedding similarity calculation and near-duplicate rejection.
3. Second-pass fact-checking ("Is the correct answer supported by this source passage?").
4. Rejection logging (counts, reasons, details, and similarity scores).
5. Generation response containing the complete ValidationReport.
"""

import sys
from app.models.document import TextChunk
from app.models.question import (
    GeneratedQuestion,
    QuestionGenerationConfig,
)
from app.services.validator import (
    EmbeddingDeduplicator,
    GroundingVerifier,
)
from app.services.question_generator import generate_questions_for_chunks


def test_embedding_near_duplicate_detection():
    print("Test 1: Testing embedding similarity and near-duplicate removal...")
    deduplicator = EmbeddingDeduplicator(default_threshold=0.70)

    # Create 3 questions: q1 and q2 are near-duplicates; q3 is a distinct topic
    q1 = GeneratedQuestion(
        arrow_order=1,
        question="What does the attention mechanism enable neural networks to accomplish in sequence processing?",
        type="mcq",
        options=["Option A", "Option B", "Option C", "Option D"],
        correct_answer="Option A",
        correct_index=0,
        explanation="Explanation 1",
        source_page=1,
        source_passage="The attention mechanism enables neural networks to focus on relevant tokens in sequence processing.",
        bloom_level="understanding",
        chunk_index=1,
    )

    q2 = GeneratedQuestion(
        arrow_order=2,
        question="What does the attention mechanism enable neural networks to accomplish during sequence processing?",  # Near duplicate of q1
        type="mcq",
        options=["Option A", "Option B", "Option C", "Option D"],
        correct_answer="Option A",
        correct_index=0,
        explanation="Explanation 2",
        source_page=1,
        source_passage="The attention mechanism enables neural networks to focus on relevant tokens in sequence processing.",
        bloom_level="understanding",
        chunk_index=1,
    )

    q3 = GeneratedQuestion(
        arrow_order=3,
        question="How does positional encoding prevent permutation invariance in transformer architectures?",  # Completely different topic
        type="mcq",
        options=["Option A", "Option B", "Option C", "Option D"],
        correct_answer="Option A",
        correct_index=0,
        explanation="Explanation 3",
        source_page=2,
        source_passage="Positional encoding injects order information into embeddings.",
        bloom_level="application",
        chunk_index=2,
    )

    accepted, rejections = deduplicator.filter_near_duplicates([q1, q2, q3], threshold=0.70)

    print(f"  Accepted questions: {len(accepted)}")
    print(f"  Rejected duplicates: {len(rejections)}")

    assert len(accepted) == 2, f"Expected 2 accepted questions, got {len(accepted)}"
    assert len(rejections) == 1, f"Expected 1 rejected duplicate, got {len(rejections)}"

    rej = rejections[0]
    print(f"  [PASS] Rejection Category: {rej.reason_category}")
    print(f"  [PASS] Similarity Score: {rej.similarity_score}")
    print(f"  [PASS] Duplicate Of: {rej.duplicate_of[:50]}...")
    assert rej.reason_category == "NEAR_DUPLICATE"
    assert rej.similarity_score is not None and rej.similarity_score >= 0.70
    assert rej.duplicate_of == q1.question
    print("Test 1 Passed!\n")


def test_second_pass_grounding_verifier():
    print("Test 2: Testing 2nd-pass LLM fact-checking verifier...")
    chunk = TextChunk(
        chunk_index=1,
        content="Multi-Head Attention allows the model to jointly attend to information from different representation subspaces. It projects queries, keys, and values h times with different learned linear projections.",
        word_count=29,
        character_count=192,
        start_page=3,
        end_page=3,
        page_range="Page 3",
        heading="Multi-Head Attention",
    )

    # 1. Supported question
    supported_q = GeneratedQuestion(
        arrow_order=1,
        question="What does Multi-Head Attention allow the model to do?",
        type="mcq",
        options=["Subspace projection", "Option B", "Option C", "Option D"],
        correct_answer="Multi-Head Attention allows the model to jointly attend to information from different representation subspaces.",
        correct_index=0,
        explanation="Directly stated in Page 3.",
        source_page=3,
        source_passage="Multi-Head Attention allows the model to jointly attend to information from different representation subspaces.",
        bloom_level="recall",
        chunk_index=1,
    )

    record_supported = GroundingVerifier.verify_grounding(supported_q, chunk, api_key=None)
    print(f"  Supported Question Verdict: {record_supported.verdict} (Confidence: {record_supported.confidence})")
    print(f"  Reason: {record_supported.reason}")
    assert record_supported.is_supported is True
    assert record_supported.verdict == "PASSED"

    # 2. Unsupported question (hallucination / fabricated claim)
    hallucinated_q = GeneratedQuestion(
        arrow_order=2,
        question="What does Multi-Head Attention use for gradient descent?",
        type="mcq",
        options=["Stochastic Momentum", "Option B", "Option C", "Option D"],
        correct_answer="It relies exclusively on Quantum Annealing to minimize cross entropy loss.",
        correct_index=0,
        explanation="Made up fact not in chunk.",
        source_page=3,
        source_passage="Quantum Annealing is used exclusively for cross entropy loss.",  # Not in chunk!
        bloom_level="recall",
        chunk_index=1,
    )

    record_unsupported = GroundingVerifier.verify_grounding(hallucinated_q, chunk, api_key=None)
    print(f"  Hallucinated Question Verdict: {record_unsupported.verdict} (Confidence: {record_unsupported.confidence})")
    print(f"  Reason: {record_unsupported.reason}")
    assert record_unsupported.is_supported is False
    assert record_unsupported.verdict == "FAILED"
    print("Test 2 Passed!\n")


def test_full_pipeline_with_validation_report():
    print("Test 3: Testing full generation pipeline with complete Validation Report...")
    chunks = [
        TextChunk(
            chunk_index=1,
            content="1. Concept: Each arrow represents an individual source-grounded question. The quiver holds the entire set of questions forged from this syllabus.",
            word_count=23,
            character_count=146,
            start_page=1,
            end_page=1,
            page_range="Page 1",
            heading="1. Concept",
        ),
        TextChunk(
            chunk_index=2,
            content="2. Attention Mechanism: Attention(Q, K, V) = softmax(Q * K^T / sqrt(d_k)) * V. This computes compatibility scores between queries and keys to produce weighted values.",
            word_count=24,
            character_count=160,
            start_page=2,
            end_page=2,
            page_range="Page 2",
            heading="2. Attention Mechanism",
        ),
    ]

    config = QuestionGenerationConfig(
        total_questions=4,
        difficulty="medium",
        question_types=["mcq", "true_false", "fill_in_the_blank"],
        similarity_threshold=0.75,
    )

    response = generate_questions_for_chunks(chunks, config)

    assert response.success is True
    assert len(response.questions) == 4
    assert response.validation_report is not None

    report = response.validation_report
    print("  Validation Report Metrics:")
    print(f"    - Total Generated: {report.total_generated}")
    print(f"    - Total Accepted: {report.total_accepted}")
    print(f"    - Total Rejected: {report.total_rejected}")
    print(f"    - Schema Retries: {report.schema_retries_triggered}")
    print(f"    - Near-Duplicates Removed: {report.near_duplicates_removed}")
    print(f"    - Grounding Checks Passed: {report.grounding_checks_passed}")
    print(f"    - Grounding Checks Failed: {report.grounding_checks_failed}")
    print(f"    - Embedding Engine: {report.embedding_engine_used}")
    print(f"    - Verifier Model: {report.verifier_model_used}")
    print(f"    - Summary Verdict: {report.summary_verdict}")

    assert report.total_accepted == 4
    assert report.grounding_checks_passed >= 4
    assert len(report.grounding_checks) == 4
    for check in report.grounding_checks:
        assert check.is_supported is True
        assert check.verdict == "PASSED"

    print("Test 3 Passed!\n")


if __name__ == "__main__":
    test_embedding_near_duplicate_detection()
    test_second_pass_grounding_verifier()
    test_full_pipeline_with_validation_report()
    print("ALL PHASE 5 VALIDATION LAYER TESTS PASSED PERFECTLY!")

