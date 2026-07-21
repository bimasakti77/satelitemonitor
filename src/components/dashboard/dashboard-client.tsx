"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  Calendar,
  FileSpreadsheet,
  Filter,
  Layers,
  ListTree,
  Loader2,
  Printer,
  Search,
  ChevronLeft,
  ChevronRight,
  AppWindow,
} from "lucide-react";
import {
  ChartCard,
  ExecutiveUkeChart,
  IntegrationByUkeChart,
  IntegrationQuarterChart,
} from "@/components/dashboard/charts";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exportDashboardExcel, exportDashboardPdf } from "@/lib/dashboard-export";
import { INTEGRATION_LABELS, SCOPE_LABELS } from "@/lib/constants";
import type { DashboardServiceItem, ExecutiveDashboardData } from "@/lib/actions/dashboard";
import type { ServerHealthResult } from "@/lib/server-health";
import { ServerHealthPanel } from "@/components/dashboard/server-health-panel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ApplicationScopeFilter,
  countByApplicationScope,
  filterByApplicationScope,
  type ApplicationScopeFilterValue,
} from "@/components/master/application-scope-filter";
import { cn } from "@/lib/utils";

interface DashboardClientProps {
  data: ExecutiveDashboardData;
  selectedTahun: string;
  selectedScope: string;
  selectedSuperApps: string;
  serverHealth: ServerHealthResult[];
}

