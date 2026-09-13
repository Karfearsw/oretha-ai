/* AgentMail message IDs are only unique per inbox — scope uniqueness to the mailbox. */

-- DropIndex
DROP INDEX IF EXISTS "EmailMessage_remoteId_key";

-- CreateIndex
CREATE UNIQUE INDEX "EmailMessage_mailboxId_remoteId_key" ON "EmailMessage"("mailboxId", "remoteId");
