-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "refresh_token_hash" TEXT;
