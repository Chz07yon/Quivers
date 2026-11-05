-- ==============================================================================
-- Quivers Migration 02: Performance & Query Optimization Indexes
-- Ensures fast lookups on foreign keys, user filtering, and chronological sorting.
-- ==============================================================================

-- Documents Indexes
CREATE INDEX IF NOT EXISTS idx_documents_user_id 
    ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at 
    ON public.documents(created_at DESC);

-- Chunks Indexes
CREATE INDEX IF NOT EXISTS idx_chunks_document_id 
    ON public.chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_user_id 
    ON public.chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_chunks_doc_page 
    ON public.chunks(document_id, page_number);

-- Quizzes Indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id 
    ON public.quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_document_id 
    ON public.quizzes(document_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at 
    ON public.quizzes(created_at DESC);

-- Questions Indexes (Arrow ordering within each quiz)
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id 
    ON public.questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_questions_user_id 
    ON public.questions(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_arrow_order 
    ON public.questions(quiz_id, arrow_order ASC);

-- Attempts Indexes
CREATE INDEX IF NOT EXISTS idx_attempts_quiz_id 
    ON public.attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user_id 
    ON public.attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_started_at 
    ON public.attempts(started_at DESC);

-- Attempt Answers Indexes
CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt_id 
    ON public.attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_question_id 
    ON public.attempt_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_user_id 
    ON public.attempt_answers(user_id);
