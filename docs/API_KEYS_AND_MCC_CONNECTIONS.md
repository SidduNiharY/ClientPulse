# API Keys and MCC Connection Setup

This guide explains how to collect the API keys, OAuth credentials, tokens, and account IDs needed by this reporting application.

The app supports two credential locations:

- Environment variables in `.env` for app-wide credentials and shared provider apps.
- Encrypted direct credentials saved from the `/connections` screen for each client/account mapping.

Important current state: Google Ads direct API imports are implemented. Google Sheets, BigQuery, CSV, and manual imports are also practical live data paths. Meta Ads and Shopify are intentionally deferred for now.

## Quick Setup Checklist

1. Copy `.env.example` to `.env`.
2. Set `APP_BASE_URL` to the app origin, such as `http://localhost:3000` locally.
3. Generate and save `DIRECT_CREDENTIAL_ENCRYPTION_KEY`.
4. Generate and save `OAUTH_STATE_SECRET`.
5. Create OAuth/API apps for Google.
6. Add provider secrets to `.env`.
7. Restart the Next.js server after changing `.env`.
8. Create clients and account mappings in the app.
9. Save direct credentials on `/connections` for each MCC, ad account, GA4 property, or Shopify store.

## App-Wide Environment Variables

Use these values in `.env`.

| Variable | Required for | How to get it |
| --- | --- | --- |
| `DATABASE_URL` | Prisma database | Local Postgres or hosted Postgres connection string. |
| `APP_BASE_URL` | OAuth redirects | Your app origin. Local example: `http://localhost:3000`. Production example: `https://reports.example.com`. |
| `DEFAULT_AGENCY_USER_EMAIL` | Seed/default admin | Any agency admin email address. |
| `DIRECT_CREDENTIAL_ENCRYPTION_KEY` | Encrypted direct credentials | Generate a stable 32-byte-or-longer secret. Do not rotate unless you plan to re-save all direct credentials. |
| `OAUTH_STATE_SECRET` | OAuth state signing | Generate a separate long random secret. If omitted, the app falls back to `DIRECT_CREDENTIAL_ENCRYPTION_KEY`. |
| `GOOGLE_OAUTH_CLIENT_ID` | Google Ads and GA4 OAuth | Google Cloud OAuth 2.0 Web application client ID. |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google Ads and GA4 OAuth | Google Cloud OAuth 2.0 Web application client secret. |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Google Ads API | Google Ads manager account API Center developer token. |
| `META_APP_ID` | Meta Ads OAuth | Meta Developers app ID. |
| `META_APP_SECRET` | Meta Ads OAuth | Meta Developers app secret. |
| `SHOPIFY_CLIENT_ID` | Shopify OAuth | Shopify app client ID/API key. |
| `SHOPIFY_CLIENT_SECRET` | Shopify OAuth | Shopify app client secret/API secret key. |
| `GOOGLE_SHEETS_CLIENT_EMAIL` | Google Sheets connector | Google Cloud service account email. |
| `GOOGLE_SHEETS_PRIVATE_KEY` | Google Sheets connector | Google Cloud service account private key. Keep newlines escaped as `\n` in `.env`. |
| `BIGQUERY_PROJECT_ID` | BigQuery connector | Default GCP project ID. Imports can override this with a `projectId` field. |
| `BIGQUERY_CLIENT_EMAIL` | BigQuery connector | Google Cloud service account email. |
| `BIGQUERY_PRIVATE_KEY` | BigQuery connector | Google Cloud service account private key. Keep newlines escaped as `\n` in `.env`. |
| `SMTP_HOST` | Email delivery | SMTP provider hostname. |
| `SMTP_PORT` | Email delivery | SMTP provider port, usually `587` or `465`. |
| `SMTP_USER` | Email delivery | SMTP username. |
| `SMTP_PASS` | Email delivery | SMTP password or app password. |
| `SMTP_FROM` | Email delivery | Sender name/address, such as `Agency Reports <reports@example.com>`. |
| `WHATSAPP_API_URL` | WhatsApp delivery | HTTP endpoint that accepts the app's report delivery payload. |
| `WHATSAPP_API_TOKEN` | WhatsApp delivery | Bearer token for the WhatsApp HTTP endpoint. |
| `AI_PROVIDER` | Future/optional AI insights | Currently listed in `.env.example`; no active runtime code reads it yet. |
| `AI_API_KEY` | Future/optional AI insights | Currently listed in `.env.example`; no active runtime code reads it yet. |

Generate local secrets with:

```bash
openssl rand -base64 48
```

Use one generated value for `DIRECT_CREDENTIAL_ENCRYPTION_KEY` and another for `OAUTH_STATE_SECRET`.

