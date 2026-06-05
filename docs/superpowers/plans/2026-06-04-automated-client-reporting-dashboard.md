# Automated Client Reporting Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]` / `- [x]`) syntax for tracking.

**Goal:** Build an internal agency application that imports marketing and commerce data, generates weekly/monthly PDF reports, requires approval, and sends approved reports by email.

**Architecture:** Build a full-stack TypeScript web app with a normalized reporting database, connector interface, script-assisted import adapters for MVP, and report generation services that can later accept direct API connectors without changing the reporting engine. The first release focuses on controlled imports from CSV, Google Sheets, and BigQuery plus manual fallback, while preserving source traceability for every metric.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Prisma, PostgreSQL, Zod, Vitest, Playwright, Nodemailer, Recharts, Playwright HTML-to-PDF rendering.

## Implementation Status

Last updated: 2026-06-05.

- [x] Task 1: Project Foundation
- [x] Task 2: Database Schema And Seed Data
- [x] Task 3: Script-Assisted Import Connectors
- [x] Task 4: Client Management And Account Mapping
- [x] Task 5: Metric Calculations And Revenue Source Flexibility
- [x] Task 6: Imports, Connector Health, And Data Quality
- [x] Task 7: Anomaly Detection And Budget Pacing
- [x] Task 8: Report Builder, Preview, And Versioning
- [x] Task 9: PDF Generation
- [x] Task 10: Approval Inbox And Delivery Workflow
- [x] Task 11: Email Delivery
- [x] Task 12: AI-Assisted Insights
- [x] Task 13: MVP End-To-End Report Scenario
- [x] Task 14: Phase 2 Direct API Connectors
- [x] Task 15: Phase 3 And Phase 4 Expansion

Current verification evidence:

- `npm run lint`: passed.
- `npm test`: 17 files, 34 tests passed.
- `npm run test:e2e`: 2 tests passed.
- `npm run build`: passed with `/portfolio`, 8 generated static pages, and dynamic API routes.

Remaining architecture work from this plan is complete: WhatsApp delivery, portfolio dashboard, profit reporting, forecasting, and opportunity detection are implemented.

---

## Planning Assumptions

- Current workspace has `PRD.md` only and is not initialized as a git repository.
- The MVP starts with script-assisted imports: CSV/manual upload, Google Sheets, and BigQuery.
- Direct Google Ads, Meta, GA4, and Shopify OAuth/API connectors are Phase 2 implementations behind the same connector interface.
- WhatsApp delivery, client portal, custom template builder, profit reporting, advanced forecasting, and opportunity detection are expansion phases.
- The application is internal for agency users and admins; no client login exists in MVP.
- Every task ends with tests and a commit once the repository has been initialized.

## Completion Scenarios

### Scenario 0: Foundation

Create the app, database, test tooling, authentication-ready shell, and base layout. This scenario is complete when the app boots locally, tests run, and the database schema exists.

### Scenario 1: MVP Reporting Pilot

Build the first usable flow for one agency user:

1. Add a client.
2. Map Google Ads, Meta Ads, GA4, and Shopify accounts.
3. Import script-assisted data from CSV/Google Sheets/BigQuery.
4. Select weekly or monthly report range.
5. Select ad source and revenue source.
6. Generate normalized metrics.
7. Preview a report.
8. Generate PDF.
9. Approve report.
10. Send by email.

This scenario is the first production pilot target.

### Scenario 2: Reliability And Review

Add connector health, data quality score, anomaly detection, budget pacing, report version invalidation, and approval inbox behavior. This scenario is complete when bad or stale data is visible before PDF approval.

### Scenario 3: Direct Integrations

Implement direct Google Ads, Meta Ads, GA4, and Shopify connectors behind the MVP connector interface. This scenario is complete when a client can switch from sheet/script import to direct API import without changing report generation code.

### Scenario 4: Agency Intelligence

Add AI-assisted insights, portfolio dashboard, stronger anomaly detection, WhatsApp delivery, profit reporting, and forecasting. This scenario is complete when the agency can monitor all clients and prioritize reports or data problems from one dashboard.

## File Structure

Create these files during implementation:

- `package.json`: scripts, dependencies, and project metadata.
- `.env.example`: required environment variables for database, email, BigQuery, Sheets, and AI provider.
- `prisma/schema.prisma`: reporting database schema.
- `prisma/seed.ts`: demo client, accounts, goals, budgets, and sample data.
- `src/app/layout.tsx`: root shell.
- `src/app/(dashboard)/layout.tsx`: internal app navigation.
- `src/app/(dashboard)/page.tsx`: portfolio overview for MVP health and pending reports.
- `src/app/(dashboard)/clients/page.tsx`: client list and create form.
- `src/app/(dashboard)/clients/[clientId]/page.tsx`: client detail, mappings, goals, budgets.
- `src/app/(dashboard)/imports/page.tsx`: import runs and upload/read actions.
- `src/app/(dashboard)/health/page.tsx`: connector health dashboard.
- `src/app/(dashboard)/reports/new/page.tsx`: report setup form.
- `src/app/(dashboard)/reports/[reportId]/page.tsx`: preview, data quality, anomalies, approval actions.
- `src/app/(dashboard)/approvals/page.tsx`: approval inbox.
- `src/app/api/clients/route.ts`: client create/list API.
- `src/app/api/imports/route.ts`: run import API.
- `src/app/api/reports/route.ts`: report draft generation API.
- `src/app/api/reports/[reportId]/approve/route.ts`: approval API.
- `src/app/api/reports/[reportId]/send/route.ts`: delivery API.
- `src/server/db/client.ts`: Prisma client singleton.
- `src/server/connectors/types.ts`: connector interface and normalized row contracts.
- `src/server/connectors/csvConnector.ts`: CSV/manual upload importer.
- `src/server/connectors/googleSheetsConnector.ts`: Google Sheets importer.
- `src/server/connectors/bigQueryConnector.ts`: BigQuery importer.
- `src/server/connectors/directStubs.ts`: typed Phase 2 connector placeholders that return actionable "needs authorization" errors.
- `src/server/normalization/normalizeRows.ts`: maps imported platform rows into metric rows.
- `src/server/reporting/dateRanges.ts`: weekly/monthly date range helpers.
- `src/server/reporting/metrics.ts`: KPI formulas and derived metrics.
- `src/server/reporting/sourceTrace.ts`: source lineage builder.
- `src/server/reporting/dataQuality.ts`: data quality scoring.
- `src/server/reporting/anomalies.ts`: anomaly detection.
- `src/server/reporting/budgetPacing.ts`: pacing calculations.
- `src/server/reporting/insights.ts`: deterministic insight drafts and AI provider adapter.
- `src/server/reporting/reportBuilder.ts`: report version builder.
- `src/server/pdf/reportTemplate.tsx`: report HTML/React template.
- `src/server/pdf/renderPdf.ts`: Playwright PDF renderer.
- `src/server/delivery/email.ts`: SMTP email delivery.
- `src/server/delivery/emailDraft.ts`: editable summary email generation.
- `src/server/audit/reportInvalidation.ts`: invalidates approval when report data changes.
- `src/components/*`: form, table, status badge, KPI, chart, report preview, and approval components.
- `src/lib/format.ts`: currency, percent, number, and date formatting.
- `tests/unit/*.test.ts`: calculation, normalization, quality, anomaly, pacing, and email draft tests.
- `tests/e2e/report-flow.spec.ts`: end-to-end MVP report scenario.

## Core Data Contracts

Add this connector contract in `src/server/connectors/types.ts`:

