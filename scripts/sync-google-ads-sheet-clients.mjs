#!/usr/bin/env node

import Papa from "papaparse";
import { PrismaClient } from "@prisma/client";

const required = ["GOOGLE_ADS_SHEET_ID"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const prisma = new PrismaClient();
const spreadsheetId = process.env.GOOGLE_ADS_SHEET_ID;
const sheetRange =
  process.env.GOOGLE_ADS_SHEET_RANGE ?? "Data Extraction Spreadsheet!A:Q";
const sheetName = sheetRange.split("!")[0] || sheetRange;
const sourceReference =
  process.env.GOOGLE_ADS_SOURCE_REFERENCE ?? "google-ads-mcc-sheet";
const csvUrl =
  `https://docs.google.com/spreadsheets/d/${spreadsheetId}` +
  `/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;

try {
  const response = await fetch(csvUrl);

  if (!response.ok) {
    throw new Error(`Google Sheet CSV export failed with ${response.status}`);
  }

  const csv = await response.text();
  const parsed = Papa.parse(csv, {
    header: true,
    skipEmptyLines: true
  });

  if (parsed.errors.length > 0) {
    throw new Error(`CSV parse failed: ${parsed.errors[0].message}`);
  }

  const accounts = collectAccounts(parsed.data);
  let createdClients = 0;
  let createdMappings = 0;
  let updatedMappings = 0;

  for (const account of accounts) {
    const existingMapping = await prisma.accountMapping.findFirst({
      where: {
        platform: "google_ads",
        sourceAccountId: account.accountId
      },
      include: {
        client: true
      }
    });
    const client =
      existingMapping?.client ??
      (await prisma.client.create({
        data: {
          name: account.accountName,
          clientType: "ecommerce",
          primaryEmail: `reports+${normalizeAccountId(account.accountId)}@example.com`,
          currency: process.env.REPORTS_CURRENCY ?? "INR"
        }
      }));

    if (!existingMapping) {
      createdClients += 1;
    }

    const config = {
      spreadsheetId,
      range: sheetRange,
      dateField: process.env.GOOGLE_ADS_DATE_FIELD ?? "Date",
      accountIdField: process.env.GOOGLE_ADS_ACCOUNT_ID_FIELD ?? "Account ID",
      publicCsv: process.env.GOOGLE_ADS_PUBLIC_CSV ?? "true",
      sourceReference
    };

    if (existingMapping) {
      await prisma.accountMapping.update({
        where: { id: existingMapping.id },
        data: {
          accountName: account.accountName,
          ingestionMethod: "google_sheets",
          config
        }
      });
      updatedMappings += 1;
      continue;
    }

    await prisma.accountMapping.create({
      data: {
        clientId: client.id,
        platform: "google_ads",
        accountName: account.accountName,
        sourceAccountId: account.accountId,
        ingestionMethod: "google_sheets",
        fallbackMethod: "csv_upload",
        config
      }
    });
    createdMappings += 1;
  }

  console.log(
    `Synced ${accounts.length} accounts: ${createdClients} clients created, ${createdMappings} mappings created, ${updatedMappings} mappings updated.`
  );
} finally {
  await prisma.$disconnect();
}

function collectAccounts(rows) {
  const accounts = new Map();

  for (const row of rows) {
    const accountId = String(row["Account ID"] ?? "").trim();
    const accountName = String(row.Account ?? "").trim();

    if (!accountId || !accountName || accounts.has(accountId)) {
      continue;
    }

    accounts.set(accountId, { accountId, accountName });
  }

  return [...accounts.values()].sort((a, b) =>
    a.accountName.localeCompare(b.accountName)
  );
}

function normalizeAccountId(value) {
  return String(value).replaceAll("-", "").trim();
}