## OAuth Origins And Redirect URLs

All OAuth providers in this app use this callback path:

```text
{APP_BASE_URL}/api/connections/oauth
```

Examples:

```text
http://localhost:3000/api/connections/oauth
https://reports.example.com/api/connections/oauth
```

Add every local, staging, and production callback URL to each provider console before testing OAuth.

For Google Cloud OAuth clients, the console has two similar but different fields:

| Google OAuth field | Use this value | Example |
| --- | --- | --- |
| Authorized JavaScript origins | Origin only. Do not include a path and do not end with `/`. | `http://localhost:3000` |
| Authorized redirect URIs | Full OAuth callback URL. Include `/api/connections/oauth`. | `http://localhost:3000/api/connections/oauth` |

If Google shows `Invalid origin: URIs must not contain a path or end with '/'`, move the callback URL out of Authorized JavaScript origins and put only `http://localhost:3000` in that field.

## Google Ads MCC Setup

Use this for Google Ads MCC or manager account connections.

### What The App Needs

Environment variables:

```text
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_ADS_DEVELOPER_TOKEN
```

Direct credential fields per account mapping:

```text
developerToken
oauthClientId
oauthClientSecret
refreshToken
loginCustomerId
```

`loginCustomerId` is the MCC/manager customer ID. Enter it without hyphens.

### Get The Google OAuth Client

1. Open Google Cloud Console.
2. Create or select the agency reporting project.
3. Enable the Google Ads API.
4. If GA4 OAuth is also needed, enable the Google Analytics Data API.
5. Configure the OAuth consent screen.
6. Create an OAuth client:
   - Type: Web application.
   - Authorized redirect URI: `{APP_BASE_URL}/api/connections/oauth`.
7. Copy the client ID to `GOOGLE_OAUTH_CLIENT_ID`.
8. Copy the client secret to `GOOGLE_OAUTH_CLIENT_SECRET`.

### Get The Google Ads Developer Token

1. Sign in to Google Ads with a manager/MCC account.
2. Go to Tools and settings > Setup > API Center.
3. Apply for or copy the developer token.
4. Put it in `GOOGLE_ADS_DEVELOPER_TOKEN`.

Developer tokens are usually issued at the manager account level. One approved token can be used across multiple MCC/client mappings as long as the OAuth user and `loginCustomerId` have access.

### Connect Multiple MCCs

For each MCC or client mapping:

1. Create a client/account mapping in the app.
2. Use the client account ID as the source account ID when mapping a child account.
3. Use the relevant MCC manager account ID as `loginCustomerId`.
4. Remove hyphens from both IDs when entering them for API use.
5. Save credentials from `/connections`, or use the OAuth flow once the environment variables are set.

If one agency user has access to several MCCs, the same Google OAuth client can be reused. Each mapping still needs the correct `loginCustomerId` for the manager account that grants access to the client account.

### Refresh Token Notes

The app requests offline Google access using `access_type=offline` and `prompt=consent`. A refresh token is returned during consent and is encrypted in the database.

If Google does not return a refresh token:

1. Remove the app's access from the Google account's third-party access page.
2. Start the OAuth flow again.
3. Confirm the consent screen with the correct Google user that has MCC access.

## Meta Ads Setup

Use this for Meta Business Manager and ad account reporting.

### What The App Needs

Environment variables:

```text
META_APP_ID
META_APP_SECRET
```

Direct credential fields per account mapping:

```text
accessToken
adAccountId
```

The OAuth flow asks for these scopes:

```text
ads_read
business_management
```

### Get The Meta App Credentials

1. Open Meta for Developers.
2. Create an app for the agency or reporting tool.
3. Add Marketing API if required by the app setup flow.
4. Add `{APP_BASE_URL}/api/connections/oauth` as a valid OAuth redirect URI.
5. Copy the app ID to `META_APP_ID`.
6. Copy the app secret to `META_APP_SECRET`.

### Get Ad Account Access

Use one of these options:

- OAuth user token from the app connection flow.
- System user access token from Meta Business Settings.
- A manually generated long-lived token with `ads_read` and business/ad account access.

For each account mapping, save:

- `accessToken`: token with access to the ad account.
- `adAccountId`: the Meta ad account ID, usually in the form `act_1234567890`.

Meta may require Business Manager access, app review, advanced access, or business verification before production access works reliably.

## GA4 Setup

The app supports two GA4 credential styles: OAuth or service account.

### Option A: GA4 OAuth

Environment variables:

```text
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
```

Direct credential fields:

```text
propertyId
oauthClientId
oauthClientSecret
refreshToken
```

Steps:

