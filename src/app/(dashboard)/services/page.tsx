import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ServicesTable } from "@/components/services/services-table";
import { Skeleton } from "@/components/ui/skeleton";
import { getServices, getNamaAplikasiOptions } from "@/lib/actions/services";
import { getUkes } from "@/lib/actions/uke";
import { getKelompokLayananOptions } from "@/lib/actions/kelompok-layanan";
import { requireAuth, canWrite } from "@/lib/auth";

export const maxDuration = 60;

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

async function ServicesContent({ searchParams }: PageProps) {
  const session = await requireAuth();
  const params = await searchParams;

  const filters = {
    search: params.search,
    ukeId: params.ukeId,
    kelompokLayanan: params.kelompokLayanan,
    tahunPekerjaan: params.tahunPekerjaan ? Number(params.tahunPekerjaan) : undefined,
    scope:
      params.scope === "INTERNAL" || params.scope === "EKSTERNAL"
        ? params.scope
        : undefined,
    sudahSuperApps:
      params.sudahSuperApps === "true"
        ? true
        : params.sudahSuperApps === "false"
          ? false
          : undefined,
    kesiapanIntegrasi:
      params.kesiapanIntegrasi === "blank"
        ? "NOT_READY"
        : params.kesiapanIntegrasi && params.kesiapanIntegrasi !== "all"
          ? params.kesiapanIntegrasi
          : undefined,
    namaAplikasi: params.namaAplikasi && params.namaAplikasi !== "all"
      ? params.namaAplikasi
      : undefined,
    page: params.page ? Number(params.page) : 1,
    pageSize: 10,
    sortBy: params.sortBy ?? "updatedAt",
    sortOrder: (params.sortOrder as "asc" | "desc") ?? "desc",
  };

  const [data, ukes, kelompokOptions, namaAplikasiOptions] = await Promise.all([
    getServices(filters),
    getUkes(),
    getKelompokLayananOptions(),
    getNamaAplikasiOptions(),
  ]);

  const toOption = (items: { id: string; code?: string; name: string }[]) =>
    items.map((i) => ({
      id: i.id,
      label: i.code ? `${i.code} - ${i.name}` : i.name,
    }));

  return (
    <ServicesTable
      data={data}
      ukes={toOption(ukes)}
      kelompokOptions={kelompokOptions}
      namaAplikasiOptions={namaAplikasiOptions}
      canWrite={canWrite(session.role)}
      defaultUkeId={session.ukeId ?? undefined}
      hideUkeFilter={session.role === "OPERATOR_UKE"}
    />
  );
}

export default function ServicesPage({ searchParams }: PageProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Daftar Layanan"
        description="Kelola data layanan SuperApps sesuai struktur Excel"
      />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ServicesContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
