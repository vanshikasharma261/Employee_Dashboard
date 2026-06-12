/*
  Warnings:

  - Added the required column `event_type` to the `asset_allocation_history` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "asset_allocation_history" ADD COLUMN     "event_type" "RequestType" NOT NULL;

-- CreateIndex
CREATE INDEX "asset_allocation_history_event_type_idx" ON "asset_allocation_history"("event_type");
