# PRD: Automated Client Reporting Dashboard

## 1. Product Summary

Build a professional reporting application for a digital marketing agency. The app will generate weekly and monthly PDF reports for clients by pulling data from Google Ads MCCs, Meta Business Manager ad accounts, GA4 properties, and Shopify stores.

The system must support two data-fetching approaches:

1. Direct platform connection from MCC/business/store/property accounts into the app using official APIs and OAuth/token access.
2. Script-assisted fetching where platform scripts or scheduled scripts export raw data into a controlled data layer that the app reads.

The goal is to reduce manual reporting work while keeping the final report client-ready, reviewable, and accurate.

## 2. Problem

The agency manages multiple clients across different advertising and commerce platforms. Weekly and monthly reports require collecting campaign performance, revenue, order, and analytics data from several sources.

Manual reporting is slow, repetitive, and error-prone. Direct API setup can also be time-consuming because every platform requires authorization, tokens, permissions, or business verification.

The app should support both a long-term direct integration model and a faster script-based automation model.

## 3. Goals

- Generate weekly and monthly client reports as professional PDFs.
- Pull ad performance metrics from Google Ads and Meta Ads.
- Allow revenue source selection at report generation time.
- Support revenue from Shopify, GA4, Google Ads conversion value, or Meta purchase value.
- Support multiple MCCs, business managers, ad accounts, GA4 properties, and Shopify stores.
- Store raw fetched data before calculating report metrics.
- Preview reports before sending.
- Require approval before delivery.
- Send approved PDFs by email and optionally WhatsApp.
- Allow script-assisted data fetching where direct API setup is slow or blocked.
- Provide a hybrid data engine with direct API, script-assisted, Sheet, BigQuery, and manual fallback options.
- Show connector health, failed syncs, missing access, and data freshness before reports are generated.
- Support blended ROAS and MER across Google Ads, Meta Ads, Shopify, and GA4.
- Generate AI-assisted insights, recommendations, and client-friendly report summaries.
- Detect anomalies such as spend spikes, revenue drops, zero conversions, missing tracking, and broken data.
- Track client goals, budget pacing, and target performance.
- Preserve source traceability for every metric shown in a report.
- Support portfolio-level agency visibility across all clients.

## 4. Non-Goals For MVP

- No client login portal in the first version.
- No fully custom template builder in the first version.
- No per-client report design customization in the first version.
- No automatic sending without approval.
- No bypassing platform authorization. All direct data access must use official permissions.

## 5. Users

### Internal Agency User

The main user who connects accounts, selects clients, generates reports, reviews PDFs, approves reports, and sends them to clients.

### Admin User

Manages platform connections, client-account mappings, report templates, delivery settings, and failed data syncs.

### Client Recipient

Receives a final PDF report by email or WhatsApp. Clients do not need dashboard access in the MVP.

## 6. Core Workflow

1. Admin adds a client.
2. Admin maps the client to available platform accounts:
   - Google Ads MCC/client customer ID
   - Meta ad account ID
   - GA4 property ID
   - Shopify store
   - Preferred fallback source if direct sync fails
3. Admin sets optional client goals and budgets:
   - ROAS/MER target
   - CPL/CPA target
   - Monthly spend target
   - Monthly revenue/lead/order target
4. User chooses report type:
   - Weekly
   - Monthly
5. User chooses ad data source:
   - Google Ads
   - Meta Ads
   - Google Ads + Meta Ads
6. User chooses revenue source:
   - Shopify
   - GA4
   - Google Ads conversion value
   - Meta purchase value
   - Manual upload/fallback
7. App checks connector health and data freshness.
8. App fetches or reads raw data for the selected date range.
9. App normalizes the data into report metrics.
10. App calculates derived metrics such as ROAS, MER, CTR, CPC, CPL, conversion rate, AOV, and growth.
11. App runs data quality checks, anomaly detection, and budget pacing.
12. App generates AI-assisted insights and a client summary draft.
13. App generates a polished PDF using the master template.
14. User previews, edits insights/email copy, and approves the PDF.
15. App sends the approved report by email and/or WhatsApp.
16. App stores delivery status, source traceability, and report history.