```ts
export type Platform = "google_ads" | "meta_ads" | "ga4" | "shopify" | "manual";

export type IngestionMethod =
  | "direct_api"
  | "platform_script"
  | "google_sheets"
  | "bigquery"
  | "csv_upload"
  | "third_party_connector";

export type MetricName =
  | "impressions"
  | "clicks"
  | "spend"
  | "conversions"
  | "conversion_value"
  | "revenue"
  | "orders"
  | "leads"
  | "sessions"
  | "active_users"
  | "transactions"
  | "reach"
  | "frequency";

export type DateRange = {
  from: string;
  to: string;
};

export type SourceTrace = {
  platform: Platform;
  connectorType: string;
  sourceAccountId: string;
  originalFieldName: string;
  sourceReference: string;
  syncRunId: string;
  dateRange: DateRange;
  importedAt: string;
};

export type NormalizedMetricRow = {
  clientId: string;
  platform: Platform;
  ingestionMethod: IngestionMethod;
  sourceAccountId: string;
  metricName: MetricName;
  metricValue: number;
  currency: string | null;
  occurredOn: string;
  dimensions: Record<string, string>;
  sourceTrace: SourceTrace;
};

export type ConnectorResult = {
  rows: NormalizedMetricRow[];
  rowsImported: number;
  warnings: string[];
};

export interface Connector {
  readonly connectorType: string;
  fetch(input: {
    clientId: string;
    accountMappingId: string;
    dateRange: DateRange;
    config: Record<string, string>;
  }): Promise<ConnectorResult>;
}
```

Add this report request contract in `src/server/reporting/reportBuilder.ts`:

```ts
export type ReportType = "weekly" | "monthly";
export type AdSourceSelection = "google_ads" | "meta_ads" | "google_ads_meta_ads";
export type RevenueSourceSelection =
  | "shopify"
  | "ga4"
  | "google_ads_conversion_value"
  | "meta_purchase_value"
  | "manual";

export type ReportBuildRequest = {
  clientId: string;
  reportType: ReportType;
  dateRange: DateRange;
  adSource: AdSourceSelection;
  revenueSource: RevenueSourceSelection;
  generatedByUserId: string;
};
```

## Task 1: Project Foundation

**Files:**

- Create: `package.json`
- Create: `.env.example`
- Create: `src/app/layout.tsx`
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/server/db/client.ts`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`

- [x] **Step 1: Generate the app**

Run:

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Expected: Next.js app files are created in the current workspace.

- [x] **Step 2: Install runtime dependencies**

Run:

```bash
npm install @prisma/client zod date-fns recharts nodemailer papaparse googleapis @google-cloud/bigquery playwright
```

Expected: Dependencies are added to `package.json`.

- [x] **Step 3: Install test dependencies**

Run:

```bash
npm install -D prisma vitest jsdom @testing-library/react @testing-library/jest-dom @types/nodemailer @types/papaparse @playwright/test tsx
```

Expected: Dev dependencies are added to `package.json`.

- [x] **Step 4: Add app scripts**

Modify `package.json` scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

- [x] **Step 5: Add environment contract**

Create `.env.example`:

```bash
DATABASE_URL="postgresql://reports:reports@localhost:5432/reports_generator"
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="reports@example.com"
SMTP_PASS="replace-with-secret"
SMTP_FROM="Agency Reports <reports@example.com>"
GOOGLE_SHEETS_CLIENT_EMAIL="service-account@example.iam.gserviceaccount.com"
GOOGLE_SHEETS_PRIVATE_KEY="replace-with-private-key"
BIGQUERY_PROJECT_ID="agency-reporting"
BIGQUERY_CLIENT_EMAIL="service-account@example.iam.gserviceaccount.com"
BIGQUERY_PRIVATE_KEY="replace-with-private-key"
AI_PROVIDER="rule_based"
AI_API_KEY=""
```

- [x] **Step 6: Add test config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true
  }
});
```

Create `tests/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [x] **Step 7: Initialize git and commit**

Run:

```bash
git init
git add .
git commit -m "chore: initialize reporting dashboard app"
```

Expected: Initial commit succeeds.

## Task 2: Database Schema And Seed Data

**Files:**

- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Modify: `src/server/db/client.ts`
- Test: `tests/unit/schema-shape.test.ts`

- [x] **Step 1: Create Prisma schema**

Use this schema structure in `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Platform {
  google_ads
  meta_ads
  ga4
  shopify
  manual
}

enum IngestionMethod {
  direct_api
  platform_script
  google_sheets
  bigquery
  csv_upload
  third_party_connector
}

enum ConnectorHealthStatus {
  healthy
  warning
  failed
  not_connected
  needs_authorization
  stale_data
}

enum ReportStatus {
  draft
  data_ready
  needs_review
  approved
  sent
  failed
  rejected
}

enum ReportType {
  weekly
  monthly
}

enum Severity {
  info
  warning
  critical
}

model User {
  id            String          @id @default(cuid())
  email         String          @unique
  name          String
  role          String
  createdAt     DateTime        @default(now())
  approvals     ApprovalEvent[]
  generatedRuns Report[]
}

model Client {
  id              String           @id @default(cuid())
  name            String
  clientType      String
  primaryEmail    String
  whatsappNumber  String?
  currency        String           @default("INR")
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  accountMappings AccountMapping[]
  goals           ClientGoal[]
  budgets         ClientBudget[]
  syncRuns        SyncRun[]
  metricRows      MetricRow[]
  reports         Report[]
}

model AccountMapping {
  id              String          @id @default(cuid())
  clientId        String
  platform        Platform
  accountName     String
  sourceAccountId String
  ingestionMethod IngestionMethod
  config          Json
  fallbackMethod  IngestionMethod?
  isActive        Boolean         @default(true)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  client          Client          @relation(fields: [clientId], references: [id])
  connectors      Connector[]
  syncRuns        SyncRun[]
}

model Connector {
  id                String                @id @default(cuid())
  accountMappingId  String
  connectorType     String
  healthStatus      ConnectorHealthStatus @default(not_connected)
  lastSuccessfulSync DateTime?
  lastFailedSync    DateTime?
  latestError       String?
  rowsImported      Int                   @default(0)
  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt
  accountMapping    AccountMapping        @relation(fields: [accountMappingId], references: [id])
}

model SyncRun {
  id               String          @id @default(cuid())
  clientId         String
  accountMappingId String
  platform         Platform
  ingestionMethod  IngestionMethod
  dateFrom         DateTime
  dateTo           DateTime
  status           String
  rowsImported     Int             @default(0)
  errorMessage     String?
  startedAt        DateTime        @default(now())
  finishedAt       DateTime?
  client           Client          @relation(fields: [clientId], references: [id])
  accountMapping   AccountMapping  @relation(fields: [accountMappingId], references: [id])
  rawRows          RawSourceRow[]
  metricRows       MetricRow[]
}

model RawSourceRow {
  id              String   @id @default(cuid())
  syncRunId       String
  sourceReference String
  sourcePayload   Json
  importedAt      DateTime @default(now())
  syncRun         SyncRun  @relation(fields: [syncRunId], references: [id])
}

model MetricRow {
  id                String          @id @default(cuid())
  clientId          String
  syncRunId         String
  platform          Platform
  ingestionMethod   IngestionMethod
  sourceAccountId   String
  metricName        String
  metricValue       Decimal
  currency          String?
  occurredOn        DateTime
  dimensions        Json
  originalFieldName String
  sourceReference   String
  importedAt        DateTime        @default(now())
  client            Client          @relation(fields: [clientId], references: [id])
  syncRun           SyncRun         @relation(fields: [syncRunId], references: [id])
}

model ClientGoal {
  id          String   @id @default(cuid())
  clientId    String
  platform    Platform?
  goalType    String
  targetValue Decimal
  createdAt   DateTime @default(now())
  client      Client   @relation(fields: [clientId], references: [id])
}

model ClientBudget {
  id            String   @id @default(cuid())
  clientId      String
  platform      Platform?
  monthlyBudget Decimal
  weeklyBudget  Decimal?
  startsOn      DateTime
  endsOn        DateTime?
  client        Client   @relation(fields: [clientId], references: [id])
}

model Report {
  id              String          @id @default(cuid())
  clientId        String
  reportType      ReportType
  dateFrom        DateTime
  dateTo          DateTime
  adSource        String
  revenueSource   String
  status          ReportStatus    @default(draft)
  generatedByUserId String
  approvedAt      DateTime?
  sentAt          DateTime?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  client          Client          @relation(fields: [clientId], references: [id])
  generatedBy     User            @relation(fields: [generatedByUserId], references: [id])
  versions        ReportVersion[]
  approvals       ApprovalEvent[]
  deliveries      DeliveryLog[]
  emailDrafts     EmailDraft[]
}

model ReportVersion {
  id               String             @id @default(cuid())
  reportId         String
  versionNumber    Int
  metricsSnapshot  Json
  sourceTrace      Json
  pdfPath          String?
  htmlSnapshot     String?
  createdAt        DateTime           @default(now())
  report           Report             @relation(fields: [reportId], references: [id])
  insights         Insight[]
  anomalies        Anomaly[]
  qualityScores    DataQualityScore[]
}

model Insight {
  id              String        @id @default(cuid())
  reportVersionId String
  insightType     String
  text            String
  sourceMetric    String
  isEdited        Boolean       @default(false)
  createdAt       DateTime      @default(now())
  reportVersion   ReportVersion @relation(fields: [reportVersionId], references: [id])
}

model Anomaly {
  id              String        @id @default(cuid())
  reportVersionId String
  anomalyType     String
  severity        Severity
  message         String
  clientSafe      Boolean       @default(false)
  dismissedAt     DateTime?
  comment         String?
  reportVersion   ReportVersion @relation(fields: [reportVersionId], references: [id])
}

model DataQualityScore {
  id              String        @id @default(cuid())
  reportVersionId String
  score           Int
  rating          String
  factors         Json
  createdAt       DateTime      @default(now())
  reportVersion   ReportVersion @relation(fields: [reportVersionId], references: [id])
}

model ApprovalEvent {
  id        String   @id @default(cuid())
  reportId  String
  userId    String
  action    String
  version   Int
  comment   String?
  createdAt DateTime @default(now())
  report    Report   @relation(fields: [reportId], references: [id])
  user      User     @relation(fields: [userId], references: [id])
}

model DeliveryLog {
  id           String   @id @default(cuid())
  reportId     String
  method       String
  recipient    String
  status       String
  providerId   String?
  errorMessage String?
  sentAt       DateTime?
  createdAt    DateTime @default(now())
  report       Report   @relation(fields: [reportId], references: [id])
}

model EmailDraft {
  id        String   @id @default(cuid())
  reportId  String
  subject   String
  body      String
  isEdited  Boolean  @default(false)
  createdAt DateTime @default(now())
  report    Report   @relation(fields: [reportId], references: [id])
}
```

