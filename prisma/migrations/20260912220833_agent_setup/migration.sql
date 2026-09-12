-- CreateTable
CREATE TABLE "AgentFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "avatarSeed" TEXT NOT NULL DEFAULT 'T',
    "setupCompleted" BOOLEAN NOT NULL DEFAULT false,
    "agentName" TEXT NOT NULL DEFAULT 'Oretha',
    "agentEmoji" TEXT NOT NULL DEFAULT '',
    "voice" TEXT,
    "timezone" TEXT,
    "censorship" TEXT NOT NULL DEFAULT 'open',
    "empowerment" BOOLEAN NOT NULL DEFAULT true,
    "responseLength" TEXT NOT NULL DEFAULT 'balanced',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("avatarSeed", "createdAt", "email", "id", "name", "passwordHash", "plan", "tagline", "updatedAt") SELECT "avatarSeed", "createdAt", "email", "id", "name", "passwordHash", "plan", "tagline", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AgentFile_userId_name_key" ON "AgentFile"("userId", "name");
