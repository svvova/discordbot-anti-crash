-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('CHANNEL', 'ROLE', 'WEBHOOK', 'EMOJI', 'STICKER');

-- CreateTable
CREATE TABLE "ServerSettings" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL DEFAULT 100,
    "windowSeconds" INTEGER NOT NULL DEFAULT 60,
    "logChannelId" TEXT,
    "recoveryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "punishmentMode" TEXT NOT NULL DEFAULT 'TIMEOUT',
    "timeoutSeconds" INTEGER NOT NULL DEFAULT 3600,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServerSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceSnapshot" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "executorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "score" INTEGER NOT NULL,
    "threshold" INTEGER NOT NULL,
    "punishmentResult" TEXT,
    "recoveryResult" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServerSettings_guildId_key" ON "ServerSettings"("guildId");

-- CreateIndex
CREATE INDEX "ServerSettings_guildId_idx" ON "ServerSettings"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceSnapshot_guildId_resourceType_resourceId_key" ON "ResourceSnapshot"("guildId", "resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "ResourceSnapshot_guildId_resourceType_createdAt_idx" ON "ResourceSnapshot"("guildId", "resourceType", "createdAt");

-- CreateIndex
CREATE INDEX "Incident_guildId_createdAt_idx" ON "Incident"("guildId", "createdAt");

-- CreateIndex
CREATE INDEX "Incident_guildId_action_createdAt_idx" ON "Incident"("guildId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "Incident_executorId_idx" ON "Incident"("executorId");
