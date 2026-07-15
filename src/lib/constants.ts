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
