CREATE TABLE "DirectCredential" (
    "id" TEXT NOT NULL,
    "accountMappingId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "encryptedToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scopes" TEXT[],
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectCredential_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DirectCredential_accountMappingId_idx" ON "DirectCredential"("accountMappingId");

CREATE INDEX "DirectCredential_provider_status_idx" ON "DirectCredential"("provider", "status");