- [x] **Step 2: Add Prisma client singleton**

Create `src/server/db/client.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
```

- [x] **Step 3: Run migration**

Run:

```bash
npx prisma migrate dev --name init_reporting_schema
```

Expected: Migration file is created and Prisma client is generated.

- [x] **Step 4: Add seed data**

Create `prisma/seed.ts` with one agency user, one ecommerce client, four account mappings, goals, and budgets. The seeded client must include:

```ts
const clientSeed = {
  name: "Demo Ecommerce Client",
  clientType: "ecommerce",
  primaryEmail: "client@example.com",
  currency: "INR"
};
```

Expected account mappings:

```ts
[
  { platform: "google_ads", sourceAccountId: "123-456-7890", ingestionMethod: "csv_upload" },
  { platform: "meta_ads", sourceAccountId: "act_123456789", ingestionMethod: "csv_upload" },
  { platform: "ga4", sourceAccountId: "properties/123456789", ingestionMethod: "csv_upload" },
  { platform: "shopify", sourceAccountId: "demo-store.myshopify.com", ingestionMethod: "csv_upload" }
]
```

- [x] **Step 5: Test schema can load**

Create `tests/unit/schema-shape.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

describe("Prisma schema", () => {
  it("exposes reporting models used by the MVP", () => {
    const prisma = new PrismaClient();
    expect(prisma.client).toBeDefined();
    expect(prisma.accountMapping).toBeDefined();
    expect(prisma.metricRow).toBeDefined();
    expect(prisma.report).toBeDefined();
    expect(prisma.deliveryLog).toBeDefined();
  });
});
```

Run:

```bash
npm run test -- tests/unit/schema-shape.test.ts
```

Expected: PASS.

- [x] **Step 6: Commit**

Run:

```bash
git add prisma src/server/db tests/unit/schema-shape.test.ts
git commit -m "feat: add reporting database schema"
```

## Task 3: Script-Assisted Import Connectors

**Files:**

- Create: `src/server/connectors/types.ts`
- Create: `src/server/connectors/csvConnector.ts`
- Create: `src/server/connectors/googleSheetsConnector.ts`
- Create: `src/server/connectors/bigQueryConnector.ts`
- Create: `src/server/connectors/directStubs.ts`
- Create: `src/server/normalization/normalizeRows.ts`
- Test: `tests/unit/normalizeRows.test.ts`

- [x] **Step 1: Implement connector types**

Use the contract from the "Core Data Contracts" section in `src/server/connectors/types.ts`.

- [x] **Step 2: Implement platform normalization**

Create `src/server/normalization/normalizeRows.ts`:

```ts
import type { IngestionMethod, NormalizedMetricRow, Platform } from "@/server/connectors/types";

type RawImportRow = Record<string, string | number | null | undefined>;

const platformMetricMap: Record<Platform, Record<string, string>> = {
  google_ads: {
    Impressions: "impressions",
    Clicks: "clicks",
    Cost: "spend",
    Conversions: "conversions",
    "Conversion value": "conversion_value"
  },
  meta_ads: {
    impressions: "impressions",
    clicks: "clicks",
    spend: "spend",
    purchases: "conversions",
    purchase_value: "conversion_value",
    leads: "leads"
  },
  ga4: {
    sessions: "sessions",
    activeUsers: "active_users",
    purchaseRevenue: "revenue",
    transactions: "transactions"
  },
  shopify: {
    total_orders: "orders",
    total_revenue: "revenue"
  },
  manual: {
    revenue: "revenue",
    leads: "leads",
    orders: "orders"
  }
};

export function normalizeRows(input: {
  clientId: string;
  platform: Platform;
  ingestionMethod: IngestionMethod;
  sourceAccountId: string;
  syncRunId: string;
  sourceReference: string;
  dateField: string;
  currency: string | null;
  rows: RawImportRow[];
}): NormalizedMetricRow[] {
  const metricMap = platformMetricMap[input.platform];

  return input.rows.flatMap((row) => {
    const occurredOn = String(row[input.dateField]);

    return Object.entries(metricMap).flatMap(([sourceField, metricName]) => {
      const rawValue = row[sourceField];
      const metricValue = Number(rawValue);

      if (!Number.isFinite(metricValue)) {
        return [];
      }

      return [
        {
          clientId: input.clientId,
          platform: input.platform,
          ingestionMethod: input.ingestionMethod,
          sourceAccountId: input.sourceAccountId,
          metricName: metricName as NormalizedMetricRow["metricName"],
          metricValue,
          currency: input.currency,
          occurredOn,
          dimensions: {
            campaign: String(row.campaign ?? row.Campaign ?? ""),
            channel: String(row.channel ?? ""),
            device: String(row.device ?? "")
          },
          sourceTrace: {
            platform: input.platform,
            connectorType: input.ingestionMethod,
            sourceAccountId: input.sourceAccountId,
            originalFieldName: sourceField,
            sourceReference: input.sourceReference,
            syncRunId: input.syncRunId,
            dateRange: { from: occurredOn, to: occurredOn },
            importedAt: new Date().toISOString()
          }
        }
      ];
    });
  });
}
```

- [x] **Step 3: Implement CSV connector**

Create `src/server/connectors/csvConnector.ts` that parses CSV input with `papaparse`, calls `normalizeRows`, and returns `ConnectorResult`.

Required behavior:

- Empty CSV returns zero rows and one warning: `CSV file contained no rows`.
- Missing date field throws `CSV import requires a date field`.
- Parsed rows preserve `sourceReference` as the uploaded filename.

- [x] **Step 4: Implement Google Sheets connector**

Create `src/server/connectors/googleSheetsConnector.ts` that reads a sheet range using the Google Sheets API service account credentials and converts sheet rows into objects before normalization.

Required config keys:

```ts
["spreadsheetId", "range", "dateField", "sourceReference"]
```

If any key is missing, throw:

```ts
new Error("Google Sheets connector requires spreadsheetId, range, dateField, and sourceReference");
```

- [x] **Step 5: Implement BigQuery connector**

