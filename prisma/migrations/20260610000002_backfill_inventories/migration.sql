-- ── 1. Default personal inventory per account ────────────────────────────────
INSERT INTO "Inventory" ("id", "accountId", "name", "isDefault", "updatedAt")
SELECT gen_random_uuid()::text, a."id", 'Inventario personal', true, CURRENT_TIMESTAMP
FROM "Account" a;

-- ── 2. Link DIRECT / PRESALE channels to the personal inventory ──────────────
UPDATE "Channel" c
SET "inventoryId" = i."id"
FROM "Inventory" i
WHERE i."accountId" = c."accountId" AND i."isDefault" = true
  AND c."type" IN ('DIRECT', 'PRESALE');

-- ── 3. One own inventory per BOOKSTORE channel ────────────────────────────────
INSERT INTO "Inventory" ("id", "accountId", "name", "isDefault", "updatedAt")
SELECT gen_random_uuid()::text, c."accountId", c."name", false, CURRENT_TIMESTAMP
FROM "Channel" c
WHERE c."type" = 'BOOKSTORE';

UPDATE "Channel" c
SET "inventoryId" = i."id"
FROM "Inventory" i
WHERE c."type" = 'BOOKSTORE'
  AND i."accountId" = c."accountId" AND i."name" = c."name" AND i."isDefault" = false
  AND c."inventoryId" IS NULL;

-- ── 4. Personal-inventory backfill for existing book movements ───────────────
UPDATE "InventoryMovement" m
SET "inventoryId" = i."id"
FROM "Book" b, "Inventory" i
WHERE m."bookId" = b."id" AND i."accountId" = b."accountId" AND i."isDefault" = true
  AND m."type" IN ('NEW_PRINT_RUN', 'DIRECT_SALE', 'SEND_TO_INFLUENCER', 'WRITEOFF', 'BUNDLE_ASSEMBLY');

-- ── 5. Convert bookstore sends into transfers (personal → bookstore) ─────────
-- The IN side first (reads the original rows), then rewrite the originals as OUT.
INSERT INTO "InventoryMovement"
  ("id", "bookId", "type", "quantity", "inventoryId", "transferGroupId", "channelId", "notes", "occurredAt", "createdAt")
SELECT gen_random_uuid()::text, m."bookId", 'TRANSFER_IN', m."quantity", c."inventoryId", m."id",
       m."channelId", m."notes", m."occurredAt", m."createdAt"
FROM "InventoryMovement" m
JOIN "Channel" c ON c."id" = m."channelId"
WHERE m."type" = 'SEND_TO_BOOKSTORE' AND c."inventoryId" IS NOT NULL;

UPDATE "InventoryMovement" m
SET "type" = 'TRANSFER_OUT', "transferGroupId" = m."id",
    "inventoryId" = i."id"
FROM "Book" b, "Inventory" i
WHERE m."bookId" = b."id" AND i."accountId" = b."accountId" AND i."isDefault" = true
  AND m."type" = 'SEND_TO_BOOKSTORE';

-- ── 6. Convert bookstore returns into transfers (bookstore → personal) ───────
INSERT INTO "InventoryMovement"
  ("id", "bookId", "type", "quantity", "inventoryId", "transferGroupId", "channelId", "notes", "occurredAt", "createdAt")
SELECT gen_random_uuid()::text, m."bookId", 'TRANSFER_IN', m."quantity", i."id", m."id",
       m."channelId", m."notes", m."occurredAt", m."createdAt"
FROM "InventoryMovement" m
JOIN "Book" b ON b."id" = m."bookId"
JOIN "Inventory" i ON i."accountId" = b."accountId" AND i."isDefault" = true
WHERE m."type" = 'BOOKSTORE_RETURN';

UPDATE "InventoryMovement" m
SET "type" = 'TRANSFER_OUT', "transferGroupId" = m."id",
    "inventoryId" = c."inventoryId"
FROM "Channel" c
WHERE c."id" = m."channelId"
  AND m."type" = 'BOOKSTORE_RETURN' AND c."inventoryId" IS NOT NULL;

-- ── 7. Deduct historical consignment (bookstore) sales of print books ────────
-- These never generated movements; create them now linked to their sales.
INSERT INTO "InventoryMovement"
  ("id", "bookId", "type", "quantity", "inventoryId", "saleId", "channelId", "occurredAt", "createdAt")
SELECT gen_random_uuid()::text, s."bookId", 'DIRECT_SALE', s."quantity", c."inventoryId", s."id",
       s."channelId", s."saleDate", CURRENT_TIMESTAMP
FROM "Sale" s
JOIN "Channel" c ON c."id" = s."channelId"
JOIN "Book" b    ON b."id" = s."bookId"
WHERE c."type" = 'BOOKSTORE' AND c."inventoryId" IS NOT NULL
  AND s."status" != 'CANCELLED'
  AND 'PRINT' = ANY(b."formats");
