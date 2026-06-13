-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO');

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "planExpiresAt" TIMESTAMP(3);
