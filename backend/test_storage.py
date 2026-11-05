"""
Phase 7 Storage, Quiver Vault, and Performance Analytics Test Suite.
Tests:
1. Saving documents and chunks linked to authenticated user.
2. Saving quizzes and questions linked to user.
3. Saving attempts and answers, verifying score calculations.
4. RLS / User Isolation: User B cannot read User A's data.
5. Weak-topics analytics: aggregation, accuracy calculation, and study recommendation generation.
"""

from app.models.question import GeneratedQuestion
from app.models.storage import (
    SaveAttemptAnswerItem,
    SaveAttemptRequest,
    SaveDocumentRequest,
    SaveQuizRequest,
)
from app.services.storage_service import StorageService


def test_storage_and_user_isolation():
    print("Test 1: Testing save document and user isolation...")
    user_a = "user-uuid-1111-aaaa"
    user_b = "user-uuid-2222-bbbb"

    # User A saves document
    doc_req = SaveDocumentRequest(
        filename="Attention_Paper.pdf",
        file_size_bytes=1048576,
        total_pages=3,
        total_words=1200,
        chunks=[
            {"start_page": 1, "content": "Attention is all you need...", "word_count": 400},
            {"start_page": 2, "content": "Positional encodings...", "word_count": 400},
        ],
    )
    doc_a = StorageService.save_document(user_a, doc_req)
    assert doc_a.filename == "Attention_Paper.pdf"
    assert doc_a.user_id == user_a
    print(f"  [PASS] User A saved document {doc_a.id}")

    # User A saves quiz
    questions = [
        GeneratedQuestion(
            arrow_order=1,
            question="What is the attention formula?",
            type="mcq",
            options=["softmax(QK^T/sqrt(d_k))V", "Option B", "Option C", "Option D"],
            correct_answer="softmax(QK^T/sqrt(d_k))V",
            correct_index=0,
            explanation="Standard attention definition",
            source_page=1,
            source_passage="Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) * V",
            bloom_level="recall",
            heading="Attention Mechanism",
        ),
        GeneratedQuestion(
            arrow_order=2,
            question="Why is positional encoding needed?",
            type="mcq",
            options=["Permutation invariance", "Option B", "Option C", "Option D"],
            correct_answer="Permutation invariance",
            correct_index=0,
            explanation="Transformers lack recurrence",
            source_page=2,
            source_passage="Because Transformer models lack recurrence...",
            bloom_level="understanding",
            heading="Positional Encoding",
        ),
    ]

    quiz_req = SaveQuizRequest(
        document_id=doc_a.id,
        document_name=doc_a.filename,
        title="Attention Paper Quiz",
        difficulty="medium",
        questions=questions,
    )
    quiz_a = StorageService.save_quiz(user_a, quiz_req)
    assert quiz_a.title == "Attention Paper Quiz"
    assert quiz_a.total_arrows == 2
    print(f"  [PASS] User A saved quiz {quiz_a.id}")

    # User A takes attempt (Answer 1 correct, Answer 2 incorrect)
    attempt_req = SaveAttemptRequest(
        quiz_id=quiz_a.id,
        score=1,
        total_arrows=2,
        bullseye_percentage=50.0,
        time_spent_seconds=42,
        answers=[
            SaveAttemptAnswerItem(
                arrow_order=1,
                question="What is the attention formula?",
                user_answer="softmax(QK^T/sqrt(d_k))V",
                correct_answer="softmax(QK^T/sqrt(d_k))V",
                is_correct=True,
                source_page=1,
                heading="Attention Mechanism",
            ),
            SaveAttemptAnswerItem(
                arrow_order=2,
                question="Why is positional encoding needed?",
                user_answer="Option B",
                correct_answer="Permutation invariance",
                is_correct=False,
                source_page=2,
                heading="Positional Encoding",
            ),
        ],
    )
    attempt_a = StorageService.save_attempt(user_a, attempt_req)
    assert attempt_a.score == 1
    assert attempt_a.bullseye_percentage == 50.0
    assert attempt_a.rank_tier == "Archer in Training"
    print(f"  [PASS] User A saved attempt {attempt_a.id} (Score: {attempt_a.score}/{attempt_a.total_arrows})")

    # Verify Isolation: User B lists quizzes and attempts
    quizzes_b = StorageService.list_user_quizzes(user_b)
    attempts_b = StorageService.list_user_attempts(user_b)
    analytics_b = StorageService.get_analytics(user_b)

    assert len(quizzes_b) == 0, f"User B should see 0 quizzes, got {len(quizzes_b)}"
    assert len(attempts_b) == 0, f"User B should see 0 attempts, got {len(attempts_b)}"
    assert analytics_b.total_quizzes == 0
    print("  [PASS] User B cannot see User A's quizzes, attempts, or analytics (Strict Isolation).")