Create `src/server/connectors/bigQueryConnector.ts` that runs a configured SQL query and normalizes the returned rows.

Required config keys:

```ts
["projectId", "query", "dateField", "sourceReference"]
```

If any key is missing, throw:

```ts
new Error("BigQuery connector requires projectId, query, dateField, and sourceReference");
```

- [x] **Step 6: Add direct connector stubs**

Create `src/server/connectors/directStubs.ts`:

```ts
import type { Connector, ConnectorResult } from "./types";

export class NeedsAuthorizationConnector implements Connector {
  constructor(public readonly connectorType: string) {}

  async fetch(): Promise<ConnectorResult> {
    throw new Error(`${this.connectorType} requires official authorization before direct API sync can run`);
  }
}
```

- [x] **Step 7: Test normalization**

Create `tests/unit/normalizeRows.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeRows } from "@/server/normalization/normalizeRows";

describe("normalizeRows", () => {
  it("normalizes Google Ads spend and preserves source traceability", () => {
    const rows = normalizeRows({
      clientId: "client_1",
      platform: "google_ads",
      ingestionMethod: "csv_upload",
      sourceAccountId: "123-456-7890",
      syncRunId: "sync_1",
      sourceReference: "google-ads-week.csv",
      dateField: "Date",
      currency: "INR",
      rows: [
        {
          Date: "2026-06-01",
          Campaign: "Brand",
          Impressions: "1000",
          Clicks: "100",
          Cost: "2500",
          Conversions: "10",
          "Conversion value": "15000"
        }
      ]
    });

    const spend = rows.find((row) => row.metricName === "spend");
    expect(spend?.metricValue).toBe(2500);
    expect(spend?.sourceTrace.originalFieldName).toBe("Cost");
    expect(spend?.sourceTrace.sourceReference).toBe("google-ads-week.csv");
  });
});
```

Run:

```bash
npm run test -- tests/unit/normalizeRows.test.ts
```

Expected: PASS.

- [x] **Step 8: Commit**

Run:

```bash
git add src/server/connectors src/server/normalization tests/unit/normalizeRows.test.ts
git commit -m "feat: add script assisted import connectors"
```

## Task 4: Client Management And Account Mapping

**Files:**

- Create: `src/app/(dashboard)/clients/page.tsx`
- Create: `src/app/(dashboard)/clients/[clientId]/page.tsx`
- Create: `src/app/api/clients/route.ts`
- Create: `src/app/api/clients/[clientId]/mappings/route.ts`
- Create: `src/components/ClientForm.tsx`
- Create: `src/components/AccountMappingForm.tsx`
- Test: `tests/e2e/client-management.spec.ts`

- [x] **Step 1: Add client create/list API**

`POST /api/clients` must accept:

```ts
{
  "name": "Demo Ecommerce Client",
  "clientType": "ecommerce",
  "primaryEmail": "client@example.com",
  "currency": "INR"
}
```

Expected response:

```ts
{
  "id": "generated-client-id",
  "name": "Demo Ecommerce Client",
  "clientType": "ecommerce",
  "primaryEmail": "client@example.com",
  "currency": "INR"
}
```

- [x] **Step 2: Add mapping create API**

`POST /api/clients/[clientId]/mappings` must accept:

```ts
{
  "platform": "google_ads",
  "accountName": "Demo Google Ads",
  "sourceAccountId": "123-456-7890",
  "ingestionMethod": "csv_upload",
  "fallbackMethod": "csv_upload",
  "config": {
    "dateField": "Date"
  }
}
```

Expected response includes the mapping id and `isActive: true`.

- [x] **Step 3: Build client pages**

Required page behavior:

- `/clients` shows a table with client name, type, email, currency, and created date.
- `/clients` includes a create form.
- `/clients/[clientId]` shows account mappings by platform.
- `/clients/[clientId]` includes mapping forms for Google Ads, Meta Ads, GA4, Shopify, and manual fallback.

- [x] **Step 4: Add E2E test**

Create `tests/e2e/client-management.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("admin can create a client and map a Google Ads account", async ({ page }) => {
  await page.goto("/clients");
  await page.getByLabel("Client name").fill("Demo Ecommerce Client");
  await page.getByLabel("Primary email").fill("client@example.com");
  await page.getByLabel("Currency").fill("INR");
  await page.getByRole("button", { name: "Create client" }).click();

  await expect(page.getByText("Demo Ecommerce Client")).toBeVisible();
  await page.getByRole("link", { name: "Demo Ecommerce Client" }).click();

  await page.getByLabel("Platform").selectOption("google_ads");
  await page.getByLabel("Account name").fill("Demo Google Ads");
  await page.getByLabel("Source account ID").fill("123-456-7890");
  await page.getByLabel("Ingestion method").selectOption("csv_upload");
  await page.getByRole("button", { name: "Add mapping" }).click();

  await expect(page.getByText("Demo Google Ads")).toBeVisible();
});
```

Run:

```bash
npm run test:e2e -- tests/e2e/client-management.spec.ts
```

Expected: PASS.

- [x] **Step 5: Commit**

Run:

```bash
git add src/app src/components tests/e2e/client-management.spec.ts
git commit -m "feat: add client management and account mapping"
```

## Task 5: Metric Calculations And Revenue Source Flexibility

**Files:**

- Create: `src/server/reporting/metrics.ts`
- Create: `src/server/reporting/sourceTrace.ts`
- Test: `tests/unit/metrics.test.ts`

- [x] **Step 1: Implement metric formulas**

Create `src/server/reporting/metrics.ts`:

```ts
export type MetricTotals = {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  conversionValue: number;
  revenue: number;
  orders: number;
  leads: number;
};

export type DerivedMetrics = {
  ctr: number | null;
  cpc: number | null;
  cpl: number | null;
  conversionRate: number | null;
  aov: number | null;
  roas: number | null;
  mer: number | null;
  revenuePerAdClick: number | null;
};

function divide(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

export function calculateDerivedMetrics(input: {
  adTotals: MetricTotals;
  selectedRevenue: number;
  totalMarketingSpend: number;
}): DerivedMetrics {
  return {
    ctr: divide(input.adTotals.clicks, input.adTotals.impressions),
    cpc: divide(input.adTotals.spend, input.adTotals.clicks),
    cpl: divide(input.adTotals.spend, input.adTotals.leads),
    conversionRate: divide(input.adTotals.conversions, input.adTotals.clicks),
    aov: divide(input.selectedRevenue, input.adTotals.orders),
    roas: divide(input.selectedRevenue, input.adTotals.spend),
    mer: divide(input.selectedRevenue, input.totalMarketingSpend),
    revenuePerAdClick: divide(input.selectedRevenue, input.adTotals.clicks)
  };
}
```

- [x] **Step 2: Implement selected revenue source resolver**

Add to `metrics.ts`:

```ts
export function resolveSelectedRevenue(input: {
  revenueSource: "shopify" | "ga4" | "google_ads_conversion_value" | "meta_purchase_value" | "manual";
  shopifyRevenue: number;
  ga4Revenue: number;
  googleAdsConversionValue: number;
  metaPurchaseValue: number;
  manualRevenue: number;
}): number {
  const map = {
    shopify: input.shopifyRevenue,
    ga4: input.ga4Revenue,
    google_ads_conversion_value: input.googleAdsConversionValue,
    meta_purchase_value: input.metaPurchaseValue,
    manual: input.manualRevenue
  };

  return map[input.revenueSource];
}
```

- [x] **Step 3: Test calculations**

Create `tests/unit/metrics.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calculateDerivedMetrics, resolveSelectedRevenue } from "@/server/reporting/metrics";

describe("reporting metrics", () => {
  it("calculates blended paid media ROAS from selected revenue source", () => {
    const selectedRevenue = resolveSelectedRevenue({
      revenueSource: "shopify",
      shopifyRevenue: 100000,
      ga4Revenue: 90000,
      googleAdsConversionValue: 85000,
      metaPurchaseValue: 80000,
      manualRevenue: 0
    });

    const metrics = calculateDerivedMetrics({
      selectedRevenue,
      totalMarketingSpend: 25000,
      adTotals: {
        impressions: 100000,
        clicks: 5000,
        spend: 25000,
        conversions: 200,
        conversionValue: 85000,
        revenue: selectedRevenue,
        orders: 400,
        leads: 0
      }
    });

    expect(metrics.roas).toBe(4);
    expect(metrics.mer).toBe(4);
    expect(metrics.ctr).toBe(0.05);
    expect(metrics.cpc).toBe(5);
    expect(metrics.aov).toBe(250);
  });
});
```

