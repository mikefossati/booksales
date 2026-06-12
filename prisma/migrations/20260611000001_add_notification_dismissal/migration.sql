-- Persisted dismissals for derived notifications. The key encodes the
-- notification identity + state so dismissed items resurface on real changes.
CREATE TABLE "NotificationDismissal" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationDismissal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationDismissal_accountId_key_key" ON "NotificationDismissal"("accountId", "key");

ALTER TABLE "NotificationDismissal" ADD CONSTRAINT "NotificationDismissal_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
