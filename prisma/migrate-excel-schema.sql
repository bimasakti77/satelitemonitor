-- Migrate Service table to Excel-aligned structure (non-destructive data migration)

ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "noUrut" INTEGER;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "kelompokLayanan" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "tipeLayananInternal" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "namaAplikasi" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "uraianAplikasi" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "idRaa" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "idDaa" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "dataYangDigunakan" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "prosesBisnis" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "sistemPenghubungLayanan" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "unitOperasionalTeknologi" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "raaLevel4AsIs" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "raaLevel4ToBe" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "unitKerja" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "jenisLayanan" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "koreksi" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "statusLayananInternalEksternal" TEXT;

UPDATE "Service" s
SET "kelompokLayanan" = sg.name
FROM "ServiceGroup" sg
WHERE s."serviceGroupId" = sg.id
  AND (s."kelompokLayanan" IS NULL OR s."kelompokLayanan" = '');

UPDATE "Service"
SET "kelompokLayanan" = 'Lainnya'
WHERE "kelompokLayanan" IS NULL OR "kelompokLayanan" = '';

UPDATE "Service"
SET "uraianAplikasi" = uraian
WHERE uraian IS NOT NULL
  AND ("uraianAplikasi" IS NULL OR "uraianAplikasi" = '');

UPDATE "Service" s
SET "namaAplikasi" = a.name
FROM "Application" a
WHERE s."applicationId" = a.id
  AND (s."namaAplikasi" IS NULL OR s."namaAplikasi" = '');

UPDATE "Service"
SET "tipeLayananInternal" = "internalType"::text
WHERE "internalType" IS NOT NULL
  AND ("tipeLayananInternal" IS NULL OR "tipeLayananInternal" = '');

UPDATE "Service" s
SET "unitKerja" = u.name
FROM "Uke" u
WHERE s."ukeId" = u.id
  AND (s."unitKerja" IS NULL OR s."unitKerja" = '');

ALTER TABLE "Service" ALTER COLUMN "kelompokLayanan" SET NOT NULL;

ALTER TABLE "Service" DROP CONSTRAINT IF EXISTS "Service_serviceGroupId_fkey";
ALTER TABLE "Service" DROP CONSTRAINT IF EXISTS "Service_applicationId_fkey";

ALTER TABLE "Service" DROP COLUMN IF EXISTS "serviceGroupId";
ALTER TABLE "Service" DROP COLUMN IF EXISTS "applicationId";
ALTER TABLE "Service" DROP COLUMN IF EXISTS "internalType";
ALTER TABLE "Service" DROP COLUMN IF EXISTS uraian;

ALTER TABLE "Service" ALTER COLUMN "ukeId" DROP NOT NULL;

DROP TABLE IF EXISTS "ServiceGroup";
DROP TYPE IF EXISTS "InternalType";

CREATE INDEX IF NOT EXISTS "Service_kelompokLayanan_idx" ON "Service"("kelompokLayanan");
CREATE INDEX IF NOT EXISTS "Service_idRaa_idx" ON "Service"("idRaa");
