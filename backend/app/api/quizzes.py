"""
Quiz and Question Generation API Router (Phase 4).
Exposes endpoints for generating source-grounded questions from document chunks or uploaded PDFs.
Enforces strict JSON schema: question, type, options, correct_answer, explanation, source_page, bloom_level.
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.models.document import PDFExtractionResponse, TextChunk
from app.models.question import (
    AdaptiveRetryRequest,
    AdaptiveRetryResponse,
    DifficultyLevel,
    GeneratedQuestion,
    QuestionGenerationConfig,
    QuestionGenerationRequest,
    QuestionGenerationResponse,
    QuestionType,
)
from app.models.storage import (
    MyQuiverAnalyticsResponse,
    SaveAttemptRequest,
    SaveQuizRequest,
    StoredAttempt,
    StoredQuiz,
)
from app.core.auth import AuthenticatedUser, get_current_user, get_supabase_client
from supabase import Client
from app.services.pdf_extractor import extract_text_from_pdf_bytes
from app.services.question_generator import (
    generate_questions_for_chunks,
    generate_adaptive_retry_quiz,
)
from app.services.storage_service import StorageService

logger = logging.getLogger("quivers.api.quizzes")
router = APIRouter(prefix="/api/quizzes", tags=["Quizzes & Question Generation"])


@router.post(
    "/generate",
    response_model=QuestionGenerationResponse,
    summary="Generate questions from semantic text chunks",
    description=(
        "Takes extracted chunks, calls the LLM with strict grounding constraints (no outside facts, "
        "no duplicates), and returns questions with options, correct answer, explanation, source page, "
        "and Bloom's cognitive level."
    ),
)
def generate_questions_from_chunks(
    request: QuestionGenerationRequest,
) -> QuestionGenerationResponse:
    """
    Formulates pedagogical quiz arrows strictly grounded in the provided chunks.
    """
    if not request.chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot generate questions: No text chunks provided in request.",
        )

    response = generate_questions_for_chunks(
        chunks=request.chunks,
        config=request.config,
    )
    return response


@router.post(
    "/generate-from-pdf",
    summary="Generate questions directly from an uploaded PDF file",
    description=(
        "End-to-end pipeline: extracts PDF pages with PyMuPDF, chunks by headings or page groups, "
        "and generates pedagogical questions honoring the user's difficulty, count, and type preferences."
    ),
)
def generate_questions_from_pdf(
    file: UploadFile = File(..., description="PDF document file (max 10 MB)"),
    total_questions: int = Form(5, description="Total number of questions to generate", ge=1, le=50),
    difficulty: DifficultyLevel = Form("medium", description="Difficulty: easy, medium, hard, or mixed"),
    question_types: str = Form(
        "mcq,true_false,fill_in_the_blank",
        description="Comma-separated question types: mcq, true_false, fill_in_the_blank",
    ),
):
    """
    Complete pipeline: PDF -> Pages -> Smart Chunks -> Strict JSON Questions.
    """
    filename = file.filename or "uploaded.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file extension for '{filename}'. Only PDF files are supported.",
        )

    contents = file.file.read()
    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded PDF file is empty (0 bytes).",
        )

    # 1. Extract text and smart-chunk
    extraction = extract_text_from_pdf_bytes(contents, filename)
    if not extraction.chunks:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Failed to extract readable text chunks from the provided PDF.",
        )

    # 2. Parse selected question types
    parsed_types: List[QuestionType] = []
    for t in question_types.split(","):
        clean_t = t.strip().lower()
        if clean_t in ("mcq", "true_false", "fill_in_the_blank"):
            parsed_types.append(clean_t)  # type: ignore

    if not parsed_types:
        parsed_types = ["mcq", "true_false", "fill_in_the_blank"]

    config = QuestionGenerationConfig(
        total_questions=total_questions,
        difficulty=difficulty,
        question_types=parsed_types,
    )

    # 3. Generate questions for each chunk
    generation_response = generate_questions_for_chunks(
        chunks=extraction.chunks,
        config=config,
    )

    return {
        "success": True,
        "summary": extraction.summary,
        "total_chunks": len(extraction.chunks),
        "chunks": extraction.chunks,
        "total_questions": generation_response.total_generated,
        "questions": generation_response.questions,
        "config": generation_response.config,
        "model_used": generation_response.model_used,
        "validation_report": generation_response.validation_report,
    }


# ==============================================================================
# PHASE 7: STORAGE, HISTORY & ANALYTICS ENDPOINTS
# ==============================================================================

@router.post(
    "/save",
    response_model=StoredQuiz,
    summary="Save a generated quiz to user's quiver vault (Protected)",
    description="Saves a quiz and all its generated arrows for the authenticated user.",
)
def save_quiz_endpoint(
    request: SaveQuizRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    supabase: Optional[Client] = Depends(get_supabase_client),
) -> StoredQuiz:
    return StorageService.save_quiz(
        user_id=user.id,
        data=request,
        supabase=supabase,
    )


@router.get(
    "/saved",
    response_model=List[StoredQuiz],
    summary="List all saved quizzes for the authenticated user (Protected)",
    description="Returns all quivers owned by the authenticated caller, with attempt statistics.",
)
def list_saved_quizzes_endpoint(
    user: AuthenticatedUser = Depends(get_current_user),
    supabase: Optional[Client] = Depends(get_supabase_client),
) -> List[StoredQuiz]:
    return StorageService.list_user_quizzes(
        user_id=user.id,
        supabase=supabase,
    )


@router.post(
    "/attempts",
    response_model=StoredAttempt,
    summary="Record a completed quiz attempt (Protected)",
    description="Saves the learner's score, time taken, and answer records to generate weak-topic analytics.",
)
def record_attempt_endpoint(
    request: SaveAttemptRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    supabase: Optional[Client] = Depends(get_supabase_client),
) -> StoredAttempt:
    return StorageService.save_attempt(
        user_id=user.id,
        data=request,
        supabase=supabase,
    )


@router.get(
    "/attempts",
    response_model=List[StoredAttempt],
    summary="List all past quiz attempts for the authenticated user (Protected)",
    description="Returns chronological flight history across all attempts for the authenticated user.",
)
def list_attempts_endpoint(
    user: AuthenticatedUser = Depends(get_current_user),
    supabase: Optional[Client] = Depends(get_supabase_client),
) -> List[StoredAttempt]:
    return StorageService.list_user_attempts(
        user_id=user.id,
        supabase=supabase,
    )


@router.get(
    "/analytics",
    response_model=MyQuiverAnalyticsResponse,
    summary="Get comprehensive My Quiver analytics & weak-topics breakdown (Protected)",
    description="Calculates overall accuracy, total arrows released, and aggregates weak topics from past attempts.",
)
def get_my_quiver_analytics_endpoint(
    user: AuthenticatedUser = Depends(get_current_user),
    supabase: Optional[Client] = Depends(get_supabase_client),
) -> MyQuiverAnalyticsResponse:
    return StorageService.get_analytics(
        user_id=user.id,
        supabase=supabase,
    )


@router.post(
    "/adaptive-retry",
    response_model=AdaptiveRetryResponse,
    summary="Generate targeted remedial quiz on missed topics (Phase 9: Adaptive Retry)",
    description=(
        "Analyzes the learner's incorrect answers/missed topics from a previous quiz flight, "
        "retrieves or synthesizes relevant semantic chunks, and generates a fresh, targeted "
        "remedial quiz guaranteed not to duplicate previously missed stems."
    ),
)
def adaptive_retry_endpoint(
    request: AdaptiveRetryRequest,
) -> AdaptiveRetryResponse:
    """
    Formulates a targeted remedial quiz ("Adaptive Retry Quiver") focused specifically
    on the concepts the learner missed.
    """
    if not request.missed_topics:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot generate adaptive retry: No missed topics provided in request.",
        )

    try:
        response = generate_adaptive_retry_quiz(request)
        return response
    except Exception as exc:
        logger.error("Failed to generate adaptive retry quiz: %s", str(exc), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Adaptive quiz formulation failed: {str(exc)}",
        )

