# Iris Sprint 2 Re-Review

Requested target path `/Users/leos/.openclaw/workspace/org/iris-review-sprint2.md` is not writable from the current sandbox. This updated review is written to `/Users/leos/.openclaw/org/projects/wren/iris-review-sprint2.md` instead.

## Branch verdicts

### `origin/spark/s-api-routes`
❌ NEEDS MORE FIXES

### `origin/chip/c-ui-components`
⚠️ APPROVED WITH NOTES

## Focused re-review results

### `origin/spark/s-api-routes`

- Confirmed fixed: `POST /documents/upload` now wraps `ensureKnowledgeBase()`, `mkdir()`, and `writeFile()` in structured `try/catch` blocks and returns controlled storage error payloads instead of falling through to Fastify defaults.
- Confirmed fixed: KB list/search query parsing now reads `q` via `getRequestQuery(request)` rather than `query`.
- Remaining blocker: [apps/api/src/routes/kb/index.ts](/Users/leos/.openclaw/org/projects/wren/apps/api/src/routes/kb/index.ts) still returns raw Prisma shapes from `GET /documents`, `GET /documents/:id`, and `PATCH /documents/:id` (`collection`, `_count`) rather than the UI contract (`collectionName`, `chunkCount`, `chunks`). The current branch head still sends `reply.send({ data: documents })` and `reply.send({ data: document })` directly at the route level, so Chip’s detail/list pages will not receive the shape they render against.
- Remaining note: `GET /search` still has no route-level error handling around `searchChunks()`. That is not one of the requested fixes, but the failure mode is unchanged from the earlier review.

### `origin/chip/c-ui-components`

- Confirmed fixed: tag editing now uses `PATCH /api/v1/kb/documents/:id`.
- Confirmed fixed: upload now posts to `/api/v1/kb/documents/upload`.
- Confirmed fixed: document search now sends `?q=` instead of `?query=`.
- Confirmed fixed: the localStorage/mock fallback path has been removed from the KB API client.
- Confirmed fixed: the sub-collection action is now shown only for root collections.
- Confirmed fixed: collection delete now refetches collections and documents from the API after delete instead of mutating the tree into a state Spark’s backend never returns.
- Remaining note: [page.tsx](/Users/leos/.openclaw/org/projects/wren/apps/web/src/app/(dashboard)/[tenantSlug]/kb/documents/[id]/page.tsx#L220) still renders placeholder copy for “Similar documents” (`"Placeholder ranking until Spark’s similarity endpoint is committed."`). That was previously a warning, not a blocker, and it remains unresolved.

## Recommendation

Do not merge `origin/spark/s-api-routes` yet. The targeted fixes landed, but the document response contract blocker is still open.

`origin/chip/c-ui-components` is acceptable with notes for the previously flagged blockers. All six requested fixes are present on the latest branch head, with only the non-blocking similar-documents placeholder still outstanding.
