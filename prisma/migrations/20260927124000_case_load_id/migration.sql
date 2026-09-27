-- AlterTable
ALTER TABLE "VerifyCase" ADD COLUMN IF NOT EXISTS "loadId" TEXT;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "VerifyCase" ADD CONSTRAINT "VerifyCase_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VerifyCase_orgId_loadId_idx" ON "VerifyCase"("orgId", "loadId");
