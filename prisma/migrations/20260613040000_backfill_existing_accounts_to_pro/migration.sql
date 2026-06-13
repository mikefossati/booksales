-- Accounts created before monetization launch are grandfathered as PRO.
-- New accounts default to FREE (set in the previous migration).
UPDATE "Account" SET "plan" = 'PRO' WHERE "plan" = 'FREE';
