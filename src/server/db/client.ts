import * as prismaClientModule from "@prisma/client";

type PrismaClient = {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
};

const PrismaClient = (
  prismaClientModule as unknown as {
    PrismaClient: new () => PrismaClient;
  }
).PrismaClient;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
