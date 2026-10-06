-- CreateTable
CREATE TABLE "Watch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'change',
    "needle" TEXT,
    "threshold" REAL,
    "schedule" TEXT NOT NULL DEFAULT 'daily',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastHash" TEXT,
    "lastValue" TEXT,
    "lastCheckAt" DATETIME,
    "lastStatus" TEXT NOT NULL DEFAULT 'idle',
    "lastError" TEXT,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Watch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "threadId" TEXT,
    "title" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'awaiting_approval',
    "steps" TEXT NOT NULL DEFAULT '[]',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT NOT NULL DEFAULT '',
    "leaseUntil" DATETIME,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Watch_userId_enabled_idx" ON "Watch"("userId", "enabled");

-- CreateIndex
CREATE INDEX "AgentTask_userId_status_idx" ON "AgentTask"("userId", "status");
