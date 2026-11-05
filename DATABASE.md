# Quivers Database Architecture & Security Guide (Viva Defense)

This document details the relational schema, constraints, Row Level Security (RLS) policies, and JWT token authorization designed for **Quivers**. It provides clear rationales, execution steps, and viva talking points for your technical evaluation.

---

## 🏛️ Schema Architecture Overview

Quivers implements a strict multi-tenant relational data model anchored directly on Supabase Auth (`auth.users.id`).

```
[auth.users] (Supabase Auth)
     │
     ├── 1:N ──> [documents] (Uploaded PDFs & metadata)
     │                │
     ├── 1:N ──>      ├── 1:N ──> [chunks] (Page/section text extracted via PyMuPDF)
     │                │
     ├── 1:N ──>      └── 1:N ──> [quizzes] (The Quiver: Question collections)
     │                                 │
     ├── 1:N ──>                       ├── 1:N ──> [questions] (The Arrows: MCQ + citations)
     │                                 │
     ├── 1:N ──>                       └── 1:N ──> [attempts] (Quiz sessions & scores)
     │                                                  │
     └── 1:N ───────────────────────────────────────────└── 1:N ──> [attempt_answers] (Per-question answers)
```

> **Key Design Rule**: Every single table contains a `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` foreign key. Child tables also maintain direct foreign keys to their parent entities (`document_id`, `quiz_id`, `attempt_id`, `question_id`).

---

## 📊 Table Specifications

### 1. `documents`
- **Purpose**: Stores metadata, processing state, and file fingerprints for learner-uploaded PDFs.
- **Key Columns**:
  - `id` (UUID, PK): Auto-generated unique identifier (`gen_random_uuid()`).
  - `user_id` (UUID, FK): References `auth.users(id) ON DELETE CASCADE`.
  - `filename` (TEXT): Original file name.
  - `file_size_bytes` (BIGINT): Enforces and audits the 10 MB upload limit.
  - `file_hash` (TEXT): SHA-256 digest for deduplication and integrity checking.
  - `total_pages` (INT): Extracted page count.
  - `total_words` (INT): Aggregate word count.
  - `is_processed` (BOOLEAN): Status flag set to true once text is parsed into chunks.
  - `created_at` / `updated_at` (TIMESTAMPTZ).

### 2. `chunks`
- **Purpose**: Retains clean page-level or section-level extracted text blocks used as prompt context for Claude.
- **Key Columns**:
  - `id` (UUID, PK).
  - `document_id` (UUID, FK): References `documents(id) ON DELETE CASCADE`.
  - `user_id` (UUID, FK): References `auth.users(id) ON DELETE CASCADE`.
  - `page_number` (INT): 1-indexed PDF page reference for exact citations.
  - `chunk_index` (INT): Sequence order of the chunk within the document.
  - `content` (TEXT): Clean text extracted by PyMuPDF.
  - `is_flagged_for_ocr` (BOOLEAN): Flags pages lacking digital selectable text for Phase 8 OCR fallback.
  - `created_at` (TIMESTAMPTZ).

### 3. `quizzes` *(The Quiver)*
- **Purpose**: Represents the full quiz set generated for an uploaded document.
- **Key Columns**:
  - `id` (UUID, PK).
  - `user_id` (UUID, FK): References `auth.users(id) ON DELETE CASCADE`.
  - `document_id` (UUID, FK): References source `documents(id) ON DELETE CASCADE`.
  - `title` (TEXT): Quiz title (e.g., "Transformer Architecture & Attention Mechanisms").
  - `description` (TEXT): Overview and focus areas.
  - `total_arrows` (INT): Total questions contained in this quiver.
  - `difficulty` (TEXT): Difficulty tier (`easy`, `medium`, `hard`).
  - `status` (TEXT): Lifecycle status (`generating`, `ready`, `failed`).
  - `created_at` / `updated_at` (TIMESTAMPTZ).