function NamaAplikasiDialog({
  open,
  onOpenChange,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: { name: string; isPublic: boolean }[];
}) {
  const [scopeFilter, setScopeFilter] =
    useState<ApplicationScopeFilterValue>("all");

  const counts = useMemo(() => countByApplicationScope(items), [items]);
  const filteredItems = useMemo(
    () => filterByApplicationScope(items, scopeFilter),
    [items, scopeFilter]
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setScopeFilter("all");
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Daftar Nama Aplikasi</DialogTitle>
          <DialogDescription>
            {filteredItems.length} dari {items.length} nama aplikasi — diurutkan A–Z
          </DialogDescription>
        </DialogHeader>

        <ApplicationScopeFilter
          value={scopeFilter}
          onValueChange={setScopeFilter}
          counts={counts}
          listClassName="h-auto flex-wrap"
        />

        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border">
          {filteredItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Tidak ada nama aplikasi
            </p>
          ) : (
            <ol className="divide-y divide-border">
              {filteredItems.map((item, index) => (
                <li
                  key={item.name}
                  className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm"
                >
                  <span>
                    <span className="mr-2 text-muted-foreground">{index + 1}.</span>
                    {item.name}
                  </span>
                  <Badge
                    variant={item.isPublic ? "success" : "secondary"}
                    className="shrink-0"
                  >
                    {item.isPublic ? "Publik" : "Internal"}
                  </Badge>
                </li>
              ))}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function jenisLayananDistinctKey(
  kelompokLayanan: string,
  jenisLayanan: string,
  scope: DashboardServiceItem["scope"]
): string {
  return `${kelompokLayanan.toLowerCase().trim()}|${jenisLayanan.toLowerCase().trim()}|${scope}`;
}

function IntegrationServicesDialog({
  selected,
  services,
  onOpenChange,
}: {
  selected: { key: string; label: string } | null;
  services: DashboardServiceItem[];
  onOpenChange: (open: boolean) => void;
}) {
  const modalItems = useMemo(() => {
    if (!selected) return [];

    return services
      .filter((service) => service.kesiapanIntegrasi === selected.key)
      .sort(
        (a, b) =>
          (a.ukeCode ?? "").localeCompare(b.ukeCode ?? "") ||
          a.kelompokLayanan.localeCompare(b.kelompokLayanan) ||
          a.jenisLayanan.localeCompare(b.jenisLayanan)
      );
  }, [services, selected]);

  return (
    <Dialog open={selected !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Kesiapan Integrasi — {selected?.label}</DialogTitle>
          <DialogDescription>
            {modalItems.length} layanan dengan target {selected?.label}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border">
          {modalItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Tidak ada layanan untuk kesiapan ini
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">No</TableHead>
                  <TableHead>UKE</TableHead>
                  <TableHead>Kelompok Layanan</TableHead>
                  <TableHead>Jenis Layanan</TableHead>
                  <TableHead>Tahun</TableHead>
                  <TableHead>Tipe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modalItems.map((service, index) => (
                  <TableRow key={service.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {service.ukeCode ?? "-"}
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate">
                      {service.kelompokLayanan}
                    </TableCell>
                    <TableCell className="max-w-[240px] font-medium">
                      <Link
                        href={`/services/${service.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {service.jenisLayanan}
                      </Link>
                    </TableCell>
                    <TableCell>{service.tahunPekerjaan}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{SCOPE_LABELS[service.scope]}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UkeJenisLayananCards({
  ukes,
  services,
}: {
  ukes: { code: string; name: string; count: number }[];
  services: DashboardServiceItem[];
}) {
  const [selectedUke, setSelectedUke] = useState<{ code: string; name: string } | null>(
    null
  );

  const modalItems = useMemo(() => {
    if (!selectedUke) return [];

    const map = new Map<string, DashboardServiceItem>();
    for (const service of services) {
      if (service.ukeCode !== selectedUke.code) continue;
      const key = jenisLayananDistinctKey(
        service.kelompokLayanan,
        service.jenisLayanan,
        service.scope
      );
      if (!map.has(key)) map.set(key, service);
    }

    return Array.from(map.values()).sort(
      (a, b) =>
        a.kelompokLayanan.localeCompare(b.kelompokLayanan) ||
        a.jenisLayanan.localeCompare(b.jenisLayanan)
    );
  }, [services, selectedUke]);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {ukes.map((uke) => (
          <Card
            key={uke.code}
            className="overflow-hidden transition-colors hover:border-primary/40 hover:bg-accent/30"
          >
            <button
              type="button"
              onClick={() => setSelectedUke({ code: uke.code, name: uke.name })}
              className={cn(
                "block w-full p-4 text-left",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs font-semibold text-primary">{uke.code}</p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground" title={uke.name}>
                    {uke.name}
                  </p>
                </div>
                <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight">{uke.count}</p>
              <p className="text-xs text-muted-foreground">
                kelompok + jenis + tipe unik
              </p>
              <p className="mt-2 text-[10px] text-primary/80">Klik untuk detail</p>
            </button>
          </Card>
        ))}
      </div>

      <Dialog
        open={selectedUke !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedUke(null);
        }}
      >
        <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col gap-4">
          <DialogHeader>
            <DialogTitle>
              {selectedUke?.code} — {selectedUke?.name}
            </DialogTitle>
            <DialogDescription>
              {modalItems.length} kombinasi kelompok + jenis + tipe layanan unik
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border">
            {modalItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Tidak ada layanan untuk UKE ini
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">No</TableHead>
                    <TableHead>Kelompok Layanan</TableHead>
                    <TableHead>Jenis Layanan</TableHead>
                    <TableHead>Tahun</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Kesiapan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modalItems.map((service, index) => (
                    <TableRow key={service.id}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="max-w-[140px] truncate">
                        {service.kelompokLayanan}
                      </TableCell>
                      <TableCell className="max-w-[240px] font-medium">
                        <Link
                          href={`/services/${service.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {service.jenisLayanan}
                        </Link>
                      </TableCell>
                      <TableCell>{service.tahunPekerjaan}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{SCOPE_LABELS[service.scope]}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {INTEGRATION_LABELS[service.kesiapanIntegrasi]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ServicesTableSection({
  services,
  filterLabel,
}: {
  services: DashboardServiceItem[];
  filterLabel: string;
}) {
  const PAGE_SIZE = 20;
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);

  const ukeTabs = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of services) {
      if (s.ukeCode) map.set(s.ukeCode, s.ukeName ?? s.ukeCode);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [services]);

  const filteredServices = useMemo(() => {
    let list = services;
    if (activeTab !== "all") {
      list = list.filter((s) => s.ukeCode === activeTab);
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) => {
      const haystack = [
        s.ukeCode,
        s.ukeName,
        s.kelompokLayanan,
        s.jenisLayanan,
        String(s.tahunPekerjaan),
        SCOPE_LABELS[s.scope],
        s.sudahSuperApps ? "sudah" : "belum",
        INTEGRATION_LABELS[s.kesiapanIntegrasi],
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [services, activeTab, search]);

  const countByUke = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of services) {
      if (!s.ukeCode) continue;
      counts.set(s.ukeCode, (counts.get(s.ukeCode) ?? 0) + 1);
    }
    return counts;
  }, [services]);

  const totalPages = Math.max(1, Math.ceil(filteredServices.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [search, activeTab, services.length]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedServices = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredServices.slice(start, start + PAGE_SIZE);
  }, [filteredServices, page]);

  const rangeStart =
    filteredServices.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filteredServices.length);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 9) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
    return Array.from(pages)
      .filter((p) => p >= 1 && p <= totalPages)
      .sort((a, b) => a - b);
  }, [page, totalPages]);

  if (services.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Tidak ada layanan yang sesuai filter
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Cari UKE, kelompok, jenis layanan, tahun..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          setPage(1);
        }}
      >
        <TabsList className="w-full justify-start">
          <TabsTrigger value="all">Semua ({services.length})</TabsTrigger>
          {ukeTabs.map(([code, name]) => (
            <TabsTrigger key={code} value={code} title={name}>
              {code} ({countByUke.get(code) ?? 0})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        {filteredServices.length > 0
          ? `Menampilkan ${rangeStart}–${rangeEnd} dari ${filteredServices.length} layanan (${PAGE_SIZE} per halaman) — ${filterLabel}`
          : `0 layanan — ${filterLabel}`}
        {activeTab !== "all" ? ` · UKE ${activeTab}` : ""}
        {search.trim() ? ` · pencarian "${search.trim()}"` : ""}
      </p>

      {filteredServices.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Tidak ada layanan yang cocok dengan filter tab atau pencarian
        </p>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">No</TableHead>
                <TableHead>UKE I</TableHead>
                <TableHead>Kelompok Layanan</TableHead>
                <TableHead>Jenis Layanan</TableHead>
                <TableHead>Tahun</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>SuperApps</TableHead>
                <TableHead>Kesiapan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedServices.map((s, i) => (
                <TableRow key={s.id}>
                  <TableCell className="text-muted-foreground">
                    {rangeStart + i}
                  </TableCell>
                  <TableCell>{s.ukeCode ?? "-"}</TableCell>
                  <TableCell className="max-w-[140px] truncate">{s.kelompokLayanan}</TableCell>
                  <TableCell className="font-medium max-w-[260px]">
                    <Link
                      href={`/services/${s.id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {s.jenisLayanan}
                    </Link>
                  </TableCell>
                  <TableCell>{s.tahunPekerjaan}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{SCOPE_LABELS[s.scope]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.sudahSuperApps ? "success" : "warning"}>
                      {s.sudahSuperApps ? "Sudah" : "Belum"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {INTEGRATION_LABELS[s.kesiapanIntegrasi]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {filteredServices.length > 0 && totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Sebelumnya
            </Button>
            <div className="flex flex-wrap gap-1">
              {pageNumbers.map((pageNum, idx) => {
                const prev = pageNumbers[idx - 1];
                const showEllipsis = prev !== undefined && pageNum - prev > 1;
                return (
                  <span key={pageNum} className="flex items-center gap-1">
                    {showEllipsis && (
                      <span className="px-1 text-muted-foreground">…</span>
                    )}
                    <Button
                      type="button"
                      variant={pageNum === page ? "default" : "outline"}
                      size="sm"
                      className="min-w-9 px-2"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  </span>
                );
              })}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Berikutnya
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardClient({
  data,
  selectedTahun,
  selectedScope,
  selectedSuperApps,
  serverHealth,
}: DashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isFilterPending, startFilterTransition] = useTransition();
  const [namaAplikasiDialogOpen, setNamaAplikasiDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<{
    key: string;
    label: string;
  } | null>(null);

  const pushWithParams = (params: URLSearchParams) => {
    startFilterTransition(() => {
      router.push(`/dashboard?${params.toString()}`);
    });
  };

  const updateTahun = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("tahun");
    else params.set("tahun", value);
    pushWithParams(params);
  };

  const updateScope = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("scope");
    else params.set("scope", value);
    pushWithParams(params);
  };

  const updateSuperApps = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("sudahSuperApps");
    else params.set("sudahSuperApps", value);
    pushWithParams(params);
  };

  const tahunLabel =
    selectedTahun === "all" ? "Semua Tahun" : `Tahun ${selectedTahun}`;

  const scopeLabel =
    selectedScope === "INTERNAL" || selectedScope === "EKSTERNAL"
      ? SCOPE_LABELS[selectedScope]
      : "Semua Tipe";

  const superAppsLabel =
    selectedSuperApps === "true"
      ? "Sudah SuperApps"
      : selectedSuperApps === "false"
        ? "Belum SuperApps"
        : "Semua Status SuperApps";

  const filterLabel = [superAppsLabel, tahunLabel, scopeLabel].join(" · ");
  const hasActiveFilter =
    selectedSuperApps !== "all" ||
    selectedTahun !== "all" ||
    selectedScope !== "all";

  const resetFilters = () => {
    pushWithParams(new URLSearchParams());
  };

  const handleExportExcel = () => {
    try {
      exportDashboardExcel(data, filterLabel);
      toast.success("Excel berhasil diunduh");
    } catch {
      toast.error("Gagal mengekspor Excel");
    }
  };

  const handleExportPdf = () => {
    try {
      exportDashboardPdf(data, filterLabel);
      toast.success("PDF berhasil diunduh");
    } catch {
      toast.error("Gagal mengekspor PDF");
    }
  };

  const ukeChartHeight = Math.max(280, data.chartByUke.length * 36 + 48);
  const integrationByUkeHeight = Math.max(
    280,
    data.chartIntegrationByUke.length * 36 + 48
  );

  return (
    <div className="space-y-8">
      <ServerHealthPanel initialHealth={serverHealth} />

      <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.04] via-background to-background shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Filter className="h-4 w-4" />
                </span>
                Filter Dashboard
              </CardTitle>
              <CardDescription>
                Atur tampilan chart dan daftar layanan berdasarkan status SuperApps,
                tahun pekerjaan, dan tipe layanan.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasActiveFilter && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  disabled={isFilterPending}
                >
                  Reset
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={isFilterPending}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                disabled={isFilterPending}
              >
                <Printer className="mr-2 h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/80 bg-background/80 px-3 py-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Aktif
            </span>
            <Badge variant={selectedSuperApps === "all" ? "secondary" : "default"}>
              {superAppsLabel}
            </Badge>
            <Badge variant={selectedTahun === "all" ? "secondary" : "default"}>
              {tahunLabel}
            </Badge>
            <Badge variant={selectedScope === "all" ? "secondary" : "default"}>
              {scopeLabel}
            </Badge>
            {isFilterPending && (
              <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Memuat...
              </span>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 rounded-xl border border-border bg-background p-3">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Status SuperApps
              </Label>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
                {(
                  [
                    { value: "all", label: "Semua" },
                    { value: "true", label: "Sudah" },
                    { value: "false", label: "Belum" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={isFilterPending}
                    onClick={() => updateSuperApps(option.value)}
                    className={cn(
                      "rounded-md px-2 py-2 text-sm font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      "disabled:pointer-events-none disabled:opacity-50",
                      selectedSuperApps === option.value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-border bg-background p-3">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tahun Pekerjaan
              </Label>
              <Select
                value={selectedTahun}
                onValueChange={updateTahun}
                disabled={isFilterPending}
              >
                <SelectTrigger className="w-full">
                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Pilih tahun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tahun</SelectItem>
                  {data.years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 rounded-xl border border-border bg-background p-3">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tipe Layanan
              </Label>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
                {(
                  [
                    { value: "all", label: "Semua" },
                    { value: "INTERNAL", label: "Internal" },
                    { value: "EKSTERNAL", label: "Eksternal" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={isFilterPending}
                    onClick={() => updateScope(option.value)}
                    className={cn(
                      "rounded-md px-2 py-2 text-sm font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      "disabled:pointer-events-none disabled:opacity-50",
                      selectedScope === option.value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="relative">
        {isFilterPending && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-background/70 backdrop-blur-[1px]"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-9 w-9 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Memuat data dashboard...</p>
            </div>
          </div>
        )}

        <div
          className={`space-y-8 transition-opacity ${isFilterPending ? "pointer-events-none opacity-50" : ""}`}
        >

      {/* 1. Charts */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          1. Visualisasi Data
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Layanan per UKE I"
            description="Jumlah layanan sesuai filter aktif per unit kerja"
            contentClassName="p-6 pt-0"
          >
            <div style={{ height: ukeChartHeight }}>
              {data.chartByUke.length > 0 ? (
                <ExecutiveUkeChart data={data.chartByUke} />
              ) : (
                <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Tidak ada data
                </p>
              )}
            </div>
          </ChartCard>
          <ChartCard
            title="Kesiapan Integrasi"
            description="Distribusi Q1, Q2, Q3, dan Belum Siap — klik batang untuk lihat daftar layanan"
          >
            {data.summary.totalServices > 0 ? (
              <IntegrationQuarterChart
                data={data.chartByIntegration}
                onBarClick={(entry) =>
                  setSelectedIntegration({ key: entry.key, label: entry.label })
                }
              />
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Tidak ada data
              </p>
            )}
          </ChartCard>
        </div>
        <ChartCard
          title="Kesiapan Integrasi per UKE I"
          description="Persentase jenis layanan (kelompok + jenis + tipe unik) per target Q1, Q2, dan Q3"
          contentClassName="p-6 pt-0"
        >
          <div style={{ height: integrationByUkeHeight }}>
            {data.chartIntegrationByUke.length > 0 ? (
              <IntegrationByUkeChart data={data.chartIntegrationByUke} />
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Tidak ada data
              </p>
            )}
          </div>
        </ChartCard>
      </section>

      <IntegrationServicesDialog
        selected={selectedIntegration}
        services={data.services}
        onOpenChange={(open) => {
          if (!open) setSelectedIntegration(null);
        }}
      />

      {/* 2. Summary cards */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          2. Ringkasan Angka
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            title="Jumlah Kelompok Layanan"
            value={data.summary.totalKelompok}
            description="Kelompok unik"
            icon={Layers}
          />
          <KpiCard
            title="Jumlah Jenis Layanan"
            value={data.summary.totalJenisLayanan}
            description="Kombinasi kelompok + jenis + tipe unik"
            icon={ListTree}
          />
          <KpiCard
            title="Jumlah Nama Aplikasi"
            value={data.summary.totalNamaAplikasi}
            description="Nama aplikasi unik"
            icon={AppWindow}
            onClick={() => setNamaAplikasiDialogOpen(true)}
            note="Jumlah dan Nama Aplikasi diambil dari list layanan yang akan digabungkan ke Superapps, sehingga bukan keseluruhan yang dimiliki oleh Kementerian"
          >
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground">
                Layanan Publik:{" "}
                <span className="font-semibold text-foreground">
                  {data.summary.totalAplikasiPublik}
                </span>
              </span>
              <span className="text-muted-foreground">
                Internal:{" "}
                <span className="font-semibold text-foreground">
                  {data.summary.totalAplikasiInternal}
                </span>
              </span>
            </div>
          </KpiCard>
        </div>

        <NamaAplikasiDialog
          open={namaAplikasiDialogOpen}
          onOpenChange={setNamaAplikasiDialogOpen}
          items={data.namaAplikasiList}
        />

        {data.jenisLayananByUke.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">
              Jenis Layanan per UKE I
            </h3>
            <p className="text-xs text-muted-foreground">
              Jumlah kombinasi kelompok + jenis + tipe layanan unik di setiap unit kerja eselon I
            </p>
            <UkeJenisLayananCards ukes={data.jenisLayananByUke} services={data.services} />
          </div>
        )}
      </section>

      {/* 3. Table */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          3. Daftar Jenis Layanan
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Seluruh Jenis Layanan</CardTitle>
            <CardDescription>
              {data.summary.totalServices} layanan — {filterLabel}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ServicesTableSection services={data.services} filterLabel={filterLabel} />
          </CardContent>
        </Card>
      </section>
        </div>
      </div>
    </div>
  );
}
