-- Project Dossier foundation schema

DO $$ BEGIN
  CREATE TYPE "DomainProgressStatus" AS ENUM ('VERY_HIGH', 'NEEDS_STRENGTHENING', 'ACHIEVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DossierTeamType" AS ENUM ('STEERING', 'EXECUTING');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DocumentCompleteness" AS ENUM ('NOT_AVAILABLE', 'DRAFT', 'COMPLETE', 'VERIFIED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ProjectProfile" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "background" TEXT,
  "baselineYear" INTEGER NOT NULL DEFAULT 2026,
  "targetYear" INTEGER NOT NULL DEFAULT 2028,
  "targetMaturityLevel" INTEGER NOT NULL DEFAULT 4,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DossierDomain" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DossierDomain_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DossierDomain_code_key" ON "DossierDomain"("code");

CREATE TABLE IF NOT EXISTS "DossierDomainAssessment" (
  "id" TEXT NOT NULL,
  "domainId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "maturityLevel" INTEGER NOT NULL DEFAULT 2,
  "status" "DomainProgressStatus" NOT NULL DEFAULT 'NEEDS_STRENGTHENING',
  "remarks" TEXT,
  "targetText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DossierDomainAssessment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DossierDomainAssessment_domainId_year_key"
  ON "DossierDomainAssessment"("domainId", "year");
CREATE INDEX IF NOT EXISTS "DossierDomainAssessment_year_idx"
  ON "DossierDomainAssessment"("year");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DossierDomainAssessment_domainId_fkey'
  ) THEN
    ALTER TABLE "DossierDomainAssessment"
      ADD CONSTRAINT "DossierDomainAssessment_domainId_fkey"
      FOREIGN KEY ("domainId") REFERENCES "DossierDomain"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "DossierIndicator" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "baselineCondition" TEXT NOT NULL,
  "targetCondition" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DossierIndicator_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DossierRoadmapItem" (
  "id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DossierRoadmapItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DossierRoadmapItem_year_idx" ON "DossierRoadmapItem"("year");

CREATE TABLE IF NOT EXISTS "DossierTeamMember" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "roleTitle" TEXT NOT NULL,
  "unit" TEXT,
  "teamType" "DossierTeamType" NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DossierTeamMember_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DossierTeamMember_teamType_idx" ON "DossierTeamMember"("teamType");

CREATE TABLE IF NOT EXISTS "DossierDocument" (
  "id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "filename" TEXT,
  "mimeType" TEXT,
  "sizeBytes" INTEGER,
  "storagePath" TEXT,
  "completeness" "DocumentCompleteness" NOT NULL DEFAULT 'NOT_AVAILABLE',
  "notes" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DossierDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DossierDocument_category_idx" ON "DossierDocument"("category");
CREATE INDEX IF NOT EXISTS "DossierDocument_completeness_idx" ON "DossierDocument"("completeness");

CREATE TABLE IF NOT EXISTS "DossierDomainLevelEvidence" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "level" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "filename" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storagePath" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "uploadedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DossierDomainLevelEvidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DossierDomainLevelEvidence_assessmentId_level_idx"
  ON "DossierDomainLevelEvidence"("assessmentId", "level");
CREATE INDEX IF NOT EXISTS "DossierDomainLevelEvidence_isActive_idx"
  ON "DossierDomainLevelEvidence"("isActive");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DossierDomainLevelEvidence_assessmentId_fkey'
  ) THEN
    ALTER TABLE "DossierDomainLevelEvidence"
      ADD CONSTRAINT "DossierDomainLevelEvidence_assessmentId_fkey"
      FOREIGN KEY ("assessmentId") REFERENCES "DossierDomainAssessment"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
