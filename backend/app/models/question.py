"""
Question Generation Data Models for Quivers (Phase 4).
Defines schemas for generated questions (The Arrows), user configuration,
Bloom taxonomy levels, and API request/response structures.
"""

from typing import List, Literal, Optional, Dict
from pydantic import BaseModel, Field
from app.models.document import TextChunk
from app.models.validation import ValidationReport

QuestionType = Literal["mcq", "true_false", "fill_in_the_blank"]
BloomLevel = Literal["recall", "understanding", "application"]
DifficultyLevel = Literal["easy", "medium", "hard", "mixed"]


class GeneratedQuestion(BaseModel):
    """
    Individual multiple-choice, true/false, or fill-in-the-blank question
    strictly grounded in source document text.
    """
    arrow_order: int = Field(description="1-based sequential question number (Arrow 1, Arrow 2...)")
    question: str = Field(description="The challenge question stem")
    type: QuestionType = Field(description="Question format: mcq, true_false, or fill_in_the_blank")
    options: List[str] = Field(description="List of choices (4 for mcq/fill_in_the_blank, 2 for true_false)")
    correct_answer: str = Field(description="The exact text of the correct choice matching one of options")
    correct_index: int = Field(description="0-based index of correct_answer in options")
    explanation: str = Field(description="Explanation of why the correct choice is right and others are wrong")
    source_page: int = Field(description="Source PDF page number where this concept is explicitly stated")
    source_passage: Optional[str] = Field(default=None, description="Exact text excerpt from the source chunk proving 100% grounding")
    bloom_level: BloomLevel = Field(description="Bloom's taxonomy cognitive level: recall, understanding, application")
    difficulty: str = Field(default="medium", description="Question difficulty: easy, medium, or hard")
    chunk_index: Optional[int] = Field(default=None, description="Index of the source text chunk")
    heading: Optional[str] = Field(default=None, description="Section heading of the source chunk")


class QuestionGenerationConfig(BaseModel):
    """
    User-configurable options for the question generation pipeline.
    """
    total_questions: int = Field(
        default=5,
        ge=1,
        le=50,
        description="Number of questions to generate across the document",
    )
    difficulty: DifficultyLevel = Field(
        default="medium",
        description="Target difficulty mix: easy, medium, hard, or mixed",
    )
    question_types: List[QuestionType] = Field(
        default=["mcq", "true_false", "fill_in_the_blank"],
        description="Selected question types to generate",
    )
    difficulty_mix: Optional[Dict[str, float]] = Field(
        default=None,
        description="Optional distribution ratios e.g. {'easy': 0.3, 'medium': 0.5, 'hard': 0.2}",
    )
    similarity_threshold: float = Field(
        default=0.75,
        ge=0.1,
        le=0.99,
        description="Cosine similarity threshold for near-duplicate rejection",
    )


class QuestionGenerationRequest(BaseModel):
    """
    Request payload to generate questions from provided chunks.
    """
    chunks: List[TextChunk]
    config: QuestionGenerationConfig = Field(default_factory=QuestionGenerationConfig)


class QuestionGenerationResponse(BaseModel):
    """
    Response returned by the question generation endpoint.
    """
    success: bool = True
    message: str = "Questions successfully generated and grounded in source text"
    total_generated: int
    questions: List[GeneratedQuestion]
    config: QuestionGenerationConfig
    model_used: str = "claude-3-5-sonnet-20241022"
    validation_report: Optional[ValidationReport] = None


class MissedTopicInput(BaseModel):
    heading: str = Field(description="Section heading or topic title where the user answered incorrectly")
    source_page: int = Field(description="1-indexed source PDF page")
    missed_count: int = Field(default=1, description="Number of questions missed on this topic")
    question_stems: List[str] = Field(default_factory=list, description="Question stems answered incorrectly to prevent repeats")
    source_passage: Optional[str] = Field(default=None, description="Optional cited source passage for targeted chunking")


class AdaptiveRetryRequest(BaseModel):
    """
    Request payload to generate a targeted adaptive quiz for missed topics (Phase 9).
    """
    quiz_id: Optional[str] = Field(default=None, description="ID of original quiz if saved in Supabase")
    original_quiz_title: str = Field(default="Document Quiz", description="Title of the parent quiz")
    missed_topics: List[MissedTopicInput] = Field(description="List of weak topics identified in past attempts")
    total_questions: int = Field(default=5, ge=1, le=20, description="Target question count for remedial quiz")
    difficulty: DifficultyLevel = Field(default="medium", description="Difficulty level")
    question_types: List[QuestionType] = Field(
        default=["mcq", "true_false", "fill_in_the_blank"],
        description="Selected question types to formulate",
    )
    context_chunks: Optional[List[TextChunk]] = Field(
        default=None,
        description="Optional full document text chunks to extract focused weak topic content from",
    )


class AdaptiveRetryResponse(BaseModel):
    """
    Response containing the reforged adaptive remediation quiz.
    """
    success: bool = True
    message: str = "Adaptive retry quiz successfully generated for identified weak topics."
    adaptive_quiz_title: str
    targeted_topics: List[str]
    total_generated: int
    questions: List[GeneratedQuestion]
    validation_report: Optional[ValidationReport] = None
    model_used: str = "quivers-adaptive-engine"


