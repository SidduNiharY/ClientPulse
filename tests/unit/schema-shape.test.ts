import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";

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
