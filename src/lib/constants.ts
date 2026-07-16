import type { UserRole } from "@prisma/client";

export const APP_NAME = "SuperApps Executive Monitoring System";
export const APP_SHORT_NAME = "SuperApps Monitor";

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMINISTRATOR: "Administrator",
  OPERATOR_UKE: "Operator UKE",
  EXECUTIVE: "Executive",
};

export const SCOPE_LABELS = {
  INTERNAL: "Internal",
  EKSTERNAL: "Eksternal",
} as const;

export const INTEGRATION_LABELS = {
  Q1: "Q1",
  Q2: "Q2",
  Q3: "Q3",
  NOT_READY: "Belum Siap",
} as const;

export const FUNCTION_API_STATUS_LABELS = {
  BELUM_TERSEDIA: "Belum Tersedia",
  ON_PROGRESS: "On Progress Develop",
  SUDAH_TERSEDIA: "Sudah Tersedia",
} as const;

export type FunctionApiStatusKey = keyof typeof FUNCTION_API_STATUS_LABELS;

export const MATURITY_LEVEL_LABELS: Record<number, string> = {
  0: "Belum dinilai",
  1: "Initial",
  2: "Developing",
  3: "Defined",
  4: "Managed",
  5: "Optimized",
};

/** Mapping indikator Tabel 5.1 Skala Tingkat Kematangan */
export const MATURITY_LEVEL_META: Record<
  1 | 2 | 3 | 4 | 5,
  { kategori: string; karakteristik: string }
> = {
  1: {
    kategori: "Initial",
    karakteristik:
      "Proses belum terdokumentasi, berjalan secara ad hoc dan bergantung pada individu.",
  },
  2: {
    kategori: "Developing",
    karakteristik:
      "Proses mulai diterapkan namun belum terdokumentasi secara lengkap dan belum konsisten di seluruh unit kerja.",
  },
  3: {
    kategori: "Defined",
    karakteristik:
      "Kebijakan, standar, dan prosedur telah tersedia serta mulai diterapkan secara konsisten.",
  },
  4: {
    kategori: "Managed",
    karakteristik:
      "Pelaksanaan telah terukur melalui indikator kinerja dan dilakukan monitoring secara berkala.",
  },
  5: {
    kategori: "Optimized",
    karakteristik:
      "Tata kelola telah terintegrasi, berkelanjutan, berbasis data, serta dilakukan perbaikan secara berkesinambungan.",
  },
};

export const DOMAIN_EVIDENCE_ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".png",
  ".jpg",
  ".jpeg",
  ".zip",
] as const;

export const DOMAIN_EVIDENCE_MAX_BYTES = 15 * 1024 * 1024; // 15 MB

export const DOMAIN_PROGRESS_STATUS_LABELS = {
  VERY_HIGH: "Prioritas Sangat Tinggi",
  NEEDS_STRENGTHENING: "Perlu Penguatan",
  ACHIEVED: "Tercapai",
} as const;

export const DOCUMENT_COMPLETENESS_LABELS = {
  NOT_AVAILABLE: "Belum Tersedia",
  DRAFT: "Draft",
  COMPLETE: "Lengkap",
  VERIFIED: "Terverifikasi",
} as const;

export const DOSSIER_TEAM_TYPE_LABELS = {
  STEERING: "Anggota Tim",
  EXECUTING: "Tim Pelaksana",
} as const;

export const DOSSIER_DOCUMENT_CATEGORIES = [
  "Latar Belakang",
  "SK Menteri",
  "Surat Penugasan",
  "Struktur Tim",
  "Paparan / Presentasi",
  "Dokumen Teknis",
  "Lainnya",
] as const;

/** 10 domain baseline SuperApps PASTI */
export const DOSSIER_DOMAIN_SEED = [
  { code: "REGULASI", name: "Regulasi", sortOrder: 1 },
  { code: "GOVERNANCE", name: "Governance", sortOrder: 2 },
  { code: "INTEGRASI_LAYANAN", name: "Integrasi Layanan", sortOrder: 3 },
  { code: "INTEROPERABILITAS", name: "Interoperabilitas", sortOrder: 4 },
  { code: "TATA_KELOLA_DATA", name: "Tata Kelola Data", sortOrder: 5 },
  { code: "PEMANFAATAN_DATA", name: "Pemanfaatan Data", sortOrder: 6 },
  { code: "SDM", name: "SDM", sortOrder: 7 },
  { code: "MONITORING", name: "Monitoring", sortOrder: 8 },
  { code: "ARSITEKTUR", name: "Arsitektur", sortOrder: 9 },
  { code: "MANAJEMEN_PERUBAHAN", name: "Manajemen Perubahan", sortOrder: 10 },
] as const;

/** Opsi tahun pekerjaan untuk filter & inline edit di semua menu. */
export const TAHUN_OPTIONS = [2025, 2026, 2027, 2028] as const;

export type TahunOption = (typeof TAHUN_OPTIONS)[number];

export function mergeTahunOptions(...extraYears: Array<number | null | undefined>): number[] {
  const years = new Set<number>([...TAHUN_OPTIONS]);
  for (const year of extraYears) {
    if (typeof year === "number" && !Number.isNaN(year)) years.add(year);
  }
  return Array.from(years).sort((a, b) => a - b);
}

export const SERVICE_FIELD_LABELS: Record<string, string> = {
  ukeId: "UKE I",
  tahunPekerjaan: "Tahun Pekerjaan",
  kelompokLayanan: "Kelompok Layanan",
  jenisLayanan: "Jenis Layanan",
  scope: "Tipe Layanan",
  tipeLayananInternal: "Tipe Layanan Internal",
  kesiapanIntegrasi: "Kesiapan Integrasi",
  sudahSuperApps: "Status Sudah di Superapps",
  namaAplikasi: "Nama Aplikasi Terkait",
  detailAplikasi: "Detail Aplikasi Terkait",
  fungsi: "Daftar Fungsi Terkait Layanan",
};

export const CHART_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
];