## 7. Data Fetching Strategy

The product must support two fetching modes.

Important constraint: no platform will provide automatic account data without authorization. Direct fetching requires official API/OAuth/token setup. Script-assisted fetching reduces the amount of custom API work inside the app, but still requires platform login, account access, or connector authorization.

### Mode A: Direct API Fetching

This is the long-term professional approach. The app connects directly to each platform and fetches data automatically on demand or on schedule.

#### Google Ads Direct Fetching

- Use Google Ads API.
- Connect through OAuth.
- Support MCC/manager accounts.
- Store refresh token securely.
- Use manager account login customer ID.
- Fetch linked client accounts under each MCC.
- Pull campaign, search term, keyword, time, device, age, and gender data where available.

Required setup:

- Google Ads developer token.
- OAuth client.
- MCC access.
- Client account access through the MCC.

#### Meta Ads Direct Fetching

- Use Meta Marketing API.
- Connect through Meta OAuth/access token.
- Support Business Manager and multiple ad accounts.
- Fetch ad account insights by selected date range.
- Pull campaign metrics, conversions, purchase values, lead actions, age/gender, day/hour breakdowns.

Required setup:

- Meta app.
- Business/ad account permissions.
- Access token or system user token.
- Required permissions such as ads read access.
- Business verification if required by Meta.

#### GA4 Direct Fetching

- Use Google Analytics Data API.
- Connect through OAuth or service account.
- Fetch GA4 property data by selected date range.
- Pull revenue, transactions, active users, sessions, channel, and device data.

Required setup:

- GA4 property access.
- OAuth/service account access.
- Property ID mapping per client.

#### Shopify Direct Fetching

- Use Shopify Admin GraphQL API.
- Support one or more Shopify stores.
- Use access token with order read permissions.
- Use normal queries for small date ranges and bulk operations for larger exports.
- Pull orders, revenue, line items, products, customer type, and revenue by day.

Required setup:

- Shopify admin access.
- Custom/private app or OAuth app.
- Store access token.
- Required scopes such as order read access.

### Mode B: Script-Assisted Fetching

This is the faster practical approach when direct API setup is slow. Scripts export data into Google Sheets, BigQuery, or the app database. The app then reads from that controlled data layer.

#### Google Ads Script Fetching

- Use Google Ads Scripts inside MCC accounts.
- Schedule the script to run daily, weekly, or monthly.
- Query campaign/search/keyword metrics.
- Export rows to Google Sheets or directly to a database endpoint.
- App reads the exported sheet/database data.

Best use:

- Fastest way to start Google Ads MCC reporting.
- Avoids building Google Ads OAuth inside the app during MVP.
- Still requires MCC login access.

#### Meta Ads Script-Assisted Fetching

Meta does not have a Google Ads Scripts equivalent. Use one of these:

- Python scheduled script using Meta Marketing API.
- Google Apps Script using Meta API token.
- Third-party connector such as Supermetrics, Dataslayer, Airbyte, or Fivetran.

Best use:

- Third-party connector for MVP if Meta authorization becomes slow.
- Custom script later when tokens and permissions are stable.

#### GA4 Script-Assisted Fetching

Use one of these:

- GA4 BigQuery Export.
- Google Apps Script with GA4 Data API.
- Scheduled script that exports GA4 metrics into Google Sheets or BigQuery.

Best use:

- BigQuery Export for reliable ecommerce/event data.
- Apps Script for simpler report-level metrics.

#### Shopify Script-Assisted Fetching

Use one of these:

- Scheduled Python script using Shopify Admin GraphQL API.
- Shopify bulk operation export for orders and line items.
- Shopify export app such as Matrixify/Data Export.
- Export to Google Sheets, BigQuery, or app database.

