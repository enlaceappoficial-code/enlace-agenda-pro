-- CreateTable
CREATE TABLE "EnlaceOutbox" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EnlaceOutbox_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appId" TEXT NOT NULL DEFAULT 'PELUQUERIA',
    "planId" TEXT NOT NULL DEFAULT 'BASIC',
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "city" TEXT,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Santiago',
    "slotMinutes" INTEGER NOT NULL DEFAULT 30,
    "openTime" TEXT NOT NULL DEFAULT '09:00',
    "closeTime" TEXT NOT NULL DEFAULT '20:00',
    "breakStart" TEXT,
    "breakEnd" TEXT,
    "activeDays" JSONB NOT NULL DEFAULT [1,2,3,4,5,6],
    "cancellationPolicy" TEXT NOT NULL DEFAULT 'Cancela con al menos 2 horas de anticipación.',
    "enlaceProfileId" TEXT,
    "enlaceTokenApp" TEXT,
    "enlaceDisponible" BOOLEAN NOT NULL DEFAULT false,
    "enlaceMsg" TEXT NOT NULL DEFAULT 'Disponible ahora',
    "enlaceLastSyncAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Shop" ("activeDays", "appId", "breakEnd", "breakStart", "cancellationPolicy", "city", "closeTime", "createdAt", "id", "name", "openTime", "phone", "planId", "slotMinutes", "slug", "timezone", "updatedAt") SELECT "activeDays", "appId", "breakEnd", "breakStart", "cancellationPolicy", "city", "closeTime", "createdAt", "id", "name", "openTime", "phone", "planId", "slotMinutes", "slug", "timezone", "updatedAt" FROM "Shop";
DROP TABLE "Shop";
ALTER TABLE "new_Shop" RENAME TO "Shop";
CREATE UNIQUE INDEX "Shop_slug_key" ON "Shop"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "EnlaceOutbox_shopId_status_nextAttemptAt_idx" ON "EnlaceOutbox"("shopId", "status", "nextAttemptAt");
