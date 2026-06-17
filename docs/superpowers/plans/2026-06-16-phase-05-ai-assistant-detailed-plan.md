# Phase 05 AI Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add controlled AI extraction, suggestions, explanations, and report Q&A without allowing AI to post accounting changes directly.

**Architecture:** AI works through a tool layer that can read data and create drafts/suggestions only. Posting still flows through human-approved services from earlier phases. Every model output stores source evidence, confidence, prompt version, and audit/event records.

**Tech Stack:** TypeScript, Hono, oRPC, Zod, PostgreSQL, Drizzle, object storage, background jobs, chosen LLM provider abstraction, optional vector extension after proof.

---

## Foundation Alignment

Before executing this plan, reconcile it with `docs/superpowers/plans/2026-06-17-accounting-foundation-schema-revision-plan.md`.

- AI reads from deterministic services, `source_document`, `journal_batch`, reports, attachments, `audit_event`, and `outbox_event`.
- AI may create drafts or suggestions only; it must not write posted batches directly.
- AI-generated suggestions require human approval before posting.
- Shared AI-safe contracts belong in `packages/core`; provider adapters and suggestion services belong in `packages/api`.

## Scope

Build:

- Receipt extraction to draft expense.
- Bank transaction categorization suggestions.
- Invoice draft suggestions.
- Report Q&A over trusted report services.
- Assistant conversation UI.
- Suggestion queue and approval/rejection.

Do not build autonomous posting, autonomous GST filing, autonomous bank approvals, external customer-facing chatbot, or model fine-tuning in this phase.

## Schema Additions

### `ai_provider_config`

- `id`
- `organization_id`
- `provider`
- `model`
- `is_enabled`
- `redaction_enabled`
- `created_at`
- `updated_at`

### `ai_conversation`

- `id`
- `organization_id`
- `title`
- `context_type`: `GENERAL`, `REPORT`, `DOCUMENT`, `BANK_RECONCILIATION`
- `context_id`
- `created_by`
- `created_at`
- `updated_at`

### `ai_message`

- `id`
- `organization_id`
- `conversation_id`
- `role`: `USER`, `ASSISTANT`, `TOOL`, `SYSTEM`
- `content`
- `metadata_json`
- `created_at`

### `ai_tool_call`

- `id`
- `organization_id`
- `conversation_id`
- `message_id`
- `tool_name`
- `input_json`
- `output_json`
- `status`: `REQUESTED`, `SUCCESS`, `FAILED`, `DENIED`
- `created_at`
- `completed_at`

### `ai_extraction`

- `id`
- `organization_id`
- `attachment_id`
- `extraction_type`: `RECEIPT`, `INVOICE`, `BANK_STATEMENT`
- `status`: `PENDING`, `SUCCESS`, `FAILED`, `REVIEWED`
- `raw_text`
- `structured_json`
- `confidence_score`
- `source_spans_json`
- `created_by`
- `created_at`
- `reviewed_by`
- `reviewed_at`

### `ai_suggestion`

- `id`
- `organization_id`
- `suggestion_type`: `DRAFT_EXPENSE`, `BANK_MATCH`, `INVOICE_LINE`, `REPORT_EXPLANATION`
- `target_type`
- `target_id`
- `suggested_action_json`
- `evidence_json`
- `confidence_score`
- `status`: `PENDING`, `ACCEPTED`, `REJECTED`, `EXPIRED`
- `created_by`
- `accepted_by`
- `accepted_at`
- `rejected_by`
- `rejected_at`
- `created_at`

### `ai_prompt_version`

- `id`
- `name`
- `version`
- `prompt_hash`
- `purpose`
- `created_at`

## Backend Contracts

Internal oRPC routers:

- `ai.receipts.extract`
- `ai.suggestions.list`
- `ai.suggestions.accept`
- `ai.suggestions.reject`
- `ai.assistant.createConversation`
- `ai.assistant.sendMessage`
- `ai.assistant.listConversations`
- `ai.tools.preview`

Future public REST/OpenAPI mapping:

- `POST /api/v1/ai/extractions/receipt`
- `GET /api/v1/ai/suggestions`
- `POST /api/v1/ai/suggestions/{id}/accept`
- `POST /api/v1/ai/suggestions/{id}/reject`

Public exposure waits until Phase 6 or later and should be disabled by default.

Tool permission classes:

- Read tools: allowed for owner, operator, accountant.
- Draft tools: allowed for owner, operator, accountant.
- Posting tools: not available to AI.

## Task Checklist

### Task 1: AI Schema

**Files:**

- Create: `packages/db/src/schema/ai.ts`
- Modify: `packages/db/src/schema/index.ts`
- Test: `packages/db/src/schema/ai.test.ts`

- [ ] Test all organization-owned AI tables include `organization_id`.
- [ ] Add provider config, conversation, message, tool call, extraction, suggestion, prompt version tables.
- [ ] Add indexes by organization, status, conversation, target.
- [ ] Generate and run migration.
- [ ] Commit: `feat: add ai assistant schema`.

