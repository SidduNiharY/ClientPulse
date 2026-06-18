# Sheet-First Personal Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Convert the app into a sheet-first reporting workspace with a professional personal dashboard, simple Google Sheets imports, scheduled sync support, AI-provider-backed insights, and production provider checks while removing direct API integration setup from the user-facing product.

**Architecture:** Keep the existing Prisma reporting schema and import pipeline, but extract import execution into a reusable server service so both the API route and scheduled sync script use the same code. Keep direct API enum/table compatibility for existing databases, but remove direct API setup from nav/forms/import execution and retire the OAuth endpoint surface. Make Google Sheets URL parsing happen inside the connector so both UI and scheduled jobs get the same behavior.

**Tech Stack:** Next.js App Router, React 19, Prisma/PostgreSQL, TypeScript, Vitest, tsx scripts, Google Sheets CSV export/Sheets API, Nodemailer/HTTP WhatsApp provider, optional OpenAI-compatible chat completion endpoint for AI insights.

---

## File Structure

- Modify: `src/server/connectors/googleSheetsConnector.ts` - accept Google Sheet URLs, parse spreadsheet IDs/gids, and fetch public CSV by gid when available.
- Create: `src/server/imports/runImport.ts` - reusable import execution service shared by API and scheduled sync.
- Modify: `src/app/api/imports/route.ts` - delegate to `runImport`, remove direct API credential/decryption branches.
- Create: `scripts/run-scheduled-sync.ts` - run active sheet/script/BigQuery mappings on a rolling date window.
- Modify: `package.json` - add `sync:scheduled`.
- Modify: `src/server/reporting/insights.ts` - add environment-backed external AI provider with strict fallback to rule-based insights.
- Modify: `src/server/reporting/reportBuilder.ts` - call async `generateInsights`.
- Create: `src/server/providers/validateProductionSetup.ts` - validate SMTP, WhatsApp, and optional AI env setup.
- Create: `src/app/api/system/provider-health/route.ts` - expose provider readiness for the dashboard.
- Modify: `src/app/(dashboard)/page.tsx` - replace static overview with a data-backed professional personal dashboard.
- Modify: `src/components/ImportForm.tsx` - make Google Sheets the primary path, add Sheet URL input, add staged progress bar.
- Modify: `src/components/AccountMappingForm.tsx` - remove direct API and third-party connector choices from frontend.
- Modify: `src/app/api/clients/[clientId]/mappings/route.ts` - reject direct API and third-party connector mappings at the API boundary.
- Modify: `src/components/DashboardNav.tsx` - remove `/connections` from visible navigation.
- Modify/Delete: `src/app/(dashboard)/connections/page.tsx`, `src/app/api/connections/oauth/route.ts` - retire direct API setup surfaces.
- Update tests: `tests/unit/googleSheetsConnector.test.ts`, `tests/unit/importsRoute.test.ts`, `tests/unit/insights.test.ts`.

---

## Task 1: Google Sheets URL Import UX

**Files:**
- Modify: `src/server/connectors/googleSheetsConnector.ts`
- Modify: `src/components/ImportForm.tsx`
- Test: `tests/unit/googleSheetsConnector.test.ts`

- [x] **Step 1: Add failing tests for Google Sheet URL parsing**

Add tests that pass `sheetUrl: "https://docs.google.com/spreadsheets/d/sheet123/edit#gid=456"` without `spreadsheetId` or `range` and assert that public CSV fetch uses `/d/sheet123/gviz/tq?tqx=out:csv&gid=456`.

Run: `npm test -- tests/unit/googleSheetsConnector.test.ts`
Expected: FAIL because the connector currently requires `spreadsheetId` and `range`.

- [x] **Step 2: Implement URL parsing in the connector**

Add a helper that returns `{ spreadsheetId, gid, range }`, with fallback `range: "Sheet1!A:Z"` when no range is supplied. Public CSV fetch should prefer `gid` over `sheet`.

- [x] **Step 3: Add Sheet URL and staged loading UI**

In `ImportForm`, add a required `sheetUrl` input for Google Sheets mappings, send it through `connectorConfig`, set `sourceReference` to the URL, and replace the plain modal with a determinate staged progress bar using local timer stages while the synchronous import request runs.

- [x] **Step 4: Verify**

Run: `npm test -- tests/unit/googleSheetsConnector.test.ts`
Expected: PASS.

---

## Task 2: Shared Import Service And Scheduled Sync

**Files:**
- Create: `src/server/imports/runImport.ts`
- Modify: `src/app/api/imports/route.ts`
- Create: `scripts/run-scheduled-sync.ts`
- Modify: `package.json`
- Test: `tests/unit/importsRoute.test.ts`

- [x] **Step 1: Extract import execution**

Move the import route's sync-run creation, connector execution, raw-row writes, metric-row writes, replace logic, and connector-health updates into `runImport(input)`.

- [x] **Step 2: Remove direct API execution**

`runImport` should support only `csv_upload`, `platform_script`, `google_sheets`, and `bigquery`. If a mapping is `direct_api` or `third_party_connector`, return a clear error: `This workspace imports data through Google Sheets, CSV, scripts, or BigQuery. Direct API setup has been disabled.`

