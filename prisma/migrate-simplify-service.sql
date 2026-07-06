-- Simplify Service to required fields + ServiceFunction 1-to-many

ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "jenisLayanan" TEXT;

UPDATE "Service"
SET "jenisLayanan" = COALESCE(NULLIF("namaLayanan", ''), NULLIF("jenisLayanan", ''), 'Layanan')
WHERE "jenisLayanan" IS NULL OR "jenisLayanan" = '' OR "namaLayanan" IS NOT NULL;

ALTER TABLE "Service" ALTER COLUMN "jenisLayanan" SET NOT NULL;

ALTER TABLE "Service" DROP COLUMN IF EXISTS "noUrut";
ALTER TABLE "Service" DROP COLUMN IF EXISTS "namaLayanan";
ALTER TABLE "Service" DROP COLUMN IF EXISTS "uraianAplikasi";
ALTER TABLE "Service" DROP COLUMN IF EXISTS "keterangan";
ALTER TABLE "Service" DROP COLUMN IF EXISTS "idRaa";
ALTER TABLE "Service" DROP COLUMN IF EXISTS "idDaa";
ALTER TABLE "Service" DROP COLUMN IF EXISTS "dataYangDigunakan";
ALTER TABLE "Service" DROP COLUMN IF EXISTS "prosesBisnis";
ALTER TABLE "Service" DROP COLUMN IF EXISTS "sistemPenghubungLayanan";
ALTER TABLE "Service" DROP COLUMN IF EXISTS "unitOperasionalTeknologi";
ALTER TABLE "Service" DROP COLUMN IF EXISTS "raaLevel4AsIs";
ALTER TABLE "Service" DROP COLUMN IF EXISTS "raaLevel4ToBe";
ALTER TABLE "Service" DROP COLUMN IF EXISTS "unitKerja";
ALTER TABLE "Service" DROP COLUMN IF EXISTS "koreksi";
ALTER TABLE "Service" DROP COLUMN IF EXISTS "statusLayananInternalEksternal";

DROP INDEX IF EXISTS "Service_idRaa_idx";
DROP INDEX IF EXISTS "Service_namaLayanan_idx";
CREATE INDEX IF NOT EXISTS "Service_jenisLayanan_idx" ON "Service"("jenisLayanan");

CREATE TABLE IF NOT EXISTS "ServiceFunction" (
  "id" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "nama" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceFunction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ServiceFunction_serviceId_idx" ON "ServiceFunction"("serviceId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ServiceFunction_serviceId_fkey'
  ) THEN
    ALTER TABLE "ServiceFunction"
      ADD CONSTRAINT "ServiceFunction_serviceId_fkey"
      FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
