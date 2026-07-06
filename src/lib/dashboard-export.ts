"use client";

import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { APP_NAME } from "@/lib/constants";
import { INTEGRATION_LABELS, SCOPE_LABELS } from "@/lib/constants";
import type { ExecutiveDashboardData } from "@/lib/actions/dashboard";

function formatExportDate(): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date());
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportDashboardExcel(
  data: ExecutiveDashboardData,
  filterLabel: string
) {
  const { summary } = data;

  const ringkasan = [
    ["Metrik", "Nilai"],
    ["Filter", filterLabel],
    ["Jumlah Kelompok Layanan", summary.totalKelompok],
    ["Jumlah Jenis Layanan", summary.totalJenisLayanan],
  ];

  const perUke = [
    ["Kode UKE", "Nama UKE", "Jumlah Layanan"],
    ...data.chartByUke.map((u) => [u.code, u.name, u.count]),
  ];

  const perIntegrasi = [
    ["Kesiapan Integrasi", "Jumlah Layanan"],
    ...data.chartByIntegration.map((g) => [g.label, g.count]),
  ];

  const perIntegrasiUke = [
    [
      "Kode UKE",
      "Nama UKE",
      "Total Jenis",
      "Q1 (jumlah)",
      "Q1 (%)",
      "Q2 (jumlah)",
      "Q2 (%)",
      "Q3 (jumlah)",
      "Q3 (%)",
    ],
    ...data.chartIntegrationByUke.map((u) => [
      u.code,
      u.name,
      u.totalJenis,
      u.Q1,
      u.Q1Pct,
      u.Q2,
      u.Q2Pct,
      u.Q3,
      u.Q3Pct,
    ]),
  ];

  const detail = [
    ["No", "UKE", "Kelompok Layanan", "Jenis Layanan", "Tahun", "Tipe", "Kesiapan"],
    ...data.services.map((s, i) => [
      i + 1,
      s.ukeCode ?? "-",
      s.kelompokLayanan,
      s.jenisLayanan,
      s.tahunPekerjaan,
      SCOPE_LABELS[s.scope],
      INTEGRATION_LABELS[s.kesiapanIntegrasi],
    ]),
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(ringkasan), "Ringkasan");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(perUke), "Per UKE");
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(perIntegrasi),
    "Per Kesiapan"
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(perIntegrasiUke),
    "Kesiapan per UKE"
  );
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(detail), "Daftar Layanan");

  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  const slug = filterLabel.replace(/\s+/g, "-").toLowerCase();
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `dashboard-${slug}-${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

export function exportDashboardPdf(data: ExecutiveDashboardData, filterLabel: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const { summary } = data;
  const generated = formatExportDate();

  doc.setFontSize(13);
  doc.text(APP_NAME, 14, 14);
  doc.setFontSize(10);
  doc.text("Dashboard — Layanan Belum SuperApps", 14, 20);
  doc.setFontSize(8);
  doc.text(`${filterLabel}  |  Dicetak: ${generated}`, 14, 26);

  autoTable(doc, {
    startY: 30,
    head: [["Ringkasan", "Nilai"]],
    body: [
      ["Jumlah Kelompok Layanan", String(summary.totalKelompok)],
      ["Jumlah Jenis Layanan", String(summary.totalJenisLayanan)],
    ],
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [99, 102, 241] },
    margin: { left: 14, right: 14 },
  });

  const afterSummary = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
    ?.finalY ?? 30;

  autoTable(doc, {
    startY: afterSummary + 4,
    head: [["UKE", "Nama Unit Kerja", "Jumlah"]],
    body: data.chartByUke.map((u) => [u.code, u.name, String(u.count)]),
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.2 },
    headStyles: { fillColor: [99, 102, 241] },
    margin: { left: 14, right: 14 },
  });

  const afterUke = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
    ?.finalY ?? afterSummary + 4;

  autoTable(doc, {
    startY: afterUke + 4,
    head: [["Kesiapan Integrasi", "Jumlah"]],
    body: data.chartByIntegration.map((g) => [g.label, String(g.count)]),
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [99, 102, 241] },
    margin: { left: 14, right: 14 },
    pageBreak: "avoid",
  });

  const slug = filterLabel.replace(/\s+/g, "-").toLowerCase();
  doc.save(`dashboard-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
