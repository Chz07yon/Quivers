"""
Storage, Quiz Vault, and Performance Analytics Models (Phase 7).
Defines schemas for persisting documents, quizzes, attempts, and weak-topic analytics.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from app.models.question import GeneratedQuestion


class SaveDocumentRequest(BaseModel):
    """Payload to save an extracted document and its text chunks."""
    filename: str
    file_size_bytes: int
    total_pages: int
    total_words: int
    chunks: List[Dict[str, Any]] = Field(default_factory=list)


class DocumentRecord(BaseModel):
    """Stored document record linked to the owner user."""
    id: str
    user_id: str
    filename: str
    file_size_bytes: int
    total_pages: int
    total_words: int
    is_processed: bool = True
    created_at: str


class SaveQuizRequest(BaseModel):
    """Payload to save a generated quiz and its arrows."""
    document_id: Optional[str] = None
    document_name: Optional[str] = "Uploaded Document"
    title: str = "Document Quiz"
    difficulty: str = "medium"
    questions: List[GeneratedQuestion]


class StoredQuestion(BaseModel):
    """Stored arrow/question in a saved quiz."""
    id: str
    arrow_order: int
    question: str
    type: str
    options: List[str]
    correct_answer: str
    correct_index: int
    explanation: str
    source_page: int
    source_passage: Optional[str] = None
    bloom_level: str
    heading: Optional[str] = None


class StoredQuiz(BaseModel):
    """Stored quiz representation for My Quiver vault."""
    id: str
    user_id: str
    document_id: Optional[str] = None
    document_name: Optional[str] = None
    title: str
    total_arrows: int
    difficulty: str
    status: str = "ready"
    created_at: str
    best_score_percentage: Optional[float] = None
    attempts_count: int = 0
    questions: List[StoredQuestion] = Field(default_factory=list)


class SaveAttemptAnswerItem(BaseModel):
    """Individual answer record in an attempt submission."""
    arrow_order: int
    question: str
    user_answer: str
    correct_answer: str
    is_correct: bool
    time_spent_seconds: int = 0
    source_page: int = 1
    heading: Optional[str] = None


class SaveAttemptRequest(BaseModel):
    """Payload to submit and record a completed quiz attempt."""
    quiz_id: str
    score: int
    total_arrows: int
    bullseye_percentage: float
    time_spent_seconds: int = 0
    answers: List[SaveAttemptAnswerItem] = Field(default_factory=list)


class StoredAttempt(BaseModel):
    """Stored attempt record with performance metrics."""
    id: str
    quiz_id: str
    quiz_title: str
    user_id: str
    score: int
    total_arrows: int
    bullseye_percentage: float
    time_spent_seconds: int
    completed_at: str
    rank_tier: str = "Archer in Training"


class WeakTopicRecord(BaseModel):
    """Aggregated weak topic derived from incorrect attempt answers."""
    topic: str
    source_page: int
    total_tested: int
    missed_count: int
    accuracy_percentage: float
    study_action: str


class MyQuiverAnalyticsResponse(BaseModel):
    """Complete analytics summary for the My Quiver page."""
    total_quizzes: int
    total_attempts: int
    overall_accuracy_percentage: float
    total_arrows_shot: int
    bullseyes_hit: int
    weak_topics: List[WeakTopicRecord]
    quizzes: List[StoredQuiz]
    recent_attempts: List[StoredAttempt]

