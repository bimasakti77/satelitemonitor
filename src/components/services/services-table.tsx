"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Search, ChevronLeft, ChevronRight, Eye, Trash2 } from "lucide-react";
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
import { deleteService, deleteAllServices } from "@/lib/actions/services";
import { INTEGRATION_LABELS, SCOPE_LABELS } from "@/lib/constants";
import type { ServiceScope, IntegrationReadiness } from "@prisma/client";

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
}

export function ServicesTable({
  data,
  ukes,
  kelompokOptions,
  canWrite,
  defaultUkeId,
}: ServicesTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const updateParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== "page") params.set("page", "1");
    router.push(`/services?${params.toString()}`);
  };

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`/services?${params.toString()}`);
  };

  const handleDeleteAll = () => {
    if (data.total === 0) return;
    const message =
      data.total === 1
        ? "Yakin ingin menghapus 1 layanan? Tindakan ini tidak dapat dibatalkan."
        : `Yakin ingin menghapus semua ${data.total} layanan? Tindakan ini tidak dapat dibatalkan.`;
    if (!confirm(message)) return;

    startTransition(async () => {
      const params = Object.fromEntries(searchParams.entries());
      const result = await deleteAllServices({
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
        kesiapanIntegrasi: params.kesiapanIntegrasi,
      });
      if (result.success) {
        toast.success(`${result.data?.count ?? 0} layanan dihapus`);
        router.push("/services");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
                <SelectItem key={u.id} value={u.id}>{u.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={searchParams.get("kelompokLayanan") ?? "all"}
            onValueChange={(v) => updateParams("kelompokLayanan", v === "all" ? "" : v)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Kelompok" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelompok</SelectItem>
              {kelompokOptions.map((k) => (
                <SelectItem key={k} value={k}>{k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={pending || data.total === 0}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus Semua
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
              <TableHead>Tahun</TableHead>
              <TableHead>Kelompok</TableHead>
              <TableHead>Jenis Layanan</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Tipe Internal</TableHead>
              <TableHead>Integrasi</TableHead>
              <TableHead>SuperApps</TableHead>
              <TableHead className="w-[80px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Tidak ada layanan
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((s, index) => (
                <TableRow key={s.id}>
                  <TableCell className="text-muted-foreground">
                    {(data.page - 1) * data.pageSize + index + 1}
                  </TableCell>
                  <TableCell>{s.uke?.code ?? "-"}</TableCell>
                  <TableCell>{s.tahunPekerjaan}</TableCell>
                  <TableCell className="max-w-[120px] truncate">{s.kelompokLayanan}</TableCell>
                  <TableCell className="font-medium max-w-[180px] truncate">
                    {s.jenisLayanan}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{SCOPE_LABELS[s.scope]}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[100px] truncate">
                    {s.scope === "INTERNAL" ? (s.tipeLayananInternal ?? "-") : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {INTEGRATION_LABELS[s.kesiapanIntegrasi]}
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
              ))
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
