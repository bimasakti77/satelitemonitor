"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Search, ChevronLeft, ChevronRight, Eye, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { ServiceForm } from "@/components/services/service-form";
import {
  deleteService,
  deleteAllServices,
  updateServiceTahunPekerjaan,
} from "@/lib/actions/services";
import { INTEGRATION_LABELS, SCOPE_LABELS } from "@/lib/constants";
import type { ServiceScope, IntegrationReadiness } from "@prisma/client";

const TAHUN_OPTIONS = [2026, 2027, 2028] as const;

function getTahunSelectOptions(current: number) {
  const years = new Set<number>([...TAHUN_OPTIONS, current]);
  return Array.from(years).sort((a, b) => a - b);
}

interface ServiceItem {
  id: string;
  kelompokLayanan: string;
  jenisLayanan: string;
  tahunPekerjaan: number;
  scope: ServiceScope;
  tipeLayananInternal: string | null;
  sudahSuperApps: boolean;
  kesiapanIntegrasi: IntegrationReadiness;
  uke: { code: string; name: string } | null;
}

interface ServicesTableProps {
  data: {
    items: ServiceItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  ukes: { id: string; label: string }[];
  kelompokOptions: string[];
  canWrite: boolean;
  defaultUkeId?: string;
  hideUkeFilter?: boolean;
}

function parseKesiapanFilter(value: string | null): string | undefined {
  if (!value || value === "all") return undefined;
  if (value === "blank") return "NOT_READY";
  return value;
}

export function ServicesTable({
  data,
  ukes,
  kelompokOptions,
  canWrite,
  defaultUkeId,
  hideUkeFilter = false,
}: ServicesTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteAllProgress, setDeleteAllProgress] = useState(0);
  const [updatingTahunId, setUpdatingTahunId] = useState<string | null>(null);
  const [tahunOverrides, setTahunOverrides] = useState<Record<string, number>>({});

  const superAppsFilter = searchParams.get("sudahSuperApps") ?? "all";
  const scopeFilter = searchParams.get("scope") ?? "all";
  const tahunFilter = searchParams.get("tahunPekerjaan") ?? "all";
  const kesiapanFilter = searchParams.get("kesiapanIntegrasi") ?? "all";

  const tahunFilterOptions = (() => {
    const years = new Set<number>([...TAHUN_OPTIONS]);
    if (tahunFilter !== "all" && !Number.isNaN(Number(tahunFilter))) {
      years.add(Number(tahunFilter));
    }
    return Array.from(years).sort((a, b) => a - b);
  })();

  useEffect(() => {
    if (!deletingAll) {
      setDeleteAllProgress(0);
      return;
    }

    setDeleteAllProgress(10);
    const interval = setInterval(() => {
      setDeleteAllProgress((current) => {
        if (current >= 90) return current;
        return current + Math.random() * 12;
      });
    }, 350);

    return () => clearInterval(interval);
  }, [deletingAll]);

  const getCurrentFilters = () => {
    const params = Object.fromEntries(searchParams.entries());
    return {
      search: params.search,
      ukeId: params.ukeId,
      kelompokLayanan: params.kelompokLayanan,
      tahunPekerjaan: params.tahunPekerjaan ? Number(params.tahunPekerjaan) : undefined,
      scope: params.scope,
      sudahSuperApps:
        params.sudahSuperApps === "true"
          ? true
          : params.sudahSuperApps === "false"
            ? false
            : undefined,
      kesiapanIntegrasi: parseKesiapanFilter(params.kesiapanIntegrasi ?? null),
    };
  };

  const hasActiveFilters = () => {
    const params = searchParams;
    return Boolean(
      params.get("search") ||
        params.get("ukeId") ||
        params.get("kelompokLayanan") ||
        params.get("tahunPekerjaan") ||
        params.get("scope") ||
        params.get("sudahSuperApps") ||
        params.get("kesiapanIntegrasi")
    );
  };

