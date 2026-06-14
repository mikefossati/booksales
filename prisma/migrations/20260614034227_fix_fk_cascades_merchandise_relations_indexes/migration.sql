-- DropForeignKey
ALTER TABLE "CsvImport" DROP CONSTRAINT "CsvImport_channelId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_channelId_fkey";

-- CreateIndex
CREATE INDEX "Expense_accountId_idx" ON "Expense"("accountId");

-- CreateIndex
CREATE INDEX "Expense_bookId_idx" ON "Expense"("bookId");

-- CreateIndex
CREATE INDEX "InventoryMovement_bookId_idx" ON "InventoryMovement"("bookId");

-- CreateIndex
CREATE INDEX "InventoryMovement_inventoryId_idx" ON "InventoryMovement"("inventoryId");

-- CreateIndex
CREATE INDEX "InventoryMovement_merchandiseId_idx" ON "InventoryMovement"("merchandiseId");

-- CreateIndex
CREATE INDEX "Merchandise_accountId_idx" ON "Merchandise"("accountId");

-- CreateIndex
CREATE INDEX "Sale_channelId_idx" ON "Sale"("channelId");

-- CreateIndex
CREATE INDEX "Sale_bookId_idx" ON "Sale"("bookId");

-- CreateIndex
CREATE INDEX "Sale_merchandiseId_idx" ON "Sale"("merchandiseId");

-- CreateIndex
CREATE INDEX "Sale_saleDate_idx" ON "Sale"("saleDate");

-- AddForeignKey
ALTER TABLE "CsvImport" ADD CONSTRAINT "CsvImport_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Merchandise" ADD CONSTRAINT "Merchandise_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Merchandise" ADD CONSTRAINT "Merchandise_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;
