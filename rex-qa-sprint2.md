# Rex QA Report: Sprint 2 Knowledge Base

Overall verdict: FAIL

Environment note:
- Sandbox blocked `.git/index.lock`, so I could not create `rex/sprint2-qa` in-place. I reproduced the requested merge in a temp workspace from `origin/sprint/2-knowledge-base` + `origin/spark/s-api-routes` + `origin/chip/c-ui-components` because the two feature branches touch disjoint files.

Build and test status:
- ❌ `pnpm build`
  - Fails in `apps/worker` because the KB ingest pipeline imports modules that are not available in the installed workspace state used for QA. Failure surfaces at `apps/worker/src/kb/embedder.ts:44`, `apps/worker/src/kb/parser.ts:38`, `apps/worker/src/kb/parser.ts:49`, `apps/worker/src/kb/tagger.ts:10`, and `apps/worker/src/kb/ingest.ts:16`.
- ✅ `pnpm test`
  - Root `test` script is `turbo run test`. It exited 0, but it did not execute any substantive package test suites during QA.

Checklist:
- ❌ Upload: `POST /kb/documents/upload` saves the file and queues `kb:index`, and the UI polls `GET /kb/documents/:id/status`, but the worker build is currently broken, so the ingest leg is not releasable end-to-end.
- ✅ Search: `GET /kb/search?q=test` is wired to `searchChunks(...)` in `apps/api/src/routes/kb/index.ts:480` and `apps/api/src/services/kb/retrieval.ts:67`.
- ❌ Attach from KB: the shipped flow does not use `POST /kb/context` for prompt execution. The modal only lists documents, and execute retrieves chunks directly server-side instead.
- ✅ Citations: citations are emitted in the SSE stream and rendered by `CitationPanel`.
- ✅ Save to KB: `saveToKb` on execute creates a `KbDocument` and runs inline ingest.
- ✅ Collections: create / rename / delete exist, and delete reparents child collections and unassigns documents.
- ❌ Auth: tenant enforcement is incomplete on `POST /kb/context`; mixed owned + foreign document IDs are accepted instead of rejected.

Bugs:
1. High: `POST /kb/context` accepts partial cross-tenant input instead of rejecting the request when any requested document is outside the caller tenant. `apps/api/src/routes/kb/context.ts:52` through `apps/api/src/routes/kb/context.ts:62`
2. High: "Attach from KB" does not call `POST /kb/context`, so the end-to-end path in the checklist is not implemented. The modal only loads document lists at `apps/web/src/components/kb/AttachFromKb.tsx:34`, and prompt execution bypasses the route by calling retrieval directly in `apps/web/src/app/(dashboard)/[tenantSlug]/prompts/[id]/page.tsx:108` and `apps/api/src/routes/prompts.ts:149`.
3. High: Sprint 2 cannot be built cleanly because the KB worker path fails TypeScript/module resolution in QA. Failure points are `apps/worker/src/kb/embedder.ts:44`, `apps/worker/src/kb/parser.ts:38`, `apps/worker/src/kb/parser.ts:49`, `apps/worker/src/kb/tagger.ts:10`, and `apps/worker/src/kb/ingest.ts:16`.
4. Medium: KB browse search mode is misleading in the UI. The page passes `mode`, but the client API ignores it and never calls `/kb/search`, so switching to "semantic" does nothing. `apps/web/src/app/(dashboard)/[tenantSlug]/kb/page.tsx:51` and `apps/web/src/components/kb/api.ts:86`