1. In Google Cloud Console, enable Google Analytics Data API.
2. Use the same Web OAuth client as Google Ads, or create another Web OAuth client.
3. Add `{APP_BASE_URL}/api/connections/oauth` as an authorized redirect URI.
4. Ensure the Google user has Viewer or Analyst access to the GA4 property.
5. Connect through `/connections` or save the OAuth credentials manually.

`propertyId` is the numeric GA4 property ID, not the measurement ID. Use `123456789`, not `G-XXXXXXX`.

### Option B: GA4 Service Account

Direct credential fields:

```text
propertyId
clientEmail
privateKey
```

Steps:

1. Open Google Cloud Console.
2. Enable Google Analytics Data API.
3. Create a service account.
4. Create a JSON key for the service account.
5. Copy `client_email` into `clientEmail`.
6. Copy `private_key` into `privateKey`.
7. In GA4 Admin, add the service account email to the property with Viewer or Analyst access.
8. Save the credentials on `/connections`.

## Shopify Setup

Use this for Shopify stores and Admin API revenue/order data.

### What The App Needs

Environment variables for OAuth:

```text
SHOPIFY_CLIENT_ID
SHOPIFY_CLIENT_SECRET
```

Direct credential fields per store:

```text
storeDomain
accessToken
```

The app requests these OAuth scopes:

```text
read_orders
read_products
```

### OAuth App Setup

1. Create a Shopify Partner app or custom distribution app.
2. Set the app URL to the reporting app URL.
3. Add `{APP_BASE_URL}/api/connections/oauth` as an allowed redirection URL.
4. Copy the client ID/API key to `SHOPIFY_CLIENT_ID`.
5. Copy the client secret/API secret key to `SHOPIFY_CLIENT_SECRET`.

### Manual Store Token Setup

For a single store or MVP setup:

1. In Shopify Admin, go to Settings > Apps and sales channels > Develop apps.
2. Create or open a custom app.
3. Configure Admin API scopes:
   - `read_orders`
   - `read_products`
4. Install the app.
5. Reveal and copy the Admin API access token.
6. Save it on `/connections` with:
   - `storeDomain`: `your-store.myshopify.com`
   - `accessToken`: the Admin API access token

Some historical order access may require additional Shopify approval or scopes depending on the store and data range.

## Google Sheets Connector Setup

Use this for script-assisted imports, such as Google Ads MCC scripts exporting to Sheets.

### What The App Needs

Environment variables:

```text
GOOGLE_SHEETS_CLIENT_EMAIL
GOOGLE_SHEETS_PRIVATE_KEY
```

Connector config per mapping/import:

```text
spreadsheetId
range
dateField
sourceReference
platform
sourceAccountId
currency
```

### Get Service Account Credentials

1. Open Google Cloud Console.
2. Enable Google Sheets API.
3. Create a service account.
4. Create a JSON key.
5. Copy `client_email` to `GOOGLE_SHEETS_CLIENT_EMAIL`.
6. Copy `private_key` to `GOOGLE_SHEETS_PRIVATE_KEY`.
7. Keep newline characters escaped in `.env`, for example `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n`.
8. Share each reporting spreadsheet with the service account email as Viewer.

`spreadsheetId` is the long ID in the sheet URL between `/d/` and `/edit`.

## BigQuery Connector Setup

Use this for GA4 BigQuery export, centralized reporting tables, or scheduled script outputs.

### What The App Needs

Environment variables:

```text
BIGQUERY_CLIENT_EMAIL
BIGQUERY_PRIVATE_KEY
BIGQUERY_PROJECT_ID
```

Connector config per mapping/import:

```text
projectId
query
dateField
sourceReference
platform
sourceAccountId
currency
```

The connector uses `projectId` from import config when present, otherwise it uses `BIGQUERY_PROJECT_ID` from `.env`.

BigQuery SQL can use these query parameters:

```sql
@dateFrom
@dateTo
```

Example:

```sql
SELECT
  event_date AS date,
  sessions,
  activeUsers,
  purchaseRevenue,
  transactions
FROM `project.dataset.reporting_table`
WHERE event_date BETWEEN @dateFrom AND @dateTo
```

### Get BigQuery Service Account Credentials

1. Open Google Cloud Console.
2. Enable BigQuery API.
3. Create a service account.
4. Grant it the minimum needed roles:
   - BigQuery Job User on the project.
   - BigQuery Data Viewer on the dataset/table.
5. Create a JSON key.
6. Copy `client_email` to `BIGQUERY_CLIENT_EMAIL`.
7. Copy `private_key` to `BIGQUERY_PRIVATE_KEY`.
8. Keep newline characters escaped in `.env`.

