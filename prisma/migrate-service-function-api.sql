-- ServiceFunctionApi: list API per fungsi layanan + status ketersediaan

DO $$ BEGIN
  CREATE TYPE "FunctionApiStatus" AS ENUM ('BELUM_TERSEDIA', 'ON_PROGRESS', 'SUDAH_TERSEDIA');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ServiceFunctionApi" (
  "id" TEXT NOT NULL,
  "functionId" TEXT NOT NULL,
  "nama" TEXT NOT NULL,
  "endpoint" TEXT,
  "status" "FunctionApiStatus" NOT NULL DEFAULT 'BELUM_TERSEDIA',
  "catatan" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceFunctionApi_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ServiceFunctionApi_functionId_idx" ON "ServiceFunctionApi"("functionId");
CREATE INDEX IF NOT EXISTS "ServiceFunctionApi_status_idx" ON "ServiceFunctionApi"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ServiceFunctionApi_functionId_fkey'
  ) THEN
    ALTER TABLE "ServiceFunctionApi"
      ADD CONSTRAINT "ServiceFunctionApi_functionId_fkey"
      FOREIGN KEY ("functionId") REFERENCES "ServiceFunction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
