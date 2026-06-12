-- The settlement period a payment covers is informational; make it optional
ALTER TABLE "Payment" ALTER COLUMN "periodStart" DROP NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "periodEnd" DROP NOT NULL;
