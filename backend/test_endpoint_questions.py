import os
import sys
import io

# Ensure backend is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models.document import TextChunk
from app.models.question import QuestionGenerationRequest, QuestionGenerationConfig
from app.api.quizzes import generate_questions_from_chunks, generate_questions_from_pdf
from fastapi import UploadFile
from test_question_generator import create_sample_pdf_bytes

def test_endpoints():
    print("Testing /api/quizzes/generate endpoint directly...")
    chunks = [
        TextChunk(
            chunk_index=1,
            heading="Quantum Superposition",
            content="Superposition allows a quantum system to exist simultaneously across multiple states until observation collapses the wave function.",
            start_page=1,
            end_page=1,
            page_range="Page 1",
            word_count=18,
            character_count=138,
            chunk_strategy="heading",
        )
    ]
    req = QuestionGenerationRequest(
        chunks=chunks,
        config=QuestionGenerationConfig(total_questions=3, difficulty="easy", question_types=["mcq", "true_false"])
    )
    res = generate_questions_from_chunks(req)
    assert res.success is True
    assert len(res.questions) == 3
    assert res.validation_report is not None
    assert res.validation_report.total_accepted == 3
    print(f"  [PASS] Endpoint generated {len(res.questions)} questions successfully.")
    print(f"  [PASS] Validation report present: {res.validation_report.summary_verdict}")

    print("\nTesting /api/quizzes/generate-from-pdf endpoint logic with sample PDF...")
    pdf_bytes = create_sample_pdf_bytes()
    upload_file = UploadFile(
        filename="test_quantum.pdf",
        file=io.BytesIO(pdf_bytes)
    )
    pdf_res = generate_questions_from_pdf(
        file=upload_file,
        total_questions=4,
        difficulty="medium",
        question_types="mcq,true_false",
    )
    assert pdf_res["success"] is True
    assert pdf_res["total_questions"] == 4
    assert len(pdf_res["questions"]) == 4
    assert pdf_res["validation_report"] is not None
    print(f"  [PASS] Endpoint successfully parsed PDF and returned {pdf_res['total_questions']} questions.")
    print(f"  [PASS] Validation report present in PDF endpoint: {pdf_res['validation_report'].summary_verdict}")
    for q in pdf_res["questions"]:
        print(f"    - [{q.type}] {q.question[:60]}... (Page {q.source_page}, Bloom: {q.bloom_level})")

    print("\nALL ENDPOINT TESTS PASSED!")

if __name__ == "__main__":
    test_endpoints()
