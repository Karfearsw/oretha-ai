-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'Manual',
    "lane" TEXT NOT NULL DEFAULT 'In Progress',
    "assigneeId" TEXT NOT NULL DEFAULT 'oretha',
    "priority" TEXT NOT NULL DEFAULT 'med',
    "due" TEXT,
    "emailId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "EmailMessage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Task_emailId_key" ON "Task"("emailId");