Run:

```bash
npm run test -- tests/unit/metrics.test.ts
```

Expected: PASS.

- [x] **Step 4: Commit**

Run:

```bash
git add src/server/reporting tests/unit/metrics.test.ts
git commit -m "feat: add report metric calculations"
```

## Task 6: Imports, Connector Health, And Data Quality

**Files:**

- Create: `src/app/(dashboard)/imports/page.tsx`
- Create: `src/app/(dashboard)/health/page.tsx`
- Create: `src/app/api/imports/route.ts`
- Create: `src/server/reporting/dataQuality.ts`
- Test: `tests/unit/dataQuality.test.ts`

- [x] **Step 1: Add import run API**

`POST /api/imports` must accept:

```ts
{
  "clientId": "client_1",
  "accountMappingId": "mapping_1",
  "dateRange": { "from": "2026-06-01", "to": "2026-06-07" },
  "connectorConfig": {
    "dateField": "Date",
    "sourceReference": "google-ads-week.csv"
  }
}
```

Expected behavior:

- Creates `SyncRun` with status `running`.
- Calls the selected connector.
- Stores raw rows and normalized metric rows.
- Updates connector health to `healthy` on success.
- Updates connector health to `failed` and stores the error message on failure.

- [x] **Step 2: Implement data quality score**

Create `src/server/reporting/dataQuality.ts`:

```ts
export type DataQualityInput = {
  selectedSourcesSynced: boolean;
  dataFresh: boolean;
  revenueSourceAvailable: boolean;
  hasCriticalMissingMetrics: boolean;
  hasExpiredToken: boolean;
  rawRowsStored: boolean;
};

export function scoreDataQuality(input: DataQualityInput): {
  score: number;
  rating: "good" | "needs_review" | "poor";
  factors: Record<string, boolean>;
} {
  let score = 100;

  if (!input.selectedSourcesSynced) score -= 25;
  if (!input.dataFresh) score -= 20;
  if (!input.revenueSourceAvailable) score -= 25;
  if (input.hasCriticalMissingMetrics) score -= 20;
  if (input.hasExpiredToken) score -= 20;
  if (!input.rawRowsStored) score -= 10;

  const boundedScore = Math.max(0, score);
  const rating = boundedScore >= 80 ? "good" : boundedScore >= 50 ? "needs_review" : "poor";

  return {
    score: boundedScore,
    rating,
    factors: input
  };
}
```

- [x] **Step 3: Test quality scoring**

Create `tests/unit/dataQuality.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { scoreDataQuality } from "@/server/reporting/dataQuality";

describe("scoreDataQuality", () => {
  it("marks a report poor when revenue is missing and data is stale", () => {
    const result = scoreDataQuality({
      selectedSourcesSynced: true,
      dataFresh: false,
      revenueSourceAvailable: false,
      hasCriticalMissingMetrics: false,
      hasExpiredToken: false,
      rawRowsStored: true
    });

    expect(result.score).toBe(55);
    expect(result.rating).toBe("needs_review");
  });
});
```

Run:

```bash
npm run test -- tests/unit/dataQuality.test.ts
```

Expected: PASS.

- [x] **Step 4: Build health dashboard**

Required columns in `/health`:

- Client name.
- Platform.
- Connection type.
- Last successful sync.
- Last failed sync.
- Data freshness status.
- Token/access status.
- Rows imported.
- Latest error message.
- Retry action.
- Switch fallback action.

- [x] **Step 5: Commit**

Run:

```bash
git add src/app src/server/reporting/dataQuality.ts tests/unit/dataQuality.test.ts
git commit -m "feat: add imports health and data quality"
```

## Task 7: Anomaly Detection And Budget Pacing

**Files:**

- Create: `src/server/reporting/anomalies.ts`
- Create: `src/server/reporting/budgetPacing.ts`
- Test: `tests/unit/anomalies.test.ts`
- Test: `tests/unit/budgetPacing.test.ts`

- [x] **Step 1: Implement anomaly detection**

Create `src/server/reporting/anomalies.ts`:

```ts
export type PeriodMetrics = {
  spend: number;
  revenue: number;
  conversions: number;
  impressions: number;
  cpc: number | null;
  cpl: number | null;
  roas: number | null;
};

export type AnomalyResult = {
  anomalyType: string;
  severity: "info" | "warning" | "critical";
  message: string;
  clientSafe: boolean;
};

export function detectAnomalies(input: {
  current: PeriodMetrics;
  previous: PeriodMetrics;
  missingPlatforms: string[];
}): AnomalyResult[] {
  const anomalies: AnomalyResult[] = [];

  if (input.missingPlatforms.length > 0) {
    anomalies.push({
      anomalyType: "missing_platform_data",
      severity: "critical",
      message: `Missing data for ${input.missingPlatforms.join(", ")}`,
      clientSafe: false
    });
  }

  if (input.current.impressions === 0) {
    anomalies.push({
      anomalyType: "zero_impressions",
      severity: "critical",
      message: "Selected report range has zero impressions",
      clientSafe: false
    });
  }

  if (input.current.conversions === 0 && input.current.spend > 0) {
    anomalies.push({
      anomalyType: "zero_conversions",
      severity: "warning",
      message: "Spend was recorded but conversions are zero",
      clientSafe: true
    });
  }

  if (input.previous.spend > 0 && input.current.spend / input.previous.spend >= 1.5) {
    anomalies.push({
      anomalyType: "spend_spike",
      severity: "warning",
      message: "Spend increased by at least 50% compared with the previous period",
      clientSafe: true
    });
  }

  if (input.previous.revenue > 0 && input.current.revenue / input.previous.revenue <= 0.7) {
    anomalies.push({
      anomalyType: "revenue_drop",
      severity: "warning",
      message: "Revenue dropped by at least 30% compared with the previous period",
      clientSafe: true
    });
  }

  if (input.previous.roas && input.current.roas && input.current.roas / input.previous.roas <= 0.7) {
    anomalies.push({
      anomalyType: "roas_drop",
      severity: "warning",
      message: "ROAS dropped by at least 30% compared with the previous period",
      clientSafe: true
    });
  }

  return anomalies;
}
```

- [x] **Step 2: Implement budget pacing**

Create `src/server/reporting/budgetPacing.ts`:

```ts
export function calculateBudgetPacing(input: {
  monthlyBudget: number;
  spendToDate: number;
  dayOfMonth: number;
  daysInMonth: number;
}): {
  budgetUsedPercentage: number;
  expectedSpendByToday: number;
  pacingDifference: number;
  projectedMonthEndSpend: number;
  remainingBudget: number;
  dailySpendNeeded: number;
} {
  const expectedSpendByToday = (input.monthlyBudget / input.daysInMonth) * input.dayOfMonth;
  const pacingDifference = input.spendToDate - expectedSpendByToday;
  const projectedMonthEndSpend = (input.spendToDate / input.dayOfMonth) * input.daysInMonth;
  const remainingBudget = input.monthlyBudget - input.spendToDate;
  const remainingDays = Math.max(1, input.daysInMonth - input.dayOfMonth);

  return {
    budgetUsedPercentage: input.spendToDate / input.monthlyBudget,
    expectedSpendByToday,
    pacingDifference,
    projectedMonthEndSpend,
    remainingBudget,
    dailySpendNeeded: remainingBudget / remainingDays
  };
}
```

- [x] **Step 3: Test anomaly detection**

