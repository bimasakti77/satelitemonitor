-- Generate data Application dari DISTINCT Service.namaAplikasi
-- isPublic = true jika minimal satu Service dengan nama tersebut ber-scope EKSTERNAL
--
-- Prasyarat: jalankan migrate-application-ispublic.sql terlebih dahulu
-- Opsional: jalankan truncate-application.sql sebelum script ini jika ingin rebuild penuh

WITH apps AS (
  SELECT
    TRIM(s."namaAplikasi") AS "name",
    BOOL_OR(s.scope = 'EKSTERNAL') AS "isPublic"
  FROM "Service" s
  WHERE s."isDeleted" = false
    AND s."namaAplikasi" IS NOT NULL
    AND TRIM(s."namaAplikasi") <> ''
  GROUP BY TRIM(s."namaAplikasi")
),
descriptions AS (
  SELECT DISTINCT ON (TRIM(s."namaAplikasi"))
    TRIM(s."namaAplikasi") AS "name",
    NULLIF(TRIM(s."detailAplikasi"), '') AS "description"
  FROM "Service" s
  WHERE s."isDeleted" = false
    AND s."namaAplikasi" IS NOT NULL
    AND TRIM(s."namaAplikasi") <> ''
    AND s."detailAplikasi" IS NOT NULL
    AND TRIM(s."detailAplikasi") <> ''
  ORDER BY TRIM(s."namaAplikasi"), s."updatedAt" DESC
)
INSERT INTO "Application" (
  "id",
  "name",
  "description",
  "vendor",
  "isPublic",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  a."name",
  d."description",
  NULL,
  a."isPublic",
  true,
  NOW(),
  NOW()
FROM apps a
LEFT JOIN descriptions d ON d."name" = a."name"
ON CONFLICT ("name") DO UPDATE SET
  "description" = COALESCE(EXCLUDED."description", "Application"."description"),
  "isPublic" = EXCLUDED."isPublic",
  "isActive" = true,
  "updatedAt" = NOW();