  const updateParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    if (key !== "page") params.set("page", "1");
    router.push(`/services?${params.toString()}`);
  };

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`/services?${params.toString()}`);
  };

  const handleTahunChange = async (serviceId: string, tahun: number, previous: number) => {
    if (tahun === previous) return;

    setUpdatingTahunId(serviceId);
    setTahunOverrides((prev) => ({ ...prev, [serviceId]: tahun }));

    try {
      const result = await updateServiceTahunPekerjaan(serviceId, tahun);
      if (result.success) {
        toast.success(`Tahun pekerjaan diperbarui ke ${tahun}`);
        router.refresh();
      } else {
        setTahunOverrides((prev) => {
          const next = { ...prev };
          delete next[serviceId];
          return next;
        });
        toast.error(result.error ?? "Gagal memperbarui tahun");
      }
    } catch {
      setTahunOverrides((prev) => {
        const next = { ...prev };
        delete next[serviceId];
        return next;
      });
      toast.error("Gagal memperbarui tahun pekerjaan");
    } finally {
      setUpdatingTahunId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (data.total === 0 || deletingAll) return;

    const scopeLabel = hasActiveFilters()
      ? `${data.total} layanan sesuai filter saat ini`
      : `semua ${data.total} layanan`;
    const message =
      data.total === 1
        ? "Yakin ingin menghapus 1 layanan? Tindakan ini tidak dapat dibatalkan."
        : `Yakin ingin menghapus ${scopeLabel}? Tindakan ini tidak dapat dibatalkan.`;

    if (!confirm(message)) return;

    setDeletingAll(true);
    setDeleteAllProgress(5);

    try {
      const result = await deleteAllServices(getCurrentFilters());
      setDeleteAllProgress(100);

      if (result.success) {
        const count = result.data?.count ?? 0;
        toast.success(
          count === 1
            ? "Berhasil menghapus 1 layanan"
            : `Berhasil menghapus ${count} layanan`
        );
        router.push("/services");
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal menghapus layanan");
      }
    } catch {
      toast.error(
        "Penghapusan gagal atau terputus (timeout server). Cek data di database, lalu coba lagi atau pecah per filter."
      );
    } finally {
      window.setTimeout(() => {
        setDeletingAll(false);
        setDeleteAllProgress(0);
      }, 400);
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm("Yakin ingin menghapus layanan ini?")) return;
    startTransition(async () => {
      const result = await deleteService(id);
      if (result.success) {
        toast.success("Layanan dihapus");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      {deletingAll && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-busy="true"
          aria-labelledby="delete-all-title"
          aria-describedby="delete-all-desc"
        >
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <Loader2 className="mb-4 h-10 w-10 animate-spin text-destructive" />
              <h2 id="delete-all-title" className="text-lg font-semibold">
                Menghapus layanan...
              </h2>
              <p id="delete-all-desc" className="mt-2 text-sm text-muted-foreground">
                {hasActiveFilters()
                  ? `Sedang menghapus ${data.total} layanan sesuai filter. Mohon tunggu dan jangan tutup halaman.`
                  : `Sedang menghapus ${data.total} layanan. Mohon tunggu dan jangan tutup halaman.`}
              </p>
            </div>
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round(deleteAllProgress)}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-destructive transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(deleteAllProgress, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-1 flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari layanan..."
                className="pl-9"
                defaultValue={searchParams.get("search") ?? ""}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    updateParams("search", (e.target as HTMLInputElement).value);
                  }
                }}
              />
            </div>
            {!hideUkeFilter && (
              <Select
                value={searchParams.get("ukeId") ?? "all"}
                onValueChange={(v) => updateParams("ukeId", v === "all" ? "" : v)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="UKE" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua UKE</SelectItem>
                  {ukes.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap">
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <span className="text-sm font-medium text-foreground">Tahun:</span>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="tahun-filter"
                    checked={tahunFilter === "all"}
                    onChange={() => updateParams("tahunPekerjaan", "all")}
                    className="h-4 w-4 accent-primary"
                  />
                  Semua
                </label>
                {tahunFilterOptions.map((year) => (
                  <label key={year} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="tahun-filter"
                      checked={tahunFilter === String(year)}
                      onChange={() => updateParams("tahunPekerjaan", String(year))}
                      className="h-4 w-4 accent-primary"
                    />
                    {year}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <span className="text-sm font-medium text-foreground">Tipe:</span>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="scope-filter"
                    checked={scopeFilter === "all"}
                    onChange={() => updateParams("scope", "all")}
                    className="h-4 w-4 accent-primary"
                  />
                  Semua
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="scope-filter"
                    checked={scopeFilter === "INTERNAL"}
                    onChange={() => updateParams("scope", "INTERNAL")}
                    className="h-4 w-4 accent-primary"
                  />
                  Internal
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="scope-filter"
                    checked={scopeFilter === "EKSTERNAL"}
                    onChange={() => updateParams("scope", "EKSTERNAL")}
                    className="h-4 w-4 accent-primary"
                  />
                  Eksternal
                </label>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <span className="text-sm font-medium text-foreground">SuperApps:</span>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="superapps-filter"
                    checked={superAppsFilter === "all"}
                    onChange={() => updateParams("sudahSuperApps", "all")}
                    className="h-4 w-4 accent-primary"
                  />
                  Semua
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="superapps-filter"
                    checked={superAppsFilter === "true"}
                    onChange={() => updateParams("sudahSuperApps", "true")}
                    className="h-4 w-4 accent-primary"
                  />
                  Sudah
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="superapps-filter"
                    checked={superAppsFilter === "false"}
                    onChange={() => updateParams("sudahSuperApps", "false")}
                    className="h-4 w-4 accent-primary"
                  />
                  Belum
                </label>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <span className="text-sm font-medium text-foreground">Kesiapan:</span>
              <Select
                value={kesiapanFilter}
                onValueChange={(v) => updateParams("kesiapanIntegrasi", v)}
              >
                <SelectTrigger className="h-9 w-[160px] bg-background">
                  <SelectValue placeholder="Kesiapan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kesiapan</SelectItem>
                  <SelectItem value="Q1">Q1</SelectItem>
                  <SelectItem value="Q2">Q2</SelectItem>
                  <SelectItem value="Q3">Q3</SelectItem>
                  <SelectItem value="blank">Belum di set</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {canWrite && (
          <div className="flex gap-2 shrink-0">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={pending || deletingAll || data.total === 0}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deletingAll ? "Memproses..." : "Hapus Semua"}
            </Button>
            <ServiceForm
              ukes={ukes}
              kelompokOptions={kelompokOptions}
              defaultUkeId={defaultUkeId}
            />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">No</TableHead>
              <TableHead>UKE I</TableHead>
              <TableHead className="w-[100px]">Tahun</TableHead>
              <TableHead>Jenis Layanan</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Integrasi</TableHead>
              <TableHead>SuperApps</TableHead>
              <TableHead className="w-[80px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Tidak ada layanan
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((s, index) => {
                const displayTahun = tahunOverrides[s.id] ?? s.tahunPekerjaan;
                const isUpdatingTahun = updatingTahunId === s.id;

                return (
                  <TableRow key={s.id}>
                    <TableCell className="text-muted-foreground">
                      {(data.page - 1) * data.pageSize + index + 1}
                    </TableCell>
                    <TableCell>{s.uke?.code ?? "-"}</TableCell>
                    <TableCell>
                      {canWrite ? (
                        <Select
                          value={String(displayTahun)}
                          disabled={isUpdatingTahun || pending}
                          onValueChange={(v) =>
                            handleTahunChange(s.id, Number(v), s.tahunPekerjaan)
                          }
                        >
                          <SelectTrigger className="h-8 w-[88px]">
                            {isUpdatingTahun ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <SelectValue />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {getTahunSelectOptions(s.tahunPekerjaan).map((year) => (
                              <SelectItem key={year} value={String(year)}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        displayTahun
                      )}
                    </TableCell>
                    <TableCell className="font-medium max-w-[240px] truncate">
                      <Link
                        href={`/services/${s.id}`}
                        className="hover:text-primary hover:underline"
                        title={s.jenisLayanan}
                      >
                        {s.jenisLayanan}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{SCOPE_LABELS[s.scope]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {s.kesiapanIntegrasi === "NOT_READY"
                          ? "Belum di set"
                          : INTEGRATION_LABELS[s.kesiapanIntegrasi]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.sudahSuperApps ? "success" : "warning"}>
                        {s.sudahSuperApps ? "Sudah" : "Belum"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/services/${s.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {canWrite && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(s.id)}
                            disabled={pending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Menampilkan {data.items.length} dari {data.total} layanan
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={data.page <= 1}
            onClick={() => goToPage(data.page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="flex items-center px-2 text-sm">
            {data.page} / {data.totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={data.page >= data.totalPages}
            onClick={() => goToPage(data.page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