Create `tests/unit/anomalies.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { detectAnomalies } from "@/server/reporting/anomalies";

describe("detectAnomalies", () => {
  it("flags missing platform data and spend without conversions", () => {
    const anomalies = detectAnomalies({
      missingPlatforms: ["shopify"],
      current: { spend: 10000, revenue: 0, conversions: 0, impressions: 1000, cpc: 10, cpl: null, roas: 0 },
      previous: { spend: 5000, revenue: 50000, conversions: 50, impressions: 2000, cpc: 5, cpl: null, roas: 10 }
    });

    expect(anomalies.map((item) => item.anomalyType)).toContain("missing_platform_data");
    expect(anomalies.map((item) => item.anomalyType)).toContain("zero_conversions");
    expect(anomalies.map((item) => item.anomalyType)).toContain("spend_spike");
    expect(anomalies.map((item) => item.anomalyType)).toContain("revenue_drop");
  });
});
```

- [x] **Step 4: Test budget pacing**

Create `tests/unit/budgetPacing.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calculateBudgetPacing } from "@/server/reporting/budgetPacing";

describe("calculateBudgetPacing", () => {
  it("calculates projected spend and remaining budget", () => {
    const pacing = calculateBudgetPacing({
      monthlyBudget: 300000,
      spendToDate: 120000,
      dayOfMonth: 10,
      daysInMonth: 30
    });

    expect(pacing.expectedSpendByToday).toBe(100000);
    expect(pacing.pacingDifference).toBe(20000);
    expect(pacing.projectedMonthEndSpend).toBe(360000);
    expect(pacing.remainingBudget).toBe(180000);
  });
});
```

Run:

```bash
npm run test -- tests/unit/anomalies.test.ts tests/unit/budgetPacing.test.ts
```

Expected: PASS.

- [x] **Step 5: Commit**

Run:

```bash
git add src/server/reporting tests/unit/anomalies.test.ts tests/unit/budgetPacing.test.ts
git commit -m "feat: add anomaly detection and budget pacing"
```

## Task 8: Report Builder, Preview, And Versioning

**Files:**

- Create: `src/app/(dashboard)/reports/new/page.tsx`
- Create: `src/app/(dashboard)/reports/[reportId]/page.tsx`
- Create: `src/app/api/reports/route.ts`
- Create: `src/server/reporting/dateRanges.ts`
- Create: `src/server/reporting/reportBuilder.ts`
- Create: `src/server/audit/reportInvalidation.ts`
- Test: `tests/unit/reportBuilder.test.ts`

- [x] **Step 1: Implement date ranges**

`src/server/reporting/dateRanges.ts` must return:

- Weekly: Monday through Sunday for the selected week.
- Monthly: first day through last day of selected month.

Test June 2026:

```ts
expect(getMonthlyRange("2026-06-15")).toEqual({ from: "2026-06-01", to: "2026-06-30" });
expect(getWeeklyRange("2026-06-04")).toEqual({ from: "2026-06-01", to: "2026-06-07" });
```

- [x] **Step 2: Implement report builder**

`buildReportDraft(request: ReportBuildRequest)` must:

- Load client, mappings, goals, budgets, and latest successful metric rows for the date range.
- Resolve selected revenue source.
- Calculate derived metrics.
- Build source trace from included metric rows.
- Run data quality scoring.
- Run anomaly detection.
- Run budget pacing when a budget exists.
- Generate deterministic insight drafts.
- Create `Report` and `ReportVersion` records.
- Set report status to `needs_review`.

- [x] **Step 3: Invalidate approval when data changes**

Create `src/server/audit/reportInvalidation.ts`:

```ts
export function shouldInvalidateApproval(input: {
  approvedVersion: number;
  latestVersion: number;
  latestSyncRunFinishedAt: Date | null;
  approvedAt: Date | null;
}): boolean {
  if (!input.approvedAt) return false;
  if (input.latestVersion > input.approvedVersion) return true;
  if (input.latestSyncRunFinishedAt && input.latestSyncRunFinishedAt > input.approvedAt) return true;
  return false;
}
```

- [x] **Step 4: Build report setup page**

`/reports/new` must provide:

- Client selector.
- Weekly/monthly selector.
- Date selector.
- Ad data source selector: Google Ads, Meta Ads, Google Ads + Meta Ads.
- Revenue source selector: Shopify, GA4, Google Ads conversion value, Meta purchase value, manual.
- Health pre-check summary.
- Generate draft button.

- [x] **Step 5: Build report preview page**

`/reports/[reportId]` must show:

- Client and date range.
- Selected ad source and selected revenue source.
- KPI summary.
- Platform sections.
- Data quality score.
- Connector warnings.
- Anomalies.
- Budget pacing.
- Source trace details.
- Editable insights.
- Editable client summary email.
- Approve and reject actions.

- [x] **Step 6: Add report builder test**

Create `tests/unit/reportBuilder.test.ts` with a mocked metric set that verifies:

- Shopify revenue controls ROAS when revenue source is `shopify`.
- GA4 revenue controls ROAS when revenue source is `ga4`.
- Source trace includes platform, connector type, account id, field name, sync run id, and source reference.
- Report status becomes `needs_review`.

Run:

```bash
npm run test -- tests/unit/reportBuilder.test.ts
```

Expected: PASS.

- [x] **Step 7: Commit**

Run:

```bash
git add src/app src/server/reporting src/server/audit tests/unit/reportBuilder.test.ts
git commit -m "feat: add report draft builder and preview"
```

## Task 9: PDF Generation

**Files:**

- Create: `src/server/pdf/reportTemplate.tsx`
- Create: `src/server/pdf/renderPdf.ts`
- Create: `src/app/api/reports/[reportId]/pdf/route.ts`
- Test: `tests/unit/reportTemplate.test.ts`

- [x] **Step 1: Build master report template**

`reportTemplate.tsx` must render these sections:

- Cover/header with client name and report period.
- Executive summary.
- KPI grid.
- Google Ads section when selected.
- Meta Ads section when selected.
- Revenue section based on selected revenue source.
- Trend charts.
- Top campaigns.
- Insights and recommendations.
- Blended ROAS/MER for ecommerce clients.
- Goal comparison.
- Budget pacing when configured.
- Client-safe anomaly highlights.
- Source notes/data freshness footer.

- [x] **Step 2: Implement PDF renderer**

Create `src/server/pdf/renderPdf.ts`:

```ts
import { chromium } from "playwright";

export async function renderPdfFromHtml(html: string): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
    await page.setContent(html, { waitUntil: "networkidle" });
    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "16mm",
        right: "14mm",
        bottom: "16mm",
        left: "14mm"
      }
    });
  } finally {
    await browser.close();
  }
}
```

- [x] **Step 3: Add PDF API**

`GET /api/reports/[reportId]/pdf` must:

- Load latest report version.
- Render template HTML.
- Generate PDF buffer.
- Save generated file path on `ReportVersion.pdfPath`.
- Return `application/pdf`.

- [x] **Step 4: Test template output**

Create `tests/unit/reportTemplate.test.ts` that renders a report with Shopify revenue and asserts the HTML includes:

```ts
["Demo Ecommerce Client", "Shopify revenue", "Blended ROAS", "Source notes"]
```

Run:

```bash
npm run test -- tests/unit/reportTemplate.test.ts
```

Expected: PASS.

- [x] **Step 5: Commit**

Run:

```bash
git add src/server/pdf src/app/api/reports tests/unit/reportTemplate.test.ts
git commit -m "feat: add master PDF report generator"
```

## Task 10: Approval Inbox And Delivery Workflow

**Files:**

- Create: `src/app/(dashboard)/approvals/page.tsx`
- Create: `src/app/api/reports/[reportId]/approve/route.ts`
- Create: `src/app/api/reports/[reportId]/reject/route.ts`
- Create: `src/server/delivery/emailDraft.ts`
- Test: `tests/unit/emailDraft.test.ts`

- [x] **Step 1: Build approval inbox**

`/approvals` must group reports by:

- Draft.
- Data ready.
- Needs review.
- Approved.
- Sent.
- Failed.
- Rejected.

Each row must show client, report period, revenue source, data quality rating, critical anomaly count, generated time, and actions.

- [x] **Step 2: Implement approval API**

`POST /api/reports/[reportId]/approve` must:

- Reject approval if the latest version has a poor data quality score and request lacks `confirmPoorQuality: true`.
- Reject approval if the report has critical unresolved internal anomalies.
- Store user id, timestamp, action, comment, and version in `ApprovalEvent`.
- Set report status to `approved`.
- Store `approvedAt`.

