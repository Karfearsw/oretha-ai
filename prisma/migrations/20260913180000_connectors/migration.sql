/* Connectors: encrypted user-linked external services + idempotent task sync. */

-- CreateTable
CREATE TABLE "Connector" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "tokenCipher" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "meta" TEXT NOT NULL DEFAULT '{}',
    "lastSyncAt" DATETIME,
    "lastSyncInfo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Connector_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Connector_userId_kind_key" ON "Connector"("userId", "kind");

-- AlterTable: idempotent remote key for synced tasks
ALTER TABLE "Task" ADD COLUMN "remoteKey" TEXT;
CREATE UNIQUE INDEX "Task_userId_remoteKey_key" ON "Task"("userId", "remoteKey");