Best use:

- GraphQL bulk operations for reliable order/revenue sync.
- Export apps for fastest non-development setup.

### Fetching Mode Decision Matrix

| Platform | Fastest MVP Method | Best Long-Term Method | Still Needs Authorization |
| --- | --- | --- | --- |
| Google Ads | MCC Google Ads Script to Sheets | Google Ads API direct to app | Yes, MCC access/OAuth/developer token |
| Meta Ads | Supermetrics/Dataslayer/Airbyte or API script | Meta Marketing API direct to app | Yes, Meta business/ad account access |
| GA4 | BigQuery Export or Apps Script export | GA4 Data API/BigQuery direct to app | Yes, GA4 property access |
| Shopify | Bulk export app or GraphQL script | Shopify Admin GraphQL API direct to app | Yes, store admin/app token |

## 8. Recommended Build Path

### Phase 1: MVP With Script-Assisted Data Layer

Use Google Sheets or BigQuery as the first data layer.

- Google Ads MCC Script exports to Google Sheets.
- Meta uses Supermetrics/Dataslayer/Airbyte or a simple API script.
- GA4 uses BigQuery Export or Apps Script export.
- Shopify uses GraphQL script, bulk export, or export app.
- App reads normalized data from Sheets/BigQuery.
- App generates PDF reports.
- App stores data source, import time, and source file/table for every imported metric.
- App shows basic connector/import health.
- App supports approval queue and email delivery.

This phase gets the reporting product working faster with less API setup risk.

### Phase 2: Direct API Integrations

Add direct account connection screens inside the app.

- Google OAuth connection.
- Meta OAuth/token connection.
- GA4 OAuth/service account connection.
- Shopify store connection.
- Scheduled sync jobs.
- Raw data storage in app database.
- Connector health dashboard.
- Retry and refresh-token handling.
- Data freshness checks.

This phase makes the app more scalable and less dependent on external sheets/connectors.

### Phase 3: Advanced Automation

- Scheduled data syncs.
- Auto-generated report drafts.
- Report approval queue.
- Email and WhatsApp delivery.
- Error alerts for failed syncs.
- Per-client report history.
- Budget pacing.
- Anomaly detection.
- Client goals and target comparisons.
- AI-generated insights and recommendations.
- Auto-written client summary email.

### Phase 4: Best-In-Class Intelligence

- Portfolio dashboard across all clients.
- Blended ROAS and MER views across paid media and revenue sources.
- Profit reporting using Shopify revenue, refunds, discounts, COGS, and margin.
- Forecasting for spend, revenue, ROAS, leads, CPL, and budget usage.
- Data quality score per client/report.
- Source traceability for every report metric.
- Automated opportunity detection such as wasted spend, high-CPC campaigns, strong products, and weak conversion channels.

## 9. Report Metrics

The metrics must follow the uploaded metrics specification PDF.

### Google Ads Metrics

- Impressions
- Clicks
- Spend
- CTR
- Average CPC
- Conversions
- Conversion rate
- Conversion value
- Cost per conversion
- ROAS
- Impression share
- Search terms
- Keywords
- Quality score
- Day of week performance
- Hour of day performance
- Gender and age data for Display/YouTube where available

### Meta Ads Metrics

- Campaign name
- Impressions
- Clicks
- Spend
- CTR
- CPC
- Reach
- Frequency
- Purchases/conversions
- Conversion value
- ROAS
- CPM
- Cost per result
- Leads
- CPL
- Lead form opens
- Form completion rate
- Link clicks
- Landing page views
- Day/hour breakdowns
- Gender/age breakdowns

### Shopify Metrics

- Total orders
- Total revenue
- Average order value
- Top products
- New vs returning customers
- Revenue by day

### GA4 Metrics

- Purchase revenue
- Transactions
- Average purchase revenue
- Conversion rate
- Revenue by channel
- Revenue by device
- Active users
- Sessions