### 4. `questions` *(The Arrows)*
- **Purpose**: Stores individual multiple-choice challenge questions grounded in the source text.
- **Key Columns**:
  - `id` (UUID, PK).
  - `quiz_id` (UUID, FK): References parent `quizzes(id) ON DELETE CASCADE`.
  - `user_id` (UUID, FK): References `auth.users(id) ON DELETE CASCADE`.
  - `arrow_order` (INT): Question sequence (Arrow 1, Arrow 2, etc.).
  - `question_text` (TEXT): The challenge question stem.
  - `options` (JSONB): Array of 4 answer options `["Option A", "Option B", "Option C", "Option D"]`.
  - `correct_index` (INT): 0-based index of the correct answer.
  - `explanation` (TEXT): Explains why the correct choice is right and distractors are wrong.
  - `source_citation` (TEXT): Human-readable citation (e.g., "Section 3.2, Page 4").
  - `source_page_number` (INT): Exact page link in the PDF document.
  - `source_passage` (TEXT): Exact excerpt extracted from the document proving grounding.
  - `created_at` (TIMESTAMPTZ).

### 5. `attempts`
- **Purpose**: Records a learner's quiz attempt, session duration, and accuracy metrics.
- **Key Columns**:
  - `id` (UUID, PK).
  - `quiz_id` (UUID, FK): References target `quizzes(id) ON DELETE CASCADE`.
  - `user_id` (UUID, FK): References learner `auth.users(id) ON DELETE CASCADE`.
  - `score` (INT): Number of questions answered correctly.
  - `total_arrows` (INT): Total questions in the quiz.
  - `bullseye_percentage` (NUMERIC(5,2)): Accuracy percentage (e.g., `85.00%`).
  - `status` (TEXT): `in_progress` or `completed`.
  - `started_at` / `completed_at` (TIMESTAMPTZ).

### 6. `attempt_answers`
- **Purpose**: Logs each arrow release (chosen option, correctness, timestamp) for granular mastery analytics.
- **Key Columns**:
  - `id` (UUID, PK).
  - `attempt_id` (UUID, FK): References `attempts(id) ON DELETE CASCADE`.
  - `question_id` (UUID, FK): References `questions(id) ON DELETE CASCADE`.
  - `user_id` (UUID, FK): References `auth.users(id) ON DELETE CASCADE`.
  - `selected_index` (INT): The option selected by the user.
  - `is_bullseye` (BOOLEAN): `true` if selected option equals question's `correct_index`.
  - `answered_at` (TIMESTAMPTZ).

---

## ⚡ Performance Indexes Rationale

Foreign key columns and high-frequency filter columns are indexed to maintain sub-millisecond query execution:

1. **Foreign Key Lookups**:
   - `idx_documents_user_id` on `documents(user_id)`
   - `idx_chunks_document_id` on `chunks(document_id)`
   - `idx_quizzes_document_id` on `quizzes(document_id)`
   - `idx_questions_quiz_id` on `questions(quiz_id)`
   - `idx_attempts_quiz_id` on `attempts(quiz_id)`
   - `idx_attempt_answers_attempt_id` on `attempt_answers(attempt_id)`
2. **Composite & Sequential Ordering**:
   - `idx_chunks_doc_page` on `chunks(document_id, page_number)` — Accelerates assembling document text in chronological page order.
   - `idx_questions_quiz_arrow_order` on `questions(quiz_id, arrow_order ASC)` — Ensures sequential delivery of quiz arrows.
   - `idx_documents_created_at` and `idx_quizzes_created_at` — Powers rapid sorting for dashboard vaults.

---

## 🛡️ Row Level Security (RLS) & Viva Defense Rationale

### 1. Why RLS is Essential in Multi-Tenant Applications
In traditional web architectures, multi-tenant isolation relies entirely on developers remembering to add `WHERE user_id = :current_user` to every single SQL statement. If an endpoint omits that condition or has a bug, the entire database leaks.

Supabase enables PostgreSQL Row Level Security (RLS), which moves authorization **directly into the database engine**:
- Every query executed by an authenticated client automatically evaluates the session's `auth.uid()`.
- If a query attempts to read or modify rows belonging to another user, PostgreSQL automatically filters them out as if they do not exist (returning empty sets or 0 affected rows).

### 2. Policy Structure on Every Table
Every table (`documents`, `chunks`, `quizzes`, `questions`, `attempts`, `attempt_answers`) implements four distinct policies:

| Operation | Policy Scope | Condition | Viva Defense Rationale |
|-----------|--------------|-----------|------------------------|
| **`SELECT`** | `TO authenticated` | `USING (auth.uid() = user_id)` | Prevents User B from snooping on User A's uploaded PDFs, quiz questions, or exam scores. |
| **`INSERT`** | `TO authenticated` | `WITH CHECK (auth.uid() = user_id)` | Prevents a user from inserting records on behalf of someone else or impersonating another student. |
| **`UPDATE`** | `TO authenticated` | `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)` | Prevents modifying another user's rows and prohibits reassigning ownership (`user_id`). |
| **`DELETE`** | `TO authenticated` | `USING (auth.uid() = user_id)` | Guarantees users can only delete their own documents and quivers. |