- [x] **Step 3: Delegate API route to service**

Make `POST /api/imports` validate the request and call `runImport`. Preserve the JSON response shape: `syncRunId`, `status`, `rowsImported`, `metricsAdded`, `metricsReplaced`, `warnings`, `healthStatus`.

- [x] **Step 4: Add scheduled sync script**

Create `scripts/run-scheduled-sync.ts`. It should load active `google_sheets`, `platform_script`, and `bigquery` mappings, default to the last 7 complete days ending yesterday, use `replace` for sheets/scripts and `append` for BigQuery, call `runImport`, print one line per mapping, and set non-zero exit code if any mapping fails.

- [x] **Step 5: Add npm script**

Add `"sync:scheduled": "tsx scripts/run-scheduled-sync.ts"` to `package.json`.

- [x] **Step 6: Verify**

Run: `npm test -- tests/unit/importsRoute.test.ts`
Expected: PASS.

---

## Task 3: External AI Insight Provider

**Files:**
- Modify: `src/server/reporting/insights.ts`
- Modify: `src/server/reporting/reportBuilder.ts`
- Test: `tests/unit/insights.test.ts`
- Test: `tests/unit/reportBuilder.test.ts`

- [x] **Step 1: Add tests for external AI fallback**

Test that `generateInsights({ provider: "external_ai", ... })` falls back to rule-based insights when env is missing or provider output is invalid.

- [x] **Step 2: Add provider adapter**

Implement `createExternalAiInsightAgent()` that reads `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, and optional `AI_BASE_URL`. Use an OpenAI-compatible `/chat/completions` payload when configured. Validate returned JSON as `InsightDraft[]`, keep only known `insightType` values, cap text length, and fall back to rule-based insights on any error.

- [x] **Step 3: Wire report builder**

Update report generation to call async `generateInsights` with `provider: process.env.AI_PROVIDER ? "external_ai" : "rule_based"`.

- [x] **Step 4: Verify**

Run: `npm test -- tests/unit/insights.test.ts tests/unit/reportBuilder.test.ts`
Expected: PASS.

---

## Task 4: Production Provider Setup Checks

**Files:**
- Create: `src/server/providers/validateProductionSetup.ts`
- Create: `src/app/api/system/provider-health/route.ts`
- Modify: `src/app/(dashboard)/page.tsx`

- [x] **Step 1: Implement provider validator**

Return statuses for email, WhatsApp, AI, and scheduled sync config. Email is ready when `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` exist. WhatsApp is ready when `WHATSAPP_API_URL` exists. AI is optional and ready when `AI_PROVIDER` and `AI_API_KEY` exist. Scheduled sync is ready when the `sync:scheduled` script exists.

- [x] **Step 2: Expose health endpoint**

Add `GET /api/system/provider-health` returning `{ providers: [...] }`.

- [x] **Step 3: Show provider readiness on dashboard**

Render concise readiness rows in the dashboard instead of API setup copy.

---

## Task 5: Personal Dashboard

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`

- [x] **Step 1: Replace static KPIs**

Query counts for clients, active sheet/script mappings, metric rows, successful sync runs, pending approvals, and failed syncs.

- [x] **Step 2: Build professional dashboard layout**

Use restrained workbench styling: compact KPI cards, today's focus queue, provider readiness, latest imports, and report actions. Avoid marketing hero copy and remove API integration setup links.

- [x] **Step 3: Verify render**

Run: `npm run build`
Expected: dashboard compiles.

---

## Task 6: Remove Direct API Setup Surface

**Files:**
- Modify: `src/components/DashboardNav.tsx`
- Modify: `src/components/AccountMappingForm.tsx`
- Modify: `src/app/api/clients/[clientId]/mappings/route.ts`
- Modify: `src/app/api/imports/route.ts`
- Delete or neutralize: `src/app/(dashboard)/connections/page.tsx`
- Delete or neutralize: `src/app/api/connections/oauth/route.ts`
- Update tests as needed.

- [x] **Step 1: Remove navigation and form choices**

Remove `/connections` from `DashboardNav`; remove `direct_api` and `third_party_connector` from mapping/fallback dropdowns.

- [x] **Step 2: Block direct API mapping creation**

Update mapping API schema to accept only `platform_script`, `google_sheets`, `bigquery`, and `csv_upload`.

- [x] **Step 3: Neutralize direct API pages/routes**

Make `/connections` redirect to `/imports` or show a sheet-first message. Make `/api/connections/oauth` return 410 Gone with a sheet-first message.

- [x] **Step 4: Verify**

Run: `npm test`
Expected: PASS after updating obsolete direct API tests.

---

## Self-Review

- Spec coverage: scheduled sync, AI provider, provider setup checks, personal dashboard, API setup removal, simple Google Sheets URL import, and loading/progress are covered.
- Placeholder scan: no `TBD`, no `TODO`, no unspecified edge handling.
- Type consistency: all new services use existing `Connector`, `ConnectorResult`, Prisma `IngestionMethod`, and current import response fields.