### Derived Metrics

- ROAS = selected revenue source / ad spend
- CTR = clicks / impressions
- CPC = spend / clicks
- CPL = spend / leads
- Conversion rate = conversions / clicks
- AOV = revenue / orders
- Week-over-week growth
- Month-over-month growth
- Revenue per ad click

## 10. Revenue Source Flexibility

Revenue source must be selected every time a report is generated.

Supported revenue sources:

- Shopify revenue
- GA4 purchase revenue
- Google Ads conversion value
- Meta purchase value
- Manual revenue upload/fallback

ROAS and revenue-related calculations must use the selected revenue source.

Example:

- Google Ads spend + Shopify revenue = Shopify-based Google Ads ROAS.
- Meta Ads spend + GA4 revenue = GA4-based Meta ROAS.
- Google Ads + Meta Ads spend + Shopify revenue = blended paid media ROAS.

## 11. Best-In-Class Feature Modules

These modules are intended to make the application stronger than a normal reporting dashboard. They should be designed from the beginning, but not every module must ship in the first MVP.

### 11.1 Hybrid Data Engine

The app must support multiple ways to fetch or receive data for the same platform.

Supported ingestion methods:

- Direct API/OAuth connection.
- Platform script export.
- Google Sheets import.
- BigQuery import.
- CSV/manual upload fallback.
- Third-party connector import.

Requirements:

- Each client/platform can choose a preferred ingestion method.
- Each report can use the latest successful synced data.
- If a direct connector fails, the app should allow fallback to Sheet/CSV/manual data.
- All imported data must be normalized into the same reporting schema.
- Each metric row must store its ingestion method and original source.

Why this matters:

- API integrations fail sometimes.
- Scripts and Sheets help the agency keep reporting while direct integrations are being approved.
- Manual fallback prevents a report from being blocked completely.

### 11.2 Connector Health Dashboard

The app must include an internal health screen showing whether each platform connection is working.

Health data to show:

- Client name.
- Platform.
- Connection type.
- Last successful sync time.
- Last failed sync time.
- Data freshness status.
- Token/access status.
- Number of rows imported.
- Latest error message.
- Retry button.

Health statuses:

- Healthy.
- Warning.
- Failed.
- Not connected.
- Needs authorization.
- Stale data.

Required actions:

- Retry sync.
- Reconnect account.
- View error details.
- Switch to fallback source.
- Mark issue as resolved.

### 11.3 Blended ROAS And MER Reporting

The app must support both platform-level and business-level performance reporting.

Core formulas:

- Google Ads ROAS = selected revenue source / Google Ads spend.
- Meta Ads ROAS = selected revenue source / Meta Ads spend.
- Blended paid media ROAS = selected revenue source / total selected ad spend.
- MER = total business revenue / total marketing spend.

Report behavior:

- Show platform-reported ROAS separately from selected-source ROAS.
- Make it clear whether revenue came from Shopify, GA4, Google Ads, Meta Ads, or manual input.
- For ecommerce clients, default report emphasis should be blended revenue performance, not only platform attribution.
- Allow the user to compare Shopify revenue vs GA4 revenue vs platform conversion value when available.

### 11.4 AI Insights And Recommendations

The app should generate draft insights after metrics are calculated.

AI output types:

- Executive summary.
- What improved.
- What declined.
- Likely reasons.
- Recommended actions.
- Client-friendly explanation.
- Internal notes for the agency team.

Requirements:

- AI insights must use only the report data and stored client goals.
- Each generated insight should reference the metric that triggered it.
- User must be able to edit insights before approval.
- AI text should not be sent automatically without user approval.
- The report should separate facts from recommendations.

Example insight types:

- Spend increased but revenue did not increase proportionally.
- CTR improved while conversion rate dropped.
- Shopify revenue grew but platform ROAS underreported performance.
- Meta leads improved but CPL exceeded target.
- Search campaign spend increased on low-converting terms.

