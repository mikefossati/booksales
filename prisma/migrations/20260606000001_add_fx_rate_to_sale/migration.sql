-- Add FX rate and pre-computed CLP equivalent to Sale
ALTER TABLE "Sale" ADD COLUMN "fxRateToCLP" DECIMAL(12,6);
ALTER TABLE "Sale" ADD COLUMN "amountCLP"   DECIMAL(12,2);

-- Backfill: all existing records are in CLP (baseCurrency), so amountCLP = totalAmount
UPDATE "Sale" SET "amountCLP" = "totalAmount" WHERE "currency" = 'CLP';
