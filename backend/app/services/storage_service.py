"""
Storage, Quiver Vault, and Performance Analytics Service (Phase 7).
Handles persisting documents, chunks, quizzes, questions, and attempts per user.
Connects to Supabase Postgres with RLS when available, with an in-memory
per-user store fallback for offline and local testing environments.
"""

import datetime
import logging
import uuid
from typing import Dict, List, Optional
from supabase import Client

from app.models.storage import (
    DocumentRecord,
    MyQuiverAnalyticsResponse,
    SaveAttemptRequest,
    SaveDocumentRequest,
    SaveQuizRequest,
    StoredAttempt,
    StoredQuestion,
    StoredQuiz,
    WeakTopicRecord,
)

logger = logging.getLogger("quivers.storage")

# In-memory per-user storage fallback (keeps offline/test environments 100% functional)
_LOCAL_STORE: Dict[str, Dict[str, List[dict]]] = {}


def _get_user_store(user_id: str) -> Dict[str, List[dict]]:
    if user_id not in _LOCAL_STORE:
        _LOCAL_STORE[user_id] = {
            "documents": [],
            "chunks": [],
            "quizzes": [],
            "questions": [],
            "attempts": [],
            "attempt_answers": [],
        }
    return _LOCAL_STORE[user_id]


def determine_rank_tier(pct: float) -> str:
    """Returns archery rank based on bullseye accuracy percentage."""
    if pct >= 100:
        return "Bullseye Master"
    elif pct >= 80:
        return "Sharpshooter"
    elif pct >= 60:
        return "Marksman"
    return "Archer in Training"