- [x] **Step 3: Implement reject API**

`POST /api/reports/[reportId]/reject` must:

- Require a comment.
- Store `ApprovalEvent` with action `rejected`.
- Set report status to `rejected`.

- [x] **Step 4: Implement editable email draft**

Create `src/server/delivery/emailDraft.ts`:

```ts
export function buildClientSummaryEmail(input: {
  clientName: string;
  reportPeriod: string;
  highlights: string[];
  recommendedSteps: string[];
  agencySignature: string;
}): { subject: string; body: string } {
  return {
    subject: `${input.clientName} performance report - ${input.reportPeriod}`,
    body: [
      `Hi ${input.clientName},`,
      "",
      `Please find attached your performance report for ${input.reportPeriod}.`,
      "",
      "Key highlights:",
      ...input.highlights.slice(0, 5).map((highlight) => `- ${highlight}`),
      "",
      "Recommended next steps:",
      ...input.recommendedSteps.slice(0, 3).map((step) => `- ${step}`),
      "",
      input.agencySignature
    ].join("\n")
  };
}
```

- [x] **Step 5: Test email draft**

Create `tests/unit/emailDraft.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildClientSummaryEmail } from "@/server/delivery/emailDraft";

describe("buildClientSummaryEmail", () => {
  it("limits highlights and recommendations to client-ready lengths", () => {
    const email = buildClientSummaryEmail({
      clientName: "Demo Ecommerce Client",
      reportPeriod: "June 1-7, 2026",
      highlights: ["Revenue improved", "ROAS improved", "CTR improved", "CPC reduced", "Orders improved", "Internal note excluded"],
      recommendedSteps: ["Increase budget", "Review search terms", "Refresh creatives", "Internal action excluded"],
      agencySignature: "Regards,\nAgency Team"
    });

    expect(email.subject).toContain("Demo Ecommerce Client performance report");
    expect(email.body).toContain("Revenue improved");
    expect(email.body).not.toContain("Internal note excluded");
    expect(email.body).not.toContain("Internal action excluded");
  });
});
```

Run:

```bash
npm run test -- tests/unit/emailDraft.test.ts
```

Expected: PASS.

- [x] **Step 6: Commit**

Run:

```bash
git add src/app src/server/delivery tests/unit/emailDraft.test.ts
git commit -m "feat: add approval inbox and email draft"
```

## Task 11: Email Delivery

**Files:**

- Create: `src/app/api/reports/[reportId]/send/route.ts`
- Create: `src/server/delivery/email.ts`
- Test: `tests/unit/email.test.ts`

- [x] **Step 1: Implement SMTP sender**

Create `src/server/delivery/email.ts`:

```ts
import nodemailer from "nodemailer";

export async function sendReportEmail(input: {
  to: string[];
  subject: string;
  body: string;
  pdfBuffer: Buffer;
  filename: string;
}): Promise<{ providerId: string | null }> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const result = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: input.to.join(","),
    subject: input.subject,
    text: input.body,
    attachments: [
      {
        filename: input.filename,
        content: input.pdfBuffer,
        contentType: "application/pdf"
      }
    ]
  });

  return { providerId: result.messageId ?? null };
}
```

- [x] **Step 2: Implement send API**

`POST /api/reports/[reportId]/send` must:

- Require report status `approved`.
- Require a PDF buffer or generate one before sending.
- Send the latest editable email draft.
- Store `DeliveryLog` with method `email`, recipient, status, provider id, and timestamp.
- Set report status to `sent` after successful delivery.
- Set report status to `failed` after delivery failure and store the error.

- [x] **Step 3: Test sender without network**

Create `tests/unit/email.test.ts` that mocks `nodemailer.createTransport` and verifies:

- Recipient list is joined.
- PDF attachment has `application/pdf`.
- Returned provider id comes from `messageId`.

Run:

```bash
npm run test -- tests/unit/email.test.ts
```

Expected: PASS.

- [x] **Step 4: Commit**

Run:

```bash
git add src/app/api/reports src/server/delivery tests/unit/email.test.ts
git commit -m "feat: add approved report email delivery"
```

## Task 12: AI-Assisted Insights

**Files:**

- Create: `src/server/reporting/insights.ts`
- Test: `tests/unit/insights.test.ts`

- [x] **Step 1: Implement rule-based insight generator**

`generateInsightDrafts` must produce client-safe draft text from metrics, anomalies, and goals. Required insight types:

- Executive summary.
- What improved.
- What declined.
- Likely reasons.
- Recommended actions.
- Internal notes.

Required rule examples:

- Spend increased and revenue did not increase proportionally: recommend reviewing budget allocation.
- CTR improved and conversion rate dropped: recommend landing page or offer review.
- CPL exceeds target: recommend lead quality and audience review.
- Shopify revenue is higher than platform conversion value: explain attribution difference.

- [x] **Step 2: Add provider adapter boundary**

`insights.ts` must expose:

```ts
export type InsightProvider = "rule_based" | "external_ai";

export async function generateInsights(input: {
  provider: InsightProvider;
  metrics: Record<string, number | null>;
  goals: Record<string, number>;
  anomalies: { anomalyType: string; message: string; clientSafe: boolean }[];
}): Promise<{ insightType: string; text: string; sourceMetric: string }[]> {
  if (input.provider === "rule_based") {
    return generateRuleBasedInsights(input);
  }

  return generateRuleBasedInsights(input);
}
```

The external provider branch deliberately falls back to rule-based text until credentials and review policy are configured.

- [x] **Step 3: Test insight rules**

Create `tests/unit/insights.test.ts` with a metric case where spend grows faster than revenue. Assert the generated recommendations include `Review budget allocation`.

Run:

```bash
npm run test -- tests/unit/insights.test.ts
```

Expected: PASS.

- [x] **Step 4: Commit**

Run:

```bash
git add src/server/reporting/insights.ts tests/unit/insights.test.ts
git commit -m "feat: add editable insight drafts"
```

## Task 13: MVP End-To-End Report Scenario

**Files:**

- Create: `tests/fixtures/google-ads-week.csv`
- Create: `tests/fixtures/meta-ads-week.csv`
- Create: `tests/fixtures/shopify-week.csv`
- Create: `tests/e2e/report-flow.spec.ts`

- [x] **Step 1: Add fixture data**

Create CSV fixtures with dates from `2026-06-01` through `2026-06-07`.

Google Ads fixture minimum columns:

```csv
Date,Campaign,Impressions,Clicks,Cost,Conversions,Conversion value
2026-06-01,Brand,1000,100,2500,10,15000
2026-06-02,Brand,1200,120,3000,12,18000
```

Meta Ads fixture minimum columns:

```csv
date,campaign,impressions,clicks,spend,purchases,purchase_value,leads
2026-06-01,Prospecting,2000,160,4000,8,12000,5
2026-06-02,Prospecting,2200,180,4500,9,13500,6
```

Shopify fixture minimum columns:

```csv
date,total_orders,total_revenue
2026-06-01,30,45000
2026-06-02,35,52500
```

- [x] **Step 2: Add end-to-end test**

Create `tests/e2e/report-flow.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("agency user imports data, generates, approves, and sends an email report", async ({ page }) => {
  await page.goto("/clients");
  await page.getByRole("link", { name: "Demo Ecommerce Client" }).click();

  await page.goto("/imports");
  await page.getByLabel("Client").selectOption({ label: "Demo Ecommerce Client" });
  await page.getByLabel("Platform").selectOption("google_ads");
  await page.setInputFiles('input[type="file"]', "tests/fixtures/google-ads-week.csv");
  await page.getByRole("button", { name: "Run import" }).click();
  await expect(page.getByText("Import completed")).toBeVisible();

  await page.goto("/reports/new");
  await page.getByLabel("Client").selectOption({ label: "Demo Ecommerce Client" });
  await page.getByLabel("Report type").selectOption("weekly");
  await page.getByLabel("Report date").fill("2026-06-04");
  await page.getByLabel("Ad source").selectOption("google_ads_meta_ads");
  await page.getByLabel("Revenue source").selectOption("shopify");
  await page.getByRole("button", { name: "Generate draft" }).click();

  await expect(page.getByText("Needs review")).toBeVisible();
  await expect(page.getByText("Shopify revenue")).toBeVisible();
  await expect(page.getByText("Data quality")).toBeVisible();

  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Approved")).toBeVisible();

  await page.getByRole("button", { name: "Send email" }).click();
  await expect(page.getByText("Sent")).toBeVisible();
});
```

