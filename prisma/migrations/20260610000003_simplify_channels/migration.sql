-- Simplification: sales record the final received amount, so royalty and
-- consignment percentages are removed; PRESALE channels behave like DIRECT.

-- 1. Convert any PRESALE channels to DIRECT (none exist today; safety net)
UPDATE "Channel" SET "type" = 'DIRECT' WHERE "type" = 'PRESALE';

-- 2. Recreate the enum without PRESALE
ALTER TYPE "ChannelType" RENAME TO "ChannelType_old";
CREATE TYPE "ChannelType" AS ENUM ('DIGITAL', 'BOOKSTORE', 'DIRECT');
ALTER TABLE "Channel" ALTER COLUMN "type" TYPE "ChannelType"
  USING ("type"::text::"ChannelType");
DROP TYPE "ChannelType_old";

-- 3. Drop percentage, consignment-tracking, presale, and never-used fields
ALTER TABLE "Channel" DROP COLUMN IF EXISTS "royaltyPercent";
ALTER TABLE "Channel" DROP COLUMN IF EXISTS "consignmentPercent";
ALTER TABLE "Channel" DROP COLUMN IF EXISTS "consignmentDays";
ALTER TABLE "Channel" DROP COLUMN IF EXISTS "consignmentStartAt";
ALTER TABLE "Channel" DROP COLUMN IF EXISTS "isPresale";
ALTER TABLE "Channel" DROP COLUMN IF EXISTS "presaleCloseAt";
ALTER TABLE "Channel" DROP COLUMN IF EXISTS "presaleDeliveryAt";
ALTER TABLE "Channel" DROP COLUMN IF EXISTS "paymentDelaySays";
ALTER TABLE "Channel" DROP COLUMN IF EXISTS "paymentFrequency";