### 11.5 Anomaly Detection

The app should detect unusual performance changes before reports are sent.

Anomalies to detect:

- Spend spike.
- Spend drop.
- Revenue drop.
- Zero conversions.
- Zero purchases.
- Zero impressions.
- Tracking missing or conversion value missing.
- CPC spike.
- CPL spike.
- ROAS drop.
- Data missing for one platform.
- Shopify/GA4 revenue mismatch.
- Unusual day with very high or very low spend.

Severity levels:

- Info.
- Warning.
- Critical.

Detection logic:

- Compare current period with previous period.
- Compare current period with client goals.
- Compare daily data inside the report range.
- Flag missing or stale data before PDF generation.

Report behavior:

- Critical anomalies should appear in the internal approval screen.
- Only client-safe anomalies should appear in the final client PDF.
- User can dismiss or add comments to anomalies.

### 11.6 Budget Pacing

The app should help the agency understand whether a client is on track for the selected period.

Inputs:

- Monthly budget.
- Weekly budget.
- Platform-level budget.
- Client-level total budget.
- Date range.
- Spend-to-date.

Outputs:

- Budget used percentage.
- Expected spend by today.
- Under/over pacing amount.
- Projected month-end spend.
- Remaining budget.
- Daily spend needed to finish on target.

Report behavior:

- Show pacing in the internal dashboard.
- Include budget pacing in the PDF only if useful for the client.
- Flag overpacing and underpacing during approval.

### 11.7 Approval Inbox

The app must include a central queue for report drafts.

Statuses:

- Draft.
- Data ready.
- Needs review.
- Approved.
- Sent.
- Failed.
- Rejected.

Required actions:

- Preview PDF.
- Edit AI summary/insights.
- Regenerate report.
- Change revenue source.
- Approve.
- Reject.
- Send by email.
- Send by WhatsApp.
- Resend.

Approval rules:

- Reports must not be delivered until approved.
- Every approval should store user, timestamp, and report version.
- If report data changes after approval, approval should be invalidated and require review again.

### 11.8 Source Traceability

Every report metric must be traceable back to its source.

Traceability fields:

- Platform.
- Connector type.
- Source account/property/store.
- Date range.
- Original field name.
- Formula used if calculated.
- Import/sync run ID.
- Report version.
- Generated timestamp.

User experience:

- Internal dashboard should show source details for each KPI.
- PDF can show small source notes or a data source footer.
- Audit screen should let the user inspect where a number came from.

This is important because clients may ask why a number differs from Google Ads, Meta, GA4, or Shopify.

### 11.9 Client Goals And Targets

Each client should have measurable goals stored in the app.

Goal types:

- Target ROAS.
- Target MER.
- Target CPA.
- Target CPL.
- Target CPC.
- Target CTR.
- Target conversion rate.
- Monthly spend target.
- Monthly revenue target.
- Lead target.
- Order target.

Requirements:

- Goals can be set per client.
- Goals can be platform-specific or overall.
- Reports should compare actual performance against goals.
- AI insights should use goals when writing recommendations.
- Dashboard should flag clients missing goals.

### 11.10 Profit Reporting

For Shopify/ecommerce clients, the app should eventually report profit, not only revenue.

Required inputs:

- Shopify revenue.
- Discounts.
- Refunds.
- Taxes if needed.
- Shipping if needed.
- COGS or product cost.
- Ad spend.

Core formulas:

- Gross profit = revenue - COGS.
- Contribution margin = revenue - COGS - ad spend.
- Profit ROAS = gross profit / ad spend.
- Net revenue = revenue - refunds - discounts.

Implementation options:

- Manual product cost upload.
- Shopify product metafield for COGS if available.
- Spreadsheet import for product costs.
- Future inventory/accounting integration.

Report behavior:

