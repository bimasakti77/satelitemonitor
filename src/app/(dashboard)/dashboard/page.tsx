import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { Skeleton } from "@/components/ui/skeleton";
import { getExecutiveDashboard } from "@/lib/actions/dashboard";
import { requireAuth } from "@/lib/auth";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

async function DashboardContent({ searchParams }: PageProps) {
  const session = await requireAuth();
  const params = await searchParams;

  const selectedTahun = params.tahun ?? "all";
  const tahunPekerjaan =
    selectedTahun !== "all" && params.tahun ? Number(params.tahun) : undefined;

  const ukeId =
    session.role === "OPERATOR_UKE" && session.ukeId ? session.ukeId : undefined;

  const data = await getExecutiveDashboard({ tahunPekerjaan, ukeId });

  return (
    <DashboardClient data={data} selectedTahun={selectedTahun} />
  );
}

export default function DashboardPage({ searchParams }: PageProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Eksekutif"
        description="Monitoring layanan belum masuk SuperApps — kesiapan integrasi lintas UKE I"
      />
      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