class StorageService:
    """
    Manages user-isolated data persistence and historical analytics.
    User ID is strictly derived from verified JWT tokens.
    """

    @classmethod
    def save_document(
        cls,
        user_id: str,
        data: SaveDocumentRequest,
        supabase: Optional[Client] = None,
    ) -> DocumentRecord:
        doc_id = str(uuid.uuid4())
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        doc_dict = {
            "id": doc_id,
            "user_id": user_id,
            "filename": data.filename,
            "file_size_bytes": data.file_size_bytes,
            "total_pages": data.total_pages,
            "total_words": data.total_words,
            "is_processed": True,
            "created_at": now,
        }

        # Try Supabase if available
        if supabase:
            try:
                res = supabase.table("documents").insert(doc_dict).execute()
                if res.data:
                    doc_dict = res.data[0]
            except Exception as exc:
                logger.warning("Supabase save document failed: %s. Using local store.", exc)

        # Update local store
        store = _get_user_store(user_id)
        store["documents"].append(doc_dict)

        # Save chunks if provided
        for idx, chunk in enumerate(data.chunks):
            chunk_dict = {
                "id": str(uuid.uuid4()),
                "document_id": doc_id,
                "user_id": user_id,
                "page_number": chunk.get("start_page", 1),
                "chunk_index": idx + 1,
                "content": chunk.get("content", ""),
                "character_count": chunk.get("character_count", 0),
                "word_count": chunk.get("word_count", 0),
                "created_at": now,
            }
            if supabase:
                try:
                    supabase.table("chunks").insert(chunk_dict).execute()
                except Exception:
                    pass
            store["chunks"].append(chunk_dict)

        return DocumentRecord(**doc_dict)

    @classmethod
    def save_quiz(
        cls,
        user_id: str,
        data: SaveQuizRequest,
        supabase: Optional[Client] = None,
    ) -> StoredQuiz:
        quiz_id = str(uuid.uuid4())
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        quiz_dict = {
            "id": quiz_id,
            "user_id": user_id,
            "document_id": data.document_id,
            "title": data.title,
            "total_arrows": len(data.questions),
            "difficulty": data.difficulty,
            "status": "ready",
            "created_at": now,
        }

        if supabase:
            try:
                res = supabase.table("quizzes").insert(quiz_dict).execute()
                if res.data:
                    quiz_dict = res.data[0]
            except Exception as exc:
                logger.warning("Supabase save quiz failed: %s. Using local store.", exc)

        store = _get_user_store(user_id)
        store["quizzes"].append(quiz_dict)

        stored_questions: List[StoredQuestion] = []
        for q in data.questions:
            q_id = str(uuid.uuid4())
            q_dict = {
                "id": q_id,
                "quiz_id": quiz_id,
                "user_id": user_id,
                "arrow_order": q.arrow_order,
                "question": q.question,
                "type": q.type,
                "options": q.options,
                "correct_answer": q.correct_answer,
                "correct_index": q.correct_index,
                "explanation": q.explanation,
                "source_page": q.source_page,
                "source_passage": q.source_passage,
                "bloom_level": q.bloom_level,
                "heading": q.heading,
            }
            if supabase:
                try:
                    supabase.table("questions").insert(
                        {
                            "id": q_id,
                            "quiz_id": quiz_id,
                            "user_id": user_id,
                            "arrow_order": q.arrow_order,
                            "question_text": q.question,
                            "options": q.options,
                            "correct_index": q.correct_index,
                            "explanation": q.explanation,
                            "source_citation": f"Page {q.source_page}",
                            "source_page_number": q.source_page,
                            "source_passage": q.source_passage,
                        }
                    ).execute()
                except Exception:
                    pass
            store["questions"].append(q_dict)
            stored_questions.append(StoredQuestion(**q_dict))

        return StoredQuiz(
            id=quiz_id,
            user_id=user_id,
            document_id=data.document_id,
            document_name=data.document_name,
            title=data.title,
            total_arrows=len(data.questions),
            difficulty=data.difficulty,
            status="ready",
            created_at=now,
            best_score_percentage=None,
            attempts_count=0,
            questions=stored_questions,
        )

    @classmethod
    def list_user_quizzes(
        cls,
        user_id: str,
        supabase: Optional[Client] = None,
    ) -> List[StoredQuiz]:
        store = _get_user_store(user_id)
        quizzes = store["quizzes"]

        if supabase:
            try:
                res = (
                    supabase.table("quizzes")
                    .select("*")
                    .eq("user_id", user_id)
                    .order("created_at", desc=True)
                    .execute()
                )
                if res.data:
                    quizzes = res.data
            except Exception as exc:
                logger.warning("Supabase list quizzes failed: %s", exc)

        results: List[StoredQuiz] = []
        for q in quizzes:
            # Calculate attempts count and best score
            user_attempts = [
                a for a in store["attempts"] if a.get("quiz_id") == q.get("id")
            ]
            best_score = (
                max([float(a.get("bullseye_percentage", 0)) for a in user_attempts])
                if user_attempts
                else None
            )

            # Get questions
            q_list = [
                StoredQuestion(**item)
                for item in store["questions"]
                if item.get("quiz_id") == q.get("id")
            ]

            results.append(
                StoredQuiz(
                    id=str(q.get("id")),
                    user_id=user_id,
                    document_id=q.get("document_id"),
                    document_name=q.get("document_name", "Uploaded Document"),
                    title=q.get("title", "Document Quiz"),
                    total_arrows=int(q.get("total_arrows", len(q_list))),
                    difficulty=q.get("difficulty", "medium"),
                    status=q.get("status", "ready"),
                    created_at=str(q.get("created_at")),
                    best_score_percentage=best_score,
                    attempts_count=len(user_attempts),
                    questions=q_list,
                )
            )

        return results

    @classmethod
    def save_attempt(
        cls,
        user_id: str,
        data: SaveAttemptRequest,
        supabase: Optional[Client] = None,
    ) -> StoredAttempt:
        attempt_id = str(uuid.uuid4())
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        store = _get_user_store(user_id)

        # Lookup quiz title
        quiz = next((q for q in store["quizzes"] if q.get("id") == data.quiz_id), None)
        quiz_title = quiz.get("title", "Document Quiz") if quiz else "Document Quiz"

        rank = determine_rank_tier(data.bullseye_percentage)

        attempt_dict = {
            "id": attempt_id,
            "quiz_id": data.quiz_id,
            "quiz_title": quiz_title,
            "user_id": user_id,
            "score": data.score,
            "total_arrows": data.total_arrows,
            "bullseye_percentage": data.bullseye_percentage,
            "time_spent_seconds": data.time_spent_seconds,
            "completed_at": now,
            "rank_tier": rank,
        }

        if supabase:
            try:
                supabase.table("attempts").insert(
                    {
                        "id": attempt_id,
                        "quiz_id": data.quiz_id,
                        "user_id": user_id,
                        "score": data.score,
                        "total_arrows": data.total_arrows,
                        "bullseye_percentage": data.bullseye_percentage,
                        "status": "completed",
                        "completed_at": now,
                    }
                ).execute()
            except Exception as exc:
                logger.warning("Supabase save attempt failed: %s", exc)

        store["attempts"].append(attempt_dict)

        # Record individual attempt answers for weak topics calculation
        for ans in data.answers:
            ans_dict = {
                "id": str(uuid.uuid4()),
                "attempt_id": attempt_id,
                "user_id": user_id,
                "arrow_order": ans.arrow_order,
                "question": ans.question,
                "user_answer": ans.user_answer,
                "correct_answer": ans.correct_answer,
                "is_correct": ans.is_correct,
                "time_spent_seconds": ans.time_spent_seconds,
                "source_page": ans.source_page,
                "heading": ans.heading or "General Concept",
                "answered_at": now,
            }
            store["attempt_answers"].append(ans_dict)

        return StoredAttempt(**attempt_dict)

    @classmethod
    def list_user_attempts(
        cls,
        user_id: str,
        supabase: Optional[Client] = None,
    ) -> List[StoredAttempt]:
        store = _get_user_store(user_id)
        attempts = store["attempts"]
        return [StoredAttempt(**a) for a in reversed(attempts)]

    @classmethod
    def get_analytics(
        cls,
        user_id: str,
        supabase: Optional[Client] = None,
    ) -> MyQuiverAnalyticsResponse:
        store = _get_user_store(user_id)
        attempts = store["attempts"]
        quizzes = cls.list_user_quizzes(user_id, supabase)

        total_quizzes = len(quizzes)
        total_attempts = len(attempts)
        total_arrows_shot = sum(int(a.get("total_arrows", 0)) for a in attempts)
        bullseyes_hit = sum(int(a.get("score", 0)) for a in attempts)

        overall_accuracy = (
            round((bullseyes_hit / total_arrows_shot) * 100, 1)
            if total_arrows_shot > 0
            else 0.0
        )

        # Compute weak topics from attempt answers
        topic_stats: Dict[str, Dict[str, Any]] = {}
        for ans in store["attempt_answers"]:
            topic = ans.get("heading") or f"Page {ans.get('source_page', 1)}"
            if topic not in topic_stats:
                topic_stats[topic] = {
                    "source_page": ans.get("source_page", 1),
                    "total": 0,
                    "missed": 0,
                }
            topic_stats[topic]["total"] += 1
            if not ans.get("is_correct"):
                topic_stats[topic]["missed"] += 1

        weak_topics: List[WeakTopicRecord] = []
        for topic, stat in topic_stats.items():
            tot = stat["total"]
            miss = stat["missed"]
            acc = round(((tot - miss) / tot) * 100, 1) if tot > 0 else 100.0

            # Include topics where mistakes were made or accuracy is below 100%
            if miss > 0 or tot > 0:
                action = (
                    f"Review Page {stat['source_page']} to solidify this concept before retaking the quiz."
                    if miss > 0
                    else f"Mastered! Maintain recall on Page {stat['source_page']}."
                )
                weak_topics.append(
                    WeakTopicRecord(
                        topic=topic,
                        source_page=stat["source_page"],
                        total_tested=tot,
                        missed_count=miss,
                        accuracy_percentage=acc,
                        study_action=action,
                    )
                )

        # Sort weak topics: lowest accuracy first
        weak_topics.sort(key=lambda t: (t.accuracy_percentage, -t.missed_count))

        recent_attempts = [StoredAttempt(**a) for a in reversed(attempts[-10:])]

        return MyQuiverAnalyticsResponse(
            total_quizzes=total_quizzes,
            total_attempts=total_attempts,
            overall_accuracy_percentage=overall_accuracy,
            total_arrows_shot=total_arrows_shot,
            bullseyes_hit=bullseyes_hit,
            weak_topics=weak_topics,
            quizzes=quizzes,
            recent_attempts=recent_attempts,
        )