### 3. Why User ID is Taken from the JWT, Never the Request Body
A critical security principle enforced across both FastAPI and Supabase:
- **The Threat**: If an API endpoint accepts `{ "user_id": "victim-uuid", ... }` in the JSON request body, any authenticated user could supply a victim's UUID and tamper with their data.
- **The Solution**: The FastAPI backend extracts the `user_id` strictly from the cryptographically verified JWT payload (`user.id = payload["sub"]`). The caller cannot forge this identity without possessing the Supabase signing secret.

### 4. Cascade Deletion (`ON DELETE CASCADE`)
- When a user deletes their account (`auth.users`), PostgreSQL cascades and purges all their documents, chunks, quizzes, and attempts cleanly.
- When a user deletes a document, its associated chunks and quivers are purged without leaving orphaned data.

---

## 🚀 Migration Execution Guide

Migration files are located in `/supabase/migrations`:

| File | Purpose |
|------|---------|
| `00_full_schema.sql` | **All-in-one script** containing tables, constraints, triggers, indexes, and RLS policies. |
| `01_create_tables.sql` | Step 1: Creates all 6 core tables with foreign keys and `updated_at` triggers. |
| `02_create_indexes.sql` | Step 2: Creates lookup and ordering indexes for performance. |
| `03_enable_rls_and_policies.sql` | Step 3: Enables RLS on all 6 tables and applies idempotent SELECT/INSERT/UPDATE/DELETE policies. |

### How to Run in Supabase:
1. Open the [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to your Quivers project.
3. On the left navigation bar, click **SQL Editor**.
4. Click **+ New query**.
5. Copy and paste the entire contents of `supabase/migrations/00_full_schema.sql`.
6. Click **Run** (or press `Ctrl + Enter`).
7. You will see: `Success. No rows returned`.

*(Alternatively, run `01_create_tables.sql`, then `02_create_indexes.sql`, then `03_enable_rls_and_policies.sql` in numbered sequence).*

---

## 🔍 How to Verify in Supabase Dashboard & App

### 1. Verify in Supabase Dashboard
- **Table Editor**: Click **Table Editor** on the left. You should see all 6 tables: `documents`, `chunks`, `quizzes`, `questions`, `attempts`, `attempt_answers`.
- **RLS Verification**: In the Table Editor, look at the top right of each table view. A green shield icon displaying **"RLS Enabled"** must be visible on every table.
- **Policies**: Go to **Authentication** -> **Policies**. Verify each table has 4 active policies (`SELECT`, `INSERT`, `UPDATE`, `DELETE`).

### 2. Verify in Quivers Web Application

#### Test A: New User Sign Up & Log In
1. Start the backend (`uvicorn app.main:app --reload` inside `backend/`) and frontend (`npm run dev` inside `frontend/`).
2. Visit `http://localhost:3000`.
3. Click **Log In** in the top navigation or on the **Supabase Auth & RLS Verification Card**.
4. Switch to **Create Account** tab and enter an email and password (min 6 characters).
5. Upon registration, you are immediately logged in. The Navbar displays your authenticated email and your status badge switches to **Vault**.

#### Test B: Unauthenticated Request Rejection (Backend Verification)
1. On `http://localhost:3000#auth-verification`, click the button **"2. Test No Token"**.
2. Notice the live result:
   - **Endpoint**: `/api/auth/me (No Bearer Token)`
   - **Status**: `HTTP 401 Unauthorized`
   - **Detail**: `"Authentication required. Please provide a valid Bearer token in the Authorization header."`
3. Click **"3. Test Forged Token"**. Notice the backend rejects the tampered signature with `HTTP 401`.

#### Test C: Multi-User Data Isolation (RLS Proof)
1. In Browser 1 (e.g. Chrome normal), log in as `user1@test.com` and upload a document.
2. Open Browser 2 (e.g. Chrome Incognito), log in as `user2@test.com`.
3. In Browser 2, visit `http://localhost:3000/quivers`.
4. Observe that `user2` cannot see any of `user1`'s documents or quivers.
5. In Supabase Table Editor, you can see both users' rows in the database, proving that the engine itself filtered the rows based on `auth.uid() = user_id`.
