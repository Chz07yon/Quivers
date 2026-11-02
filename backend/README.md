# Quivers Backend Service

> **Quivers**: AI-powered platform turning uploaded PDFs into interactive, source-grounded quizzes.  
> **Core Concept**: Each arrow is a question; the quiver holds the whole set generated from a document.

---

## 🛠️ Architecture & Stack

- **Framework**: Python [FastAPI](https://fastapi.tiangolo.com/) (Asynchronous, Type-safe with Pydantic)
- **PDF Extraction Engine**:
  - Primary: [PyMuPDF (fitz)](https://pymupdf.readthedocs.io/) for fast digital text extraction and bounding box positioning.
  - Fallback: [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) via `pytesseract` for scanned or image-based pages.
- **LLM Integration**: [Anthropic Claude API](https://docs.anthropic.com/claude/reference/) (called from backend only; secrets isolated in `.env`).
- **Database & Auth**: [Supabase (PostgreSQL)](https://supabase.com/) with tables:
  - `documents`: Uploaded PDF metadata, checksums, and extracted text chunks.
  - `quizzes`: Generated quivers tied to documents.
  - `questions`: Individual arrow questions with multiple choices, correct indices, and source citations.
  - `attempts`: User quiz submissions, accuracy rates, and question-level responses.

---

## 🚀 Setup & Execution

### 1. Environment Configuration

Copy the example environment file and add your credentials:

```bash
cp .env.example .env
```

Required keys:
- `ANTHROPIC_API_KEY`: Your Claude API key.
- `SUPABASE_URL`: Your Supabase project URL.
- `SUPABASE_KEY`: Your Supabase API / service role key.

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run Development Server

```bash
uvicorn main:app --reload --port 8000
```

- API Base URL: `http://localhost:8000`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

---

## 🎓 Viva Talking Points

1. **Why FastAPI?**  
   FastAPI offers native async support, automatic OpenAPI/Swagger documentation, and compile-time data validation via Pydantic v2 models.
2. **Why PyMuPDF with OCR fallback?**  
   Pure OCR is slow. PyMuPDF extracts digital text in milliseconds. If a page has zero text streams (indicating a scanned document), the system gracefully routes that page to Tesseract OCR.
3. **Why keep the Claude API key backend-only?**  
   Frontend clients can be inspected by anyone using browser developer tools. Routing all LLM prompts through the FastAPI backend protects credentials and allows server-side prompt injection defense and rate limiting.
