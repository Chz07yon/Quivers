"""
Validation and Quality Assurance Data Models for Quivers (Phase 5).
Tracks JSON schema retries, embedding similarity deduplication,
and 2nd-pass LLM fact-checking audits.
"""

from typing import List, Literal, Optional
from pydantic import BaseModel, Field

RejectionReasonCategory = Literal[
    "SCHEMA_MALFORMED",
    "NEAR_DUPLICATE",
    "UNSUPPORTED_BY_SOURCE",
    "LOW_CONFIDENCE",
    "DISTRACTOR_INVALID",
]


class RejectionRecord(BaseModel):
    """
    Detailed log of a candidate question that was rejected during validation.
    """
    candidate_id: Optional[str] = Field(default=None, description="Identifier of candidate question")
    question: str = Field(description="The question stem that failed validation")
    reason_category: RejectionReasonCategory = Field(description="Category of validation failure")
    details: str = Field(description="Detailed human-readable explanation of why the question was rejected")
    similarity_score: Optional[float] = Field(default=None, description="Cosine similarity score if rejected as duplicate")
    duplicate_of: Optional[str] = Field(default=None, description="Question stem of existing question if duplicate")
    source_page: Optional[int] = Field(default=None, description="Claimed source page")
    chunk_index: Optional[int] = Field(default=None, description="Source chunk index")


class GroundingCheckRecord(BaseModel):
    """
    Second-pass LLM fact-checking audit for an accepted or candidate question.
    """
    arrow_order: int = Field(description="Sequential question index")
    question: str = Field(description="Question stem")
    correct_answer: str = Field(description="Proposed correct answer")
    source_page: int = Field(description="Source page citation")
    source_passage: Optional[str] = Field(default=None, description="Extracted source excerpt")
    is_supported: bool = Field(description="Whether the correct answer is directly substantiated by the source passage")
    confidence: float = Field(ge=0.0, le=1.0, description="Verification confidence score (0.0 to 1.0)")
    verdict: Literal["PASSED", "FAILED"] = Field(description="Pass or fail status of grounding verification")
    reason: str = Field(description="LLM explanation of grounding alignment or divergence")


class ValidationReport(BaseModel):
    """
    Comprehensive validation and quality audit report shown alongside the generated quiz.
    """
    total_generated: int = Field(description="Total raw candidate questions generated before filtering")
    total_accepted: int = Field(description="Total high-quality questions passing all validation gates")
    total_rejected: int = Field(description="Total candidate questions quarantined or discarded")
    schema_retries_triggered: int = Field(default=0, description="Number of times JSON schema repair retry was executed")
    near_duplicates_removed: int = Field(default=0, description="Number of questions weeded out due to embedding similarity")
    grounding_checks_passed: int = Field(default=0, description="Number of questions passing second-pass fact verification")
    grounding_checks_failed: int = Field(default=0, description="Number of questions failing second-pass fact verification")
    similarity_threshold_used: float = Field(default=0.75, description="Cosine similarity threshold for near-duplicate rejection")
    embedding_engine_used: str = Field(default="tfidf-cosine-vectorizer", description="Embedding model or vectorizer used")
    verifier_model_used: str = Field(default="claude-3-5-sonnet-verifier", description="LLM or rule engine used for 2nd-pass check")
    rejections: List[RejectionRecord] = Field(default_factory=list, description="Audit log of all rejected questions")
    grounding_checks: List[GroundingCheckRecord] = Field(default_factory=list, description="Second-pass grounding audit per question")
    summary_verdict: str = Field(default="100% Grounded and Verified", description="Human-readable executive verdict")

