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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Shop" ("activeDays", "breakEnd", "breakStart", "cancellationPolicy", "city", "closeTime", "createdAt", "id", "name", "openTime", "phone", "slotMinutes", "slug", "timezone", "updatedAt") SELECT "activeDays", "breakEnd", "breakStart", "cancellationPolicy", "city", "closeTime", "createdAt", "id", "name", "openTime", "phone", "slotMinutes", "slug", "timezone", "updatedAt" FROM "Shop";
DROP TABLE "Shop";
ALTER TABLE "new_Shop" RENAME TO "Shop";
CREATE UNIQUE INDEX "Shop_slug_key" ON "Shop"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