### Task 2: AI Provider Boundary

**Files:**

- Create: `packages/ai/src/provider.ts`
- Create: `packages/ai/src/redaction.ts`
- Create: `packages/ai/src/json-output.ts`
- Test: `packages/ai/src/json-output.test.ts`

- [ ] Test malformed model JSON returns `AI_INVALID_JSON`.
- [ ] Test redaction masks PAN, GSTIN, email, and phone.
- [ ] Define provider interface with `generateText`, `generateJson`, and `extractDocument`.
- [ ] Implement no-op fake provider for tests.
- [ ] Run `rtk vp run --filter @tsu-stack/ai test:unit`.
- [ ] Commit: `feat: add ai provider boundary`.

### Task 3: Receipt Extraction

**Files:**

- Create: `packages/api/src/services/ai/receipt-extraction.service.ts`
- Test: `packages/api/src/services/ai/receipt-extraction.service.test.ts`

- [ ] Test receipt extraction creates `ai_extraction`.
- [ ] Test successful extraction creates draft expense suggestion, not posted expense.
- [ ] Test extraction stores evidence and confidence.
- [ ] Implement receipt-to-draft-expense suggestion mapping.
- [ ] Emit `ai.extraction_completed` and `ai.suggestion_created`.
- [ ] Run `rtk vp run --filter @tsu-stack/api test:unit`.
- [ ] Commit: `feat: add receipt extraction suggestions`.

### Task 4: Bank And Invoice Suggestions

**Files:**

- Create: `packages/api/src/services/ai/bank-suggestion.service.ts`
- Create: `packages/api/src/services/ai/invoice-suggestion.service.ts`
- Test: `packages/api/src/services/ai/bank-suggestion.service.test.ts`
- Test: `packages/api/src/services/ai/invoice-suggestion.service.test.ts`

- [ ] Test bank suggestion creates pending suggestion only.
- [ ] Test invoice line suggestion creates pending suggestion only.
- [ ] Test accepting suggestion calls existing draft service, not journal service.
- [ ] Test rejected suggestion cannot be accepted.
- [ ] Implement suggestion lifecycle.
- [ ] Run `rtk vp run --filter @tsu-stack/api test:unit`.
- [ ] Commit: `feat: add ai business suggestions`.

### Task 5: Report Q&A Tools

**Files:**

- Create: `packages/api/src/services/ai/tools/report-tools.ts`
- Create: `packages/api/src/services/ai/assistant.service.ts`
- Test: `packages/api/src/services/ai/assistant.service.test.ts`

- [ ] Test assistant can call trial balance read tool.
- [ ] Test assistant can call receivables summary read tool.
- [ ] Test assistant answer stores source references.
- [ ] Test assistant cannot call posting service.
- [ ] Implement allowlisted tool registry.
- [ ] Emit `ai.tool_called`.
- [ ] Run `rtk vp run --filter @tsu-stack/api test:unit`.
- [ ] Commit: `feat: add report question assistant`.

### Task 6: oRPC And Hono

**Files:**

- Create: `packages/api/src/routers/ai.router.ts`
- Create: `packages/api/src/openapi/internal-ai.snapshot.test.ts`
- Modify: `packages/api/src/router.ts`

- [ ] Add AI oRPC procedures.
- [ ] Enforce feature flag and organization permissions.
- [ ] Add streaming response path for assistant messages if supported by selected transport.
- [ ] Generate internal OpenAPI snapshot.
- [ ] Keep public AI endpoints disabled.
- [ ] Run `rtk vp run --filter @tsu-stack/api test:unit`.
- [ ] Commit: `feat: add ai rpc contracts`.

### Task 7: Frontend

**Files:**

- Create: `apps/web/src/routes/assistant.tsx`
- Create: `apps/web/src/routes/ai/suggestions.tsx`
- Create: `apps/web/src/components/ai/suggestion-card.tsx`
- Create: `apps/web/src/components/ai/assistant-panel.tsx`
- Modify: `apps/web/src/routes/expenses/new.tsx`
- Modify: `apps/web/src/routes/bank/reconcile.tsx`

- [ ] Build receipt upload to draft suggestion flow.
- [ ] Build suggestion inbox with accept/reject.
- [ ] Build assistant panel with source links.
- [ ] Add AI suggestion affordances to expense and bank screens.
- [ ] Display confidence without pretending certainty.
- [ ] Run `rtk vp run --filter /web check`.
- [ ] Run `rtk vp run -r build`.
- [ ] Commit: `feat: add ai assistant ui`.

## Exit Checklist

- [ ] AI cannot post journals.
- [ ] AI cannot approve bank matches.
- [ ] AI suggestions require human accept/reject.
- [ ] Evidence is stored for every suggestion.
- [ ] Confidence is stored for every suggestion.
- [ ] Source documents are linked in answers.
- [ ] Prompt versions are stored.
- [ ] Redaction exists for sensitive identifiers.
- [ ] oRPC contracts pass tests.
- [ ] Public AI API remains disabled unless explicitly enabled in Phase 6.
