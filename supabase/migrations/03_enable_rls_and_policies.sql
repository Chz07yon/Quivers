-- ==============================================================================
-- Quivers Migration 03: Row Level Security (RLS) & Isolation Policies
-- Guarantees that every learner can only read, write, update, and delete
-- their own documents, chunks, quizzes, questions, and attempts.
-- A second user can never access or modify another user's rows.
-- Fully idempotent with DROP POLICY IF EXISTS.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. DOCUMENTS RLS POLICIES
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 2. CHUNKS RLS POLICIES
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 3. QUIZZES RLS POLICIES (The Quiver)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 4. QUESTIONS RLS POLICIES (The Arrows)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 5. ATTEMPTS RLS POLICIES
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 6. ATTEMPT_ANSWERS RLS POLICIES
-- ------------------------------------------------------------------------------
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
