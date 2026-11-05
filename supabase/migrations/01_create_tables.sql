-- ==============================================================================
-- Quivers Migration 01: Core Tables & Foreign Key Constraints
-- Concept: Every document holds knowledge chunks; quizzes contain arrows (questions);
-- attempts track learner performance with bullseye accuracy metrics.
-- ==============================================================================

-- 1. DOCUMENTS TABLE
-- Stores uploaded PDF files, extraction metadata, and processing state.
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    file_hash TEXT,
    total_pages INT NOT NULL DEFAULT 1,
    total_words INT NOT NULL DEFAULT 0,
    is_processed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. CHUNKS TABLE
-- Stores page-level or section-level text chunks extracted via PyMuPDF / OCR.
CREATE TABLE IF NOT EXISTS public.chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    page_number INT NOT NULL,
    chunk_index INT NOT NULL DEFAULT 0,
    content TEXT NOT NULL,
    character_count INT NOT NULL DEFAULT 0,
    word_count INT NOT NULL DEFAULT 0,
    is_flagged_for_ocr BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. QUIZZES TABLE (The Quiver)
-- The quiver holding a generated set of arrows (questions) for a document.
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    total_arrows INT NOT NULL DEFAULT 0,
    difficulty TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'ready', -- 'generating', 'ready', 'failed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. QUESTIONS TABLE (The Arrows)
-- Each row represents an individual arrow (multiple-choice question) grounded in source text.
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    arrow_order INT NOT NULL, -- 1, 2, 3...
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of strings e.g. ["Option A", "Option B", "Option C", "Option D"]
    correct_index INT NOT NULL, -- 0-based index of correct option
    explanation TEXT NOT NULL,
    source_citation TEXT NOT NULL, -- e.g. "Section 3.2, Page 4"
    source_page_number INT NOT NULL,
    source_passage TEXT, -- Exact text excerpt from document
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. ATTEMPTS TABLE (Quiz Sessions)
-- Records a learner's quiz session, final score, and bullseye accuracy percentage.
CREATE TABLE IF NOT EXISTS public.attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score INT NOT NULL DEFAULT 0,
    total_arrows INT NOT NULL DEFAULT 0,
    bullseye_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed'
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ
);

-- 6. ATTEMPT_ANSWERS TABLE
-- Records each individual arrow release and whether it hit the bullseye.
CREATE TABLE IF NOT EXISTS public.attempt_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    selected_index INT NOT NULL,
    is_bullseye BOOLEAN NOT NULL,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger to auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_documents_updated_at ON public.documents;
CREATE TRIGGER trigger_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_quizzes_updated_at ON public.quizzes;
CREATE TRIGGER trigger_quizzes_updated_at
    BEFORE UPDATE ON public.quizzes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
