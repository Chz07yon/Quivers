"""
Phase 9 Adaptive Retry Verification Test Suite.
Verifies that after completing a quiz, the system analyzes the learner's incorrect answers
and automatically generates a targeted, non-repeating remedial quiz focused strictly
on the missed topics with preserved source page citations and 100% grounding.
"""

import sys
from pathlib import Path

# Ensure backend root is on sys.path
backend_root = Path(__file__).resolve().parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from app.models.document import TextChunk
from app.models.question import (
    AdaptiveRetryRequest,
    AdaptiveRetryResponse,
    MissedTopicInput,
    QuestionGenerationConfig,
)
from app.api.quizzes import adaptive_retry_endpoint
from app.services.question_generator import generate_adaptive_retry_quiz


def create_sample_context_chunks():
    """Returns sample semantic chunks representing a lecture on Transformer networks."""
    return [
        TextChunk(
            chunk_index=1,
            heading="1. Multi-Head Attention",
            content=(
                "Multi-Head Attention allows the model to jointly attend to information from different "
                "representation subspaces at different positions. MultiHead(Q, K, V) = Concat(head_1, ..., head_h) * W_O. "
                "Each head performs scaled dot-product attention using queries, keys, and values projected with learned matrices."
            ),
            start_page=1,
            end_page=1,
            page_range="Page 1",
            word_count=42,
            character_count=285,
            chunk_strategy="heading",
        ),
        TextChunk(
            chunk_index=2,
            heading="2. Layer Normalization & Residuals",
            content=(
                "Layer normalization is applied over the hidden states to stabilize training dynamics. "
                "Each sub-layer employs a residual connection: LayerNorm(x + Sublayer(x)). "
                "This prevents gradient degradation in deep architectures and accelerates optimization convergence."
            ),
            start_page=2,
            end_page=2,
            page_range="Page 2",
            word_count=40,
            character_count=278,
            chunk_strategy="heading",
        ),
        TextChunk(
            chunk_index=3,
            heading="3. Feed-Forward Networks",
            content=(
                "In addition to attention sub-layers, each encoder layer contains a fully connected feed-forward network. "
                "FFN(x) = max(0, x * W1 + b1) * W2 + b2 consists of two linear transformations with a ReLU activation in between."
            ),
            start_page=3,
            end_page=3,
            page_range="Page 3",
            word_count=37,
            character_count=230,
            chunk_strategy="heading",
        ),
    ]


