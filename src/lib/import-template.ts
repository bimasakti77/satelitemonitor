export const IMPORT_TEMPLATE_HEADERS = [
  "UKE I",
  "Kelompok Layanan",
  "Jenis Layanan",
  "Tahun Pekerjaan",
  "Tipe Layanan (Internal / Eksternal)",
  "Tipe Layanan Internal",
  "Sudah di Superapps",
  "Kesiapan Integrasi",
  "Nama Aplikasi Terkait",
  "Detail Aplikasi Terkait",
] as const;

export const IMPORT_TEMPLATE_SAMPLE_ROW: Record<
  (typeof IMPORT_TEMPLATE_HEADERS)[number],
  string | number
> = {
  "UKE I": "ITJEN",
  "Tahun Pekerjaan": 2027,
  "Kelompok Layanan": "Layanan Pengawasan",
  "Jenis Layanan":
    "Input dan upload Tindak lanjut temuan hasil pengawasan Internal oleh admin satker",
  "Tipe Layanan (Internal / Eksternal)": "Internal",
  "Tipe Layanan Internal": "Layanan Internal",
  "Sudah di Superapps": "Belum",
  "Kesiapan Integrasi": "Q3",
  "Nama Aplikasi Terkait": "SIMWAS (Sistem Informasi Manajemen Pengawasan)",
  "Detail Aplikasi Terkait":
    "Aplikasi Management Hasil Pengawasan Internal dan Eksternal yang dikelola oleh Inspektorat Jenderal",
};

/** Normalized header → field key (urutan kolom Excel tidak mempengaruhi import) */
export const IMPORT_COLUMN_MAP: Record<string, string> = {
  "uke i": "ukeCode",
  uke: "ukeCode",
  "kode uke": "ukeCode",
  "unit kerja": "unitKerja",
  "tahun pekerjaan": "tahunPekerjaan",
  tahun: "tahunPekerjaan",
  "kelompok layanan": "kelompokLayanan",
  "jenis layanan": "jenisLayanan",
  "jenis layanan / fitur aplikasi": "jenisLayanan",
  "nama layanan": "jenisLayanan",
  "tipe layanan (internal / eksternal)": "scope",
  "internal/eksternal": "scope",
  scope: "scope",
  "tipe layanan internal": "tipeLayananInternal",
  "sudah di superapps": "sudahSuperApps",
  "sudah superapps": "sudahSuperApps",
  "kesiapan integrasi": "kesiapanIntegrasi",
  "kesiapan integrasi (q1 / q2 /q3)": "kesiapanIntegrasi",
  "nama aplikasi terkait": "namaAplikasi",
  "nama aplikasi": "namaAplikasi",
  "detail aplikasi terkait": "detailAplikasi",
  "detail aplikasi": "detailAplikasi",
};

export const IMPORT_TEMPLATE_FILENAME = "template-import-layanan.xlsx";

export function buildImportTemplateRows() {
  return [
    [...IMPORT_TEMPLATE_HEADERS],
    IMPORT_TEMPLATE_HEADERS.map((header) => IMPORT_TEMPLATE_SAMPLE_ROW[header]),
  ];
}

export function normalizeImportHeader(header: string): string {
  return header.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}