- Revenue reporting remains default.
- Profit reporting can be enabled per client.
- Profit metrics must clearly show whether COGS data is complete or estimated.

### 11.11 Portfolio Dashboard

The app should include an agency-level dashboard across all clients.

Portfolio views:

- All clients.
- Ecommerce clients.
- Lead generation clients.
- Google Ads clients.
- Meta Ads clients.
- Clients with broken data.
- Clients needing report approval.

Key portfolio metrics:

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

Priority indicators:

- Biggest revenue drop.
- Biggest spend spike.
- Best-performing client.
- Worst-performing client.
- Missing data.
- Reports due soon.

### 11.12 Auto Client Summary Email

The app should generate a client-ready email body with each approved report.

Email content:

- Greeting with client name.
- Report period.
- 3-5 key highlights.
- 1-3 recommended next steps.
- PDF attachment.
- Optional agency signature.

Requirements:

- Email text should be generated as a draft.
- User can edit before sending.
- Email should match the report insights.
- Email should not include internal-only warnings.
- Email delivery should store send status and recipient list.

### 11.13 Data Quality Score

Each report should have a data quality score before approval.

Score factors:

- All selected sources synced successfully.
- Data is fresh for the selected period.
- Revenue source is available.
- No critical missing metrics.
- No expired tokens.
- No major platform mismatch.
- Raw rows are stored.

Score output:

- Good.
- Needs review.
- Poor.

Reports with poor data quality should require explicit confirmation before approval.

## 12. Master PDF Template

The MVP uses one master professional template for all clients.

The template should include:

- Cover/header with client name and report period.
- Executive summary.
- Key performance indicators.
- Google Ads section if selected.
- Meta Ads section if selected.
- Revenue section based on selected revenue source.
- Trend charts.
- Top campaigns.
- Search terms/keywords where applicable.
- Audience/time breakdowns where applicable.
- Insights and recommendations section.
- Blended ROAS/MER section for ecommerce clients.
- Goal comparison section.
- Budget pacing section if budgets are configured.
- Anomaly highlights if client-safe.
- Source notes/data freshness footer.

Client-specific customization in MVP:

- Client name.
- Date range.
- Selected platforms.
- Selected revenue source.
- Metrics and charts.

No per-client custom design builder in MVP.

## 13. Approval And Delivery

The app must not send reports automatically without approval.

Delivery workflow:

1. Generate PDF draft.
2. Run data quality checks.
3. Show preview.
4. Show AI summary and recommended edits.
5. Show anomalies, budget pacing, and connector warnings.
6. User approves or rejects.
7. If approved, send by selected method.
8. Store delivery status.

Delivery methods:

- Email with PDF attachment.
- WhatsApp with PDF attachment through WhatsApp Business API/provider.
- Client summary email body with editable highlights and recommendations.

For MVP, email delivery can be implemented first. WhatsApp can be added after the reporting flow is stable.

## 14. Data Storage Requirements

The app should store:

- Clients.
- Platform connections.
- Account mappings.
- Client goals and targets.
- Client budgets.
- Raw fetched rows.
- Normalized metric rows.
- Sync runs.
- Connector health history.
- Data source lineage.
- Data quality scores.
- Calculated metric formulas.
- AI-generated insights.
- User-edited insights.
- Anomalies and dismissals.
- Budget pacing results.
- Generated reports.
- Report versions.
- Report approval status.
- Delivery logs.
- Error logs.
- Email/WhatsApp message drafts.
- Manual uploads and source files.
- Product cost/COGS data for profit reporting.

Raw data should be kept so reports can be regenerated and audited.

## 15. Error Handling

The app should show clear errors for:

- Missing platform access.
- Expired token.
- No mapped account.
- No data for selected date range.
- Failed sheet/BigQuery import.
- Failed API request.
- Failed PDF generation.
- Failed email/WhatsApp delivery.
- Stale data.
- Missing revenue source.
- Missing client goal.
- Missing budget.
- Mismatched Shopify and GA4 revenue.
- Missing conversion tracking.
- Missing source traceability.

