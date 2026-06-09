-- Bulk sales: total entered directly, unitPrice stores the derived average
ALTER TABLE "Sale" ADD COLUMN "isBulk" BOOLEAN NOT NULL DEFAULT false;
