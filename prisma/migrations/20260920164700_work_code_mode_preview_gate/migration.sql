-- CreateTable
CREATE TABLE "DevTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'preview',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "plan" TEXT NOT NULL,
    "risks" TEXT NOT NULL,
    "nextStep" TEXT NOT NULL,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DevTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DevTask_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Thread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL DEFAULT 't1',
    "title" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'work',
    "cloudEnv" TEXT NOT NULL DEFAULT 'local',
    "repoName" TEXT,
    "branchName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Thread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Thread" ("createdAt", "id", "slug", "title", "updatedAt", "userId") SELECT "createdAt", "id", "slug", "title", "updatedAt", "userId" FROM "Thread";
DROP TABLE "Thread";
ALTER TABLE "new_Thread" RENAME TO "Thread";
CREATE UNIQUE INDEX "Thread_userId_slug_key" ON "Thread"("userId", "slug");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "avatarSeed" TEXT NOT NULL DEFAULT 'T',
    "defaultMode" TEXT NOT NULL DEFAULT 'work',
    "setupCompleted" BOOLEAN NOT NULL DEFAULT false,
    "agentName" TEXT NOT NULL DEFAULT 'Oretha',
    "agentEmoji" TEXT NOT NULL DEFAULT '',
    "voice" TEXT,
    "timezone" TEXT,
    "censorship" TEXT NOT NULL DEFAULT 'open',
    "empowerment" BOOLEAN NOT NULL DEFAULT true,
    "responseLength" TEXT NOT NULL DEFAULT 'balanced',
    "llmProvider" TEXT,
    "llmApiKeyEnc" TEXT,
    "llmModel" TEXT,
    "llmBaseUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("agentEmoji", "agentName", "avatarSeed", "censorship", "createdAt", "email", "empowerment", "id", "llmApiKeyEnc", "llmBaseUrl", "llmModel", "llmProvider", "name", "passwordHash", "plan", "responseLength", "setupCompleted", "tagline", "timezone", "updatedAt", "voice") SELECT "agentEmoji", "agentName", "avatarSeed", "censorship", "createdAt", "email", "empowerment", "id", "llmApiKeyEnc", "llmBaseUrl", "llmModel", "llmProvider", "name", "passwordHash", "plan", "responseLength", "setupCompleted", "tagline", "timezone", "updatedAt", "voice" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "DevTask_userId_threadId_createdAt_idx" ON "DevTask"("userId", "threadId", "createdAt");
