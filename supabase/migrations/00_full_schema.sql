-- ==============================================================================
-- Quivers Complete Schema (All-in-One Migration)
-- Tables, Constraints, Triggers, Performance Indexes, and Row Level Security
-- Can be pasted and run all at once in the Supabase SQL Editor.
-- ==============================================================================

-- ==============================================================================
-- 1. CORE TABLES & FOREIGN KEY CONSTRAINTS
-- ==============================================================================

-- 1. DOCUMENTS TABLE
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
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    arrow_order INT NOT NULL,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_index INT NOT NULL,
    explanation TEXT NOT NULL,
    source_citation TEXT NOT NULL,
    source_page_number INT NOT NULL,
    source_passage TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. ATTEMPTS TABLE (Quiz Sessions)
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
CREATE TABLE IF NOT EXISTS public.attempt_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    selected_index INT NOT NULL,
    is_bullseye BOOLEAN NOT NULL,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 2. UPDATED_AT TRIGGERS
-- ==============================================================================
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

-- ==============================================================================
-- 3. PERFORMANCE INDEXES
-- ==============================================================================

-- Documents
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);

-- Chunks
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON public.chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_user_id ON public.chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_chunks_doc_page ON public.chunks(document_id, page_number);

-- Quizzes
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON public.quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_document_id ON public.quizzes(document_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON public.quizzes(created_at DESC);

-- Questions
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON public.questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_questions_user_id ON public.questions(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_arrow_order ON public.questions(quiz_id, arrow_order ASC);

-- Attempts
CREATE INDEX IF NOT EXISTS idx_attempts_quiz_id ON public.attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user_id ON public.attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_started_at ON public.attempts(started_at DESC);

-- Attempt Answers
CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt_id ON public.attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_question_id ON public.attempt_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_user_id ON public.attempt_answers(user_id);

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Documents RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
CREATE POLICY "Users can view their own documents"
    ON public.documents FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
CREATE POLICY "Users can insert their own documents"
    ON public.documents FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
CREATE POLICY "Users can update their own documents"
    ON public.documents FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;
CREATE POLICY "Users can delete their own documents"
    ON public.documents FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Chunks RLS
ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own chunks" ON public.chunks;
CREATE POLICY "Users can view their own chunks"
    ON public.chunks FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own chunks" ON public.chunks;
CREATE POLICY "Users can insert their own chunks"
    ON public.chunks FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own chunks" ON public.chunks;
CREATE POLICY "Users can update their own chunks"
    ON public.chunks FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own chunks" ON public.chunks;
CREATE POLICY "Users can delete their own chunks"
    ON public.chunks FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Quizzes RLS
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own quizzes" ON public.quizzes;
CREATE POLICY "Users can view their own quizzes"
    ON public.quizzes FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own quizzes" ON public.quizzes;
CREATE POLICY "Users can insert their own quizzes"
    ON public.quizzes FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own quizzes" ON public.quizzes;
CREATE POLICY "Users can update their own quizzes"
    ON public.quizzes FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own quizzes" ON public.quizzes;
CREATE POLICY "Users can delete their own quizzes"
    ON public.quizzes FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Questions RLS
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own questions" ON public.questions;
CREATE POLICY "Users can view their own questions"
    ON public.questions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own questions" ON public.questions;
CREATE POLICY "Users can insert their own questions"
    ON public.questions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own questions" ON public.questions;
CREATE POLICY "Users can update their own questions"
    ON public.questions FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own questions" ON public.questions;
CREATE POLICY "Users can delete their own questions"
    ON public.questions FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Attempts RLS
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own attempts" ON public.attempts;
CREATE POLICY "Users can view their own attempts"
    ON public.attempts FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own attempts" ON public.attempts;
CREATE POLICY "Users can insert their own attempts"
    ON public.attempts FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own attempts" ON public.attempts;
CREATE POLICY "Users can update their own attempts"
    ON public.attempts FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own attempts" ON public.attempts;
CREATE POLICY "Users can delete their own attempts"
    ON public.attempts FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Attempt Answers RLS
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own attempt answers" ON public.attempt_answers;
CREATE POLICY "Users can view their own attempt answers"
    ON public.attempt_answers FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own attempt answers" ON public.attempt_answers;
CREATE POLICY "Users can insert their own attempt answers"
    ON public.attempt_answers FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own attempt answers" ON public.attempt_answers;
CREATE POLICY "Users can update their own attempt answers"
    ON public.attempt_answers FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own attempt answers" ON public.attempt_answers;
CREATE POLICY "Users can delete their own attempt answers"
    ON public.attempt_answers FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
