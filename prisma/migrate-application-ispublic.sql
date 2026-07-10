-- Add isPublic flag to Application
-- true = aplikasi layanan publik (ada Service terkait dengan scope EKSTERNAL)

ALTER TABLE "Application"
  ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN "Application"."isPublic" IS
  'Menandakan aplikasi layanan publik. Diisi true jika ada Service dengan namaAplikasi yang sama dan scope = EKSTERNAL.';