For GA4 BigQuery export, ensure the service account can read the GA4 export dataset.

## Email Delivery Setup

Use any SMTP provider, such as Google Workspace app passwords, SendGrid SMTP, Mailgun SMTP, Amazon SES SMTP, or Postmark SMTP.

Required variables:

```text
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
```

Provider notes:

- Port `587` uses STARTTLS.
- Port `465` uses secure SMTP.
- Many providers require an app password or API-key-as-password rather than the mailbox password.

## WhatsApp Delivery Setup

The current app expects a generic HTTP WhatsApp provider.

Required variables:

```text
WHATSAPP_API_URL
WHATSAPP_API_TOKEN
```

The app sends a `POST` request with:

```json
{
  "to": "recipient-phone",
  "filename": "report.pdf",
  "message": "message text",
  "pdfBase64": "base64-pdf"
}
```

It passes the token as:

```text
Authorization: Bearer {WHATSAPP_API_TOKEN}
```

If you use Meta WhatsApp Cloud API, Twilio, or another provider, put a small adapter endpoint behind `WHATSAPP_API_URL` that accepts the app payload and calls the provider-specific API.

## Recommended `.env` Template

```dotenv
DATABASE_URL="postgresql://reports:reports@localhost:5432/reports_generator"
APP_BASE_URL="http://localhost:3000"
DEFAULT_AGENCY_USER_EMAIL="agency@example.com"

DIRECT_CREDENTIAL_ENCRYPTION_KEY="replace-with-32-byte-or-longer-secret"
OAUTH_STATE_SECRET="replace-with-state-signing-secret"

GOOGLE_OAUTH_CLIENT_ID="google-oauth-client-id"
GOOGLE_OAUTH_CLIENT_SECRET="google-oauth-client-secret"
GOOGLE_ADS_DEVELOPER_TOKEN="google-ads-developer-token"
GOOGLE_ADS_API_VERSION="v24"

META_APP_ID="meta-app-id"
META_APP_SECRET="meta-app-secret"

SHOPIFY_CLIENT_ID="shopify-client-id"
SHOPIFY_CLIENT_SECRET="shopify-client-secret"

GOOGLE_SHEETS_CLIENT_EMAIL="service-account@example.iam.gserviceaccount.com"
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

BIGQUERY_PROJECT_ID="agency-reporting"
BIGQUERY_CLIENT_EMAIL="service-account@example.iam.gserviceaccount.com"
BIGQUERY_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="reports@example.com"
SMTP_PASS="replace-with-secret"
SMTP_FROM="Agency Reports <reports@example.com>"

WHATSAPP_API_URL="https://whatsapp-provider.example.com/messages/document"
WHATSAPP_API_TOKEN="replace-with-secret"

AI_PROVIDER="rule_based"
AI_API_KEY=""
```

## Security Notes

- Never commit `.env` or real credentials.
- Store production values in your hosting platform's secret manager.
- Keep `DIRECT_CREDENTIAL_ENCRYPTION_KEY` stable. Changing it prevents decrypting previously saved direct credentials.
- Use separate Google service accounts for Sheets/BigQuery when possible.
- Grant least-privilege access to each service account.
- Remove hyphens from Google Ads customer IDs before storing API IDs.
- Treat refresh tokens, private keys, Shopify tokens, and Meta tokens as production secrets.
- Rotate provider tokens immediately if they are pasted into logs, screenshots, commits, or shared chat.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| OAuth starts but callback fails | Missing client secret or wrong redirect URI | Confirm provider app has `{APP_BASE_URL}/api/connections/oauth` and `.env` has the client secret. |
| Google does not return a refresh token | Consent already granted without new offline token | Remove app access from the Google account, then reconnect. |
| Google Ads says missing MCC login customer ID | `loginCustomerId` missing or includes hyphens | Enter the MCC manager ID without hyphens. |
| Google Ads access denied | OAuth user lacks access to MCC/client account | Grant the Google user access to the MCC or child account. |
| GA4 property not found | Wrong ID type or missing permission | Use numeric property ID and grant Viewer/Analyst access. |
| Sheets import fails auth | Spreadsheet not shared with service account | Share the sheet with `GOOGLE_SHEETS_CLIENT_EMAIL`. |
| BigQuery import fails permission | Service account lacks project/dataset roles | Add BigQuery Job User and Data Viewer roles. |
| Shopify token fails | Missing scopes or wrong store domain | Use `your-store.myshopify.com` and ensure token has `read_orders` and `read_products`. |
| Encrypted credentials fail to read | Encryption key changed | Restore the original `DIRECT_CREDENTIAL_ENCRYPTION_KEY` or re-save credentials. |