def test_weak_topics_analytics():
    print("\nTest 2: Testing Weak-Topics Analytics calculation...")
    user = "user-uuid-analyst-9999"

    quiz_req = SaveQuizRequest(
        title="Deep Learning Archery Quiz",
        difficulty="hard",
        questions=[
            GeneratedQuestion(
                arrow_order=1,
                question="Q1",
                type="mcq",
                options=["A", "B", "C", "D"],
                correct_answer="A",
                correct_index=0,
                explanation="Exp 1",
                source_page=1,
                bloom_level="recall",
                heading="Self-Attention",
            ),
            GeneratedQuestion(
                arrow_order=2,
                question="Q2",
                type="mcq",
                options=["A", "B", "C", "D"],
                correct_answer="B",
                correct_index=1,
                explanation="Exp 2",
                source_page=2,
                bloom_level="understanding",
                heading="Layer Normalization",
            ),
        ],
    )
    quiz = StorageService.save_quiz(user, quiz_req)

    # Attempt 1: Misses Layer Normalization
    attempt1 = SaveAttemptRequest(
        quiz_id=quiz.id,
        score=1,
        total_arrows=2,
        bullseye_percentage=50.0,
        time_spent_seconds=30,
        answers=[
            SaveAttemptAnswerItem(
                arrow_order=1,
                question="Q1",
                user_answer="A",
                correct_answer="A",
                is_correct=True,
                source_page=1,
                heading="Self-Attention",
            ),
            SaveAttemptAnswerItem(
                arrow_order=2,
                question="Q2",
                user_answer="C",
                correct_answer="B",
                is_correct=False,
                source_page=2,
                heading="Layer Normalization",
            ),
        ],
    )
    StorageService.save_attempt(user, attempt1)

    # Attempt 2: Misses Layer Normalization again
    attempt2 = SaveAttemptRequest(
        quiz_id=quiz.id,
        score=1,
        total_arrows=2,
        bullseye_percentage=50.0,
        time_spent_seconds=25,
        answers=[
            SaveAttemptAnswerItem(
                arrow_order=1,
                question="Q1",
                user_answer="A",
                correct_answer="A",
                is_correct=True,
                source_page=1,
                heading="Self-Attention",
            ),
            SaveAttemptAnswerItem(
                arrow_order=2,
                question="Q2",
                user_answer="D",
                correct_answer="B",
                is_correct=False,
                source_page=2,
                heading="Layer Normalization",
            ),
        ],
    )
    StorageService.save_attempt(user, attempt2)

    analytics = StorageService.get_analytics(user)
    print(f"  Total Quizzes: {analytics.total_quizzes}")
    print(f"  Total Attempts: {analytics.total_attempts}")
    print(f"  Overall Accuracy: {analytics.overall_accuracy_percentage}%")
    print(f"  Weak Topics Count: {len(analytics.weak_topics)}")

    assert analytics.total_quizzes == 1
    assert analytics.total_attempts == 2
    assert analytics.overall_accuracy_percentage == 50.0

    # Weak topics should highlight Layer Normalization
    weak_layer_norm = next((t for t in analytics.weak_topics if t.topic == "Layer Normalization"), None)
    assert weak_layer_norm is not None
    assert weak_layer_norm.missed_count == 2
    assert weak_layer_norm.accuracy_percentage == 0.0
    assert "Review Page 2" in weak_layer_norm.study_action
    print(f"  [PASS] Identified Weak Topic: '{weak_layer_norm.topic}' ({weak_layer_norm.accuracy_percentage}% Accuracy)")
    print(f"  [PASS] Generated Action: {weak_layer_norm.study_action}")


if __name__ == "__main__":
    test_storage_and_user_isolation()
    test_weak_topics_analytics()
    print("\nALL PHASE 7 STORAGE & ANALYTICS TESTS PASSED PERFECTLY!")

