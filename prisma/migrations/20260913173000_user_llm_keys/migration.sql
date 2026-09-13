/* Bring-your-own-key LLM settings per user (key stored encrypted). */

-- AlterTable
ALTER TABLE "User" ADD COLUMN "llmProvider" TEXT;
ALTER TABLE "User" ADD COLUMN "llmApiKeyEnc" TEXT;
ALTER TABLE "User" ADD COLUMN "llmModel" TEXT;
ALTER TABLE "User" ADD COLUMN "llmBaseUrl" TEXT;
