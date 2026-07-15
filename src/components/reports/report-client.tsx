"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { CalendarRange, Download, Printer } from "lucide-react";
import { formatNumber, formatPercent } from "@/lib/utils";
import { APP_NAME, INTEGRATION_LABELS } from "@/lib/constants";
import type { ProgressByYearItem } from "@/lib/actions/dashboard";

interface ReportData {
  kpis: {
    totalUke: number;
    totalServiceGroups: number;
    totalServices: number;
    sudahSuperApps: number;
    belumSuperApps: number;
    progressPercent: number;
  };
  progressByUke: {
    code: string;
    name: string;
    total: number;
    done: number;
    percent: number;
  }[];
  progressByYear: ProgressByYearItem[];
  recentChanges: {
    id: string;
    action: string;
    fieldName: string | null;
    createdAt: Date;
    user: { name: string };
    service: { jenisLayanan: string; uke: { code: string } | null } | null;
  }[];
  topApps: { name: string; count: number }[];
}

export function ReportClient({ data }: { data: ReportData }) {
  const reportRef = useRef<HTMLDivElement>(null);

  const handlePrint = async () => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.text(APP_NAME, pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text("Laporan Eksekutif", pageWidth / 2, 28, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString("id-ID")}`, pageWidth / 2, 35, {
      align: "center",
    });

    let y = 45;
    doc.setFontSize(14);
    doc.text("Ringkasan Keseluruhan", 14, y);
    y += 8;
    doc.setFontSize(10);

    const summary = [
      ["Total UKE", formatNumber(data.kpis.totalUke)],
      ["Kelompok Layanan", formatNumber(data.kpis.totalServiceGroups)],
      ["Total Layanan", formatNumber(data.kpis.totalServices)],
      ["Sudah SuperApps", formatNumber(data.kpis.sudahSuperApps)],
      ["Belum SuperApps", formatNumber(data.kpis.belumSuperApps)],
      ["Progress", formatPercent(data.kpis.progressPercent)],
    ];

    autoTable(doc, {
      startY: y,
      head: [["Metrik", "Nilai"]],
      body: summary,
      theme: "striped",
      headStyles: { fillColor: [99, 102, 241] },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text("Kondisi Pembangunan per Tahun", 14, y);

    autoTable(doc, {
      startY: y + 5,
      head: [
        [
          "Tahun",
          "Total",
          "Sudah",
          "Belum",
          "Progress",
          "Q1",
          "Q2",
          "Q3",
          "Belum Siap",
          "Internal",
          "Eksternal",
        ],
      ],
      body: data.progressByYear.map((row) => [
        row.year,
        String(row.total),
        String(row.sudahSuperApps),
        String(row.belumSuperApps),
        formatPercent(row.progressPercent),
        String(row.Q1),
        String(row.Q2),
        String(row.Q3),
        String(row.NOT_READY),
        String(row.INTERNAL),
        String(row.EKSTERNAL),
      ]),
      theme: "striped",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [99, 102, 241], fontSize: 7 },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.text("Progress by UKE", 14, y);

    autoTable(doc, {
      startY: y + 5,
      head: [["UKE", "Nama", "Total", "Selesai", "Progress"]],
      body: data.progressByUke.map((u) => [
        u.code,
        u.name,
        String(u.total),
        String(u.done),
        formatPercent(u.percent),
      ]),
      theme: "striped",
      headStyles: { fillColor: [99, 102, 241] },
    });

    doc.save(`superapps-report-${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Eksekutif"
        description="Ringkasan keseluruhan dan kondisi pembangunan per tahun pekerjaan"
      >
        <div className="flex gap-2">
          <Button onClick={handlePrint}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </PageHeader>

      <div ref={reportRef} className="space-y-6 print:space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Keseluruhan</CardTitle>
            <CardDescription>
              Kondisi agregat seluruh layanan di semua tahun pekerjaan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: "Total UKE", value: data.kpis.totalUke },
                { label: "Kelompok Layanan", value: data.kpis.totalServiceGroups },
                { label: "Total Layanan", value: data.kpis.totalServices },
                { label: "Sudah SuperApps", value: data.kpis.sudahSuperApps },
                { label: "Belum SuperApps", value: data.kpis.belumSuperApps },
                { label: "Progress", value: formatPercent(data.kpis.progressPercent) },
              ].map((k) => (
                <div key={k.label} className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="mt-1 text-xl font-bold">
                    {typeof k.value === "number" ? formatNumber(k.value) : k.value}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarRange className="h-4 w-4 text-primary" />
              Kondisi Pembangunan per Tahun
            </CardTitle>
            <CardDescription>
              Breakdown layanan, progress SuperApps, kesiapan integrasi, dan tipe layanan
              per tahun pekerjaan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {data.progressByYear.map((year) => (
                <div
                  key={year.year}
                  className="rounded-xl border border-border bg-muted/20 p-4 space-y-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Tahun Pekerjaan
                      </p>
                      <p className="text-2xl font-bold tracking-tight">{year.year}</p>
                    </div>
                    <Badge variant={year.total > 0 ? "default" : "secondary"}>
                      {year.total > 0 ? `${year.total} layanan` : "Belum ada data"}
                    </Badge>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress SuperApps</span>
                      <span className="font-medium">
                        {formatPercent(year.progressPercent)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${year.progressPercent}%` }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                      <span>Sudah: {formatNumber(year.sudahSuperApps)}</span>
                      <span>Belum: {formatNumber(year.belumSuperApps)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Kesiapan Integrasi
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg border border-border bg-background px-2.5 py-2">
                        <p className="text-muted-foreground">{INTEGRATION_LABELS.Q1}</p>
                        <p className="font-semibold">{formatNumber(year.Q1)}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-background px-2.5 py-2">
                        <p className="text-muted-foreground">{INTEGRATION_LABELS.Q2}</p>
                        <p className="font-semibold">{formatNumber(year.Q2)}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-background px-2.5 py-2">
                        <p className="text-muted-foreground">{INTEGRATION_LABELS.Q3}</p>
                        <p className="font-semibold">{formatNumber(year.Q3)}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-background px-2.5 py-2">
                        <p className="text-muted-foreground">{INTEGRATION_LABELS.NOT_READY}</p>
                        <p className="font-semibold">{formatNumber(year.NOT_READY)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 border-t border-border/70 pt-3 text-xs text-muted-foreground">
                    <span>
                      Internal:{" "}
                      <span className="font-semibold text-foreground">
                        {formatNumber(year.INTERNAL)}
                      </span>
                    </span>
                    <span>
                      Eksternal:{" "}
                      <span className="font-semibold text-foreground">
                        {formatNumber(year.EKSTERNAL)}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progress by UKE</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.progressByUke.map((u) => (
                  <div key={u.code}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>
                        {u.code} - {u.name}
                      </span>
                      <span className="text-muted-foreground">
                        {u.done}/{u.total} ({formatPercent(u.percent)})
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${u.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Existing Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.topApps.map((app, i) => (
                  <div key={app.name} className="flex justify-between text-sm">
                    <span>
                      {i + 1}. {app.name}
                    </span>
                    <span className="text-muted-foreground">{app.count} layanan</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recentChanges.map((c) => (
                <div
                  key={c.id}
                  className="flex justify-between border-b border-border/50 pb-2 text-sm"
                >
                  <div>
                    <span className="font-medium">{c.action}</span>
                    {c.fieldName && (
                      <span className="text-muted-foreground"> • {c.fieldName}</span>
                    )}
                    {c.service && (
                      <span className="text-muted-foreground">
                        {" "}
                        — {c.service.uke?.code ?? "-"} / {c.service.jenisLayanan}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {c.user.name} • {new Date(c.createdAt).toLocaleDateString("id-ID")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
