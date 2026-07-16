import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import {
  DOMAIN_EVIDENCE_ALLOWED_EXTENSIONS,
  DOMAIN_EVIDENCE_MAX_BYTES,
} from "@/lib/constants";

export {
  computeMaturityFromEvidenceLevels,
  isDomainLevelUnlocked,
} from "@/lib/domain-maturity";

/** Root penyimpanan file aplikasi. Di Docker = /app/data */
export function getDataRoot() {
  return process.env.DATA_DIR || path.join(process.cwd(), "data");
}

export function getDomainEvidenceRoot() {
  return path.join(getDataRoot(), "domain-dukung");
}

export async function ensureDomainEvidenceDirs() {
  const root = getDataRoot();
  const evidenceRoot = getDomainEvidenceRoot();
  await fs.mkdir(root, { recursive: true });
  await fs.mkdir(evidenceRoot, { recursive: true });
  return evidenceRoot;
}

export function sanitizeFilename(name: string) {
  return name
    .replace(/[^\w.\-()\s\u00C0-\u024F]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 120);
}

export function validateEvidenceFile(file: File): string | null {
  if (!file || file.size <= 0) return "File wajib diunggah";
  if (file.size > DOMAIN_EVIDENCE_MAX_BYTES) {
    return `Ukuran file maksimal ${Math.round(DOMAIN_EVIDENCE_MAX_BYTES / (1024 * 1024))} MB`;
  }
  const ext = path.extname(file.name).toLowerCase();
  if (
    !DOMAIN_EVIDENCE_ALLOWED_EXTENSIONS.includes(
      ext as (typeof DOMAIN_EVIDENCE_ALLOWED_EXTENSIONS)[number]
    )
  ) {
    return `Ekstensi tidak diizinkan. Gunakan: ${DOMAIN_EVIDENCE_ALLOWED_EXTENSIONS.join(", ")}`;
  }
  return null;
}

export async function saveDomainEvidenceFile(params: {
  domainCode: string;
  year: number;
  level: number;
  file: File;
}) {
  await ensureDomainEvidenceDirs();
  const safeName = sanitizeFilename(params.file.name);
  const storedName = `${randomUUID()}-${safeName}`;
  const relativeDir = path.join(
    "domain-dukung",
    params.domainCode,
    String(params.year),
    `level-${params.level}`
  );
  const absoluteDir = path.join(getDataRoot(), relativeDir);
  await fs.mkdir(absoluteDir, { recursive: true });

  const absolutePath = path.join(absoluteDir, storedName);
  const buffer = Buffer.from(await params.file.arrayBuffer());
  await fs.writeFile(absolutePath, buffer);

  return {
    filename: storedName,
    originalName: params.file.name,
    mimeType: params.file.type || "application/octet-stream",
    sizeBytes: params.file.size,
    storagePath: path.join(relativeDir, storedName).replace(/\\/g, "/"),
  };
}

export async function deleteStoredFile(storagePath: string) {
  const absolute = path.join(getDataRoot(), storagePath);
  try {
    await fs.unlink(absolute);
  } catch {
    // ignore missing file
  }
}

export function resolveStoredAbsolutePath(storagePath: string) {
  const root = getDataRoot();
  const absolute = path.resolve(root, storagePath);
  if (!absolute.startsWith(path.resolve(root))) {
    throw new Error("Invalid storage path");
  }
  return absolute;
}