def test_adaptive_retry_pipeline():
    print("=" * 70)
    print("PHASE 9: ADAPTIVE RETRY QUIZ GENERATION TEST")
    print("=" * 70)

    chunks = create_sample_context_chunks()

    # 1. Simulate a completed flight where the learner answered 2 topics incorrectly:
    # Missed Topic A: Multi-Head Attention (Page 1)
    # Missed Topic B: Layer Normalization & Residuals (Page 2)
    # (Note: Topic 3 'Feed-Forward Networks' was answered correctly, so it should NOT be in retry)
    print("\n[Step 1] Setting up learner knowledge gaps from initial flight...")
    prior_missed_topics = [
        MissedTopicInput(
            heading="1. Multi-Head Attention",
            source_page=1,
            missed_count=2,
            question_stems=[
                "What does Multi-Head Attention enable neural networks to achieve?",
                "Which equation represents the concatenation in Multi-Head Attention?",
            ],
            source_passage="Multi-Head Attention allows the model to jointly attend to information from different representation subspaces.",
        ),
        MissedTopicInput(
            heading="2. Layer Normalization & Residuals",
            source_page=2,
            missed_count=1,
            question_stems=[
                "Why is layer normalization applied in Transformer sub-layers?",
            ],
            source_passage="Layer normalization is applied over the hidden states to stabilize training dynamics and prevent gradient degradation.",
        ),
    ]

    print(f"  Missed Topics to Remediate: {len(prior_missed_topics)}")
    for t in prior_missed_topics:
        print(f"    - {t.heading} (Page {t.source_page}) with {len(t.question_stems)} previously missed question(s)")

    # 2. Formulate Adaptive Retry Request
    print("\n[Step 2] Constructing AdaptiveRetryRequest...")
    request = AdaptiveRetryRequest(
        original_quiz_title="Transformer Fundamentals Flight",
        missed_topics=prior_missed_topics,
        total_questions=4,
        difficulty="medium",
        question_types=["mcq", "true_false", "fill_in_the_blank"],
        context_chunks=chunks,
    )

    # 3. Generate the Adaptive Retry Quiz
    print("\n[Step 3] Executing generate_adaptive_retry_quiz...")
    response: AdaptiveRetryResponse = generate_adaptive_retry_quiz(request)

    print("\n[Adaptive Quiz Generation Results]")
    print(f"  Success:            {response.success}")
    print(f"  Adaptive Title:     {response.adaptive_quiz_title}")
    print(f"  Targeted Topics:    {response.targeted_topics}")
    print(f"  Total Questions:    {response.total_generated}")
    print(f"  Validation Summary: {response.validation_report.summary_verdict if response.validation_report else 'N/A'}")

    # Assertions
    assert response.success is True, "Adaptive retry generation must succeed"
    assert response.total_generated >= 2, f"Expected at least 2 questions (got {response.total_generated})"
    assert len(response.questions) >= 2

    # 4. Verify that generated questions target ONLY the missed topics and do NOT repeat stems
    print("\n[Step 4] Auditing Generated Remedial Arrows for Non-Repetition & Topic Focus...")
    prior_all_stems = {
        stem.strip().lower()
        for t in prior_missed_topics
        for stem in t.question_stems
    }

    for q in response.questions:
        print(f"\n  Arrow #{q.arrow_order} [{q.type.upper()}] (Bloom: {q.bloom_level}):")
        print(f"    Question:       {q.question}")
        print(f"    Options:        {q.options}")
        print(f"    Correct Answer: {q.correct_answer}")
        print(f"    Source Page:    Page {q.source_page}")
        print(f"    Heading:        {q.heading}")
        print(f"    Explanation:    {q.explanation}")

        # Grounding check: Source page must be from the missed topics (Page 1 or Page 2, NEVER Page 3)
        assert q.source_page in (1, 2), f"Question source page must be Page 1 or 2 (got Page {q.source_page})"
        assert q.source_page != 3, "Topic 3 was not missed and should NOT appear in adaptive retry"

        # Novelty check: Question stem must not be an identical repeat of prior missed stems
        assert q.question.strip().lower() not in prior_all_stems, (
            f"Question stem '{q.question}' repeats a previously missed stem!"
        )

    # 5. Verify the API Endpoint directly
    print("\n[Step 5] Testing POST /api/quizzes/adaptive-retry endpoint logic...")
    api_response = adaptive_retry_endpoint(request)
    assert api_response.success is True
    assert api_response.total_generated == response.total_generated
    print("  [PASS] Endpoint successfully executed and validated.")

    # 6. Verify empty missed topics rejection (400 Bad Request)
    print("\n[Step 6] Testing validation rejection for empty missed topics...")
    from fastapi import HTTPException
    try:
        empty_req = AdaptiveRetryRequest(
            missed_topics=[],
            total_questions=3,
        )
        adaptive_retry_endpoint(empty_req)
        assert False, "Should have raised HTTPException 400"
    except HTTPException as exc:
        print(f"  [PASS] Correctly rejected empty request with HTTP {exc.status_code}: {exc.detail}")
        assert exc.status_code == 400

    print("\n" + "=" * 70)
    print("ALL PHASE 9 ADAPTIVE RETRY TESTS PASSED PERFECTLY!")
    print("=" * 70)


if __name__ == "__main__":
    test_adaptive_retry_pipeline()