Run:

```bash
npm run test:e2e -- tests/e2e/report-flow.spec.ts
```

Expected: PASS.

- [x] **Step 3: Run full MVP verification**

Run:

```bash
npm run lint
npm run test
npm run test:e2e
npm run build
```

Expected: all commands pass.

- [x] **Step 4: Commit**

Run:

```bash
git add tests/fixtures tests/e2e/report-flow.spec.ts
git commit -m "test: cover complete MVP report workflow"
```

## Task 14: Phase 2 Direct API Connectors

**Files:**

- Create: `src/server/connectors/googleAdsApiConnector.ts`
- Create: `src/server/connectors/metaApiConnector.ts`
- Create: `src/server/connectors/ga4ApiConnector.ts`
- Create: `src/server/connectors/shopifyApiConnector.ts`
- Create: `src/app/(dashboard)/connections/page.tsx`
- Create: `src/app/api/connections/oauth/route.ts`
- Test: `tests/unit/directConnectorContracts.test.ts`

- [x] **Step 1: Add direct connection models**

Extend `prisma/schema.prisma` with a credential model that stores encrypted tokens and authorization status:

```prisma
model DirectCredential {
  id               String   @id @default(cuid())
  accountMappingId String
  provider         String
  encryptedToken   String
  refreshToken     String?
  expiresAt        DateTime?
  scopes           String[]
  status           String
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

- [x] **Step 2: Add connection screen**

`/connections` must show:

- Google Ads OAuth connection.
- Meta OAuth/token connection.
- GA4 OAuth/service account connection.
- Shopify store token connection.
- Authorization status.
- Reconnect action.
- Last direct sync result.

- [x] **Step 3: Implement each connector behind the existing `Connector` interface**

Each connector must return `NormalizedMetricRow[]` with the same source trace fields as script-assisted import.

Required direct connector status errors:

- Google Ads: `Google Ads direct connector requires developer token, OAuth client, refresh token, and MCC login customer ID`.
- Meta Ads: `Meta direct connector requires ad account access token with ads read permissions`.
- GA4: `GA4 direct connector requires property access and OAuth or service account credentials`.
- Shopify: `Shopify direct connector requires store domain and read orders access token`.

- [x] **Step 4: Test connector contract compatibility**

Create `tests/unit/directConnectorContracts.test.ts` that asserts each direct connector exposes `connectorType` and `fetch`, and that authorization errors contain the connector name.

- [x] **Step 5: Commit**

Run:

```bash
git add prisma src/app src/server/connectors tests/unit/directConnectorContracts.test.ts
git commit -m "feat: add direct connector contract support"
```

## Task 15: Phase 3 And Phase 4 Expansion

**Files:**

- Create: `src/server/delivery/whatsapp.ts`
- Create: `src/app/(dashboard)/portfolio/page.tsx`
- Create: `src/server/reporting/profit.ts`
- Create: `src/server/reporting/forecasting.ts`
- Create: `src/server/reporting/opportunities.ts`
- Test: `tests/unit/profit.test.ts`
- Test: `tests/unit/forecasting.test.ts`

- [x] **Step 1: Add WhatsApp delivery adapter**

Implement adapter boundary:

```ts
export interface WhatsAppProvider {
  sendDocument(input: {
    to: string;
    filename: string;
    pdfBuffer: Buffer;
    message: string;
  }): Promise<{ providerId: string }>;
}
```

Delivery logs must use method `whatsapp`.

- [x] **Step 2: Add portfolio dashboard**

`/portfolio` must show:

- Total spend.
- Total revenue.
- Blended ROAS.
- MER.
- Leads.
- CPL.
- Reports pending approval.
- Failed syncs.
- Clients above goal.
- Clients below goal.
- Biggest revenue drop.
- Biggest spend spike.
- Clients with broken data.

- [x] **Step 3: Add profit reporting module**

Create `src/server/reporting/profit.ts`:

```ts
export function calculateProfitMetrics(input: {
  revenue: number;
  refunds: number;
  discounts: number;
  cogs: number;
  adSpend: number;
}): {
  netRevenue: number;
  grossProfit: number;
  contributionMargin: number;
  profitRoas: number | null;
} {
  const netRevenue = input.revenue - input.refunds - input.discounts;
  const grossProfit = netRevenue - input.cogs;
  const contributionMargin = grossProfit - input.adSpend;

  return {
    netRevenue,
    grossProfit,
    contributionMargin,
    profitRoas: input.adSpend === 0 ? null : grossProfit / input.adSpend
  };
}
```

- [x] **Step 4: Add forecasting module**

Create `src/server/reporting/forecasting.ts` with linear run-rate forecast for spend, revenue, leads, CPL, and budget usage.

- [x] **Step 5: Commit**

Run:

```bash
git add src/server/delivery src/app src/server/reporting tests/unit
git commit -m "feat: add expansion modules for portfolio and profit reporting"
```

## Acceptance Scenarios

Use these scenarios for product completion checks.

### MVP Scenario A: Weekly Ecommerce Report

- Given a demo ecommerce client has Google Ads and Shopify data for `2026-06-01` to `2026-06-07`.
- When the user selects weekly report, Google Ads ad source, and Shopify revenue.
- Then the app shows Google Ads spend, Shopify revenue, selected-source ROAS, budget pacing, source notes, and data freshness.
- Then the user can approve and send the PDF by email.

### MVP Scenario B: Blended Paid Media Report

- Given a client has Google Ads, Meta Ads, and Shopify imported rows.
- When the user selects Google Ads + Meta Ads and Shopify revenue.
- Then the report calculates blended paid media ROAS using total Google Ads plus Meta Ads spend.
- Then platform-reported conversion value remains visible separately from Shopify revenue.

### MVP Scenario C: Missing Revenue Source

- Given a user selects Shopify revenue and no Shopify rows exist for the selected date range.
- When the user generates a report.
- Then data quality is `poor`.
- Then the approval screen requires explicit confirmation before approval.
- Then the PDF source footer identifies Shopify as missing.

### MVP Scenario D: Failed Import

- Given a Google Sheets connector is missing `spreadsheetId`.
- When the user runs import.
- Then the sync run status is failed.
- Then connector health shows failed with the exact error.
- Then the health dashboard offers retry and fallback source actions.

### MVP Scenario E: Approval Invalidation

- Given a report version is approved.
- When a new sync run finishes for the same client and report date range.
- Then approval is invalidated.
- Then report status returns to `needs_review`.
- Then a new approval event is required before sending.

### Phase 2 Scenario F: Direct API Swap

- Given a client uses CSV import for Google Ads.
- When an authorized Google Ads direct connector is configured.
- Then the account mapping can switch to `direct_api`.
- Then report generation uses the same normalized schema and report builder.

## Verification Commands

Run these before marking the MVP complete:

```bash
npm run lint
npm run test
npm run test:e2e
npm run build
```

Expected result: all commands pass, and `tests/e2e/report-flow.spec.ts` proves the complete report workflow.

## Spec Coverage Review

- Client management: Task 4.
- Account mapping: Task 4.
- Script-assisted import: Task 3 and Task 6.
- Revenue source selection: Task 5 and Task 8.
- Weekly/monthly report generation: Task 8.
- Normalized data model: Task 2 and Task 3.
- Source traceability: Task 3, Task 5, Task 8.
- Connector health: Task 6.
- Data quality score: Task 6.
- Blended ROAS and MER: Task 5 and Task 8.
- Budget pacing: Task 7.
- Anomaly detection: Task 7.
- AI insight drafts: Task 12.
- PDF preview/generation: Task 8 and Task 9.
- Approval workflow and inbox: Task 10.
- Email delivery: Task 11.
- Report history/versioning: Task 8 and Task 10.
- Direct API connectors: Task 14.
- WhatsApp, portfolio, profit, forecasting: Task 15.