Each failed sync should include:

- Platform.
- Client.
- Date range.
- Error message.
- Error severity.
- Connector type.
- Last successful sync.
- Retry action.
- Fallback action.

## 16. MVP Features

- Client management.
- Account mapping.
- Data source selection.
- Revenue source selection.
- Weekly/monthly date range selection.
- Script-assisted import from Sheets/BigQuery.
- Google Ads, Meta Ads, GA4, and Shopify normalized data model.
- Hybrid data source support with manual upload fallback.
- Basic connector health dashboard.
- Source traceability for imported metrics.
- Client goals and target fields.
- Budget fields and basic pacing.
- Blended ROAS and MER calculations.
- PDF report generator.
- Report preview.
- Approval workflow.
- Approval inbox.
- AI summary draft that can be edited before approval.
- Basic anomaly detection for missing data, spend spikes, revenue drops, and zero conversions.
- Email delivery.
- Editable client summary email.
- Report history.
- Data quality score before approval.

## 17. Future Features

- Direct OAuth connection for all platforms.
- Scheduled sync jobs inside the app.
- WhatsApp delivery.
- Client portal.
- Per-client branding.
- BigQuery-first data warehouse.
- Multi-user roles and permissions.
- Advanced AI insights and recommendations.
- Advanced anomaly detection.
- Forecasting.
- Profit reporting with COGS and margin.
- Portfolio dashboard.
- Opportunity detection.
- Benchmarks by client type.
- Automated meeting notes or client call briefs.

## 18. Success Criteria

The product is successful when:

- A user can generate a weekly or monthly PDF report for a client in under 5 minutes.
- Reports can combine ad data from Google/Meta with revenue from Shopify or GA4.
- Reports can be reviewed before sending.
- Approved reports can be sent by email.
- Raw data is stored and traceable.
- The system supports both script-assisted fetching and direct API fetching.
- The user can see whether each connector/source is healthy before generating reports.
- Every report shows the selected revenue source and data freshness.
- Reports include editable AI insights and client-ready summary text.
- The system flags critical anomalies before approval.
- Blended ROAS/MER can be calculated for ecommerce clients.
- Budget pacing can identify over-spend or under-spend before the report is sent.
- Portfolio dashboard can identify clients needing attention.

## 19. Key Technical Decision

The app should be designed with a connector interface so both fetching methods work the same way after data is imported.

Example connector types:

- `google_ads_api_connector`
- `google_ads_script_sheet_connector`
- `meta_api_connector`
- `meta_connector_export_connector`
- `ga4_api_connector`
- `ga4_bigquery_connector`
- `shopify_api_connector`
- `shopify_bulk_export_connector`

All connectors should output normalized rows into the same reporting schema.

Each connector output should include:

- Client ID.
- Platform.
- Source account/property/store ID.
- Connector type.
- Sync run ID.
- Date range.
- Original source field.
- Normalized metric name.
- Metric value.
- Currency where applicable.
- Data freshness timestamp.
- Raw source reference.

This keeps the app flexible: start fast with scripts and sheets, then replace each source with direct API integrations later.

## 20. Feature Priority

### P0: Must Build First

- Client management.
- Account mapping.
- Script-assisted data import.
- Revenue source selection.
- PDF generation.
- Approval workflow.
- Email delivery.
- Source traceability.
- Basic connector health.
- Basic data quality score.

### P1: Strong Differentiators

- Blended ROAS/MER.
- AI summary and recommendations.
- Anomaly detection.
- Budget pacing.
- Client goals.
- Approval inbox.
- Editable client summary email.

### P2: Best-In-Class Expansion

- Direct API/OAuth connectors.
- WhatsApp delivery.
- Portfolio dashboard.
- Profit reporting.
- Forecasting.
- Advanced opportunity detection.
- Client portal.
