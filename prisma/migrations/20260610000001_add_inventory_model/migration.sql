-- Inventory locations (stock can live in multiple places)
CREATE TABLE "Inventory" (
  "id"        TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Inventory_accountId_fkey" FOREIGN KEY ("accountId")
    REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Channel → inventory link (null = no physical stock, e.g. print-on-demand)
ALTER TABLE "Channel" ADD COLUMN "inventoryId" TEXT;
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_inventoryId_fkey"
  FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Movement extensions
ALTER TABLE "InventoryMovement" ADD COLUMN "inventoryId" TEXT;
ALTER TABLE "InventoryMovement" ADD COLUMN "transferGroupId" TEXT;
ALTER TABLE "InventoryMovement" ADD COLUMN "saleId" TEXT;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_inventoryId_fkey"
  FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_saleId_fkey"
  FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- New movement types (usable from the next migration onward)
ALTER TYPE "InventoryMovementType" ADD VALUE 'TRANSFER_OUT';
ALTER TYPE "InventoryMovementType" ADD VALUE 'TRANSFER_IN';
ALTER TYPE "InventoryMovementType" ADD VALUE 'ADJUSTMENT_IN';
ALTER TYPE "InventoryMovementType" ADD VALUE 'ADJUSTMENT_OUT';
