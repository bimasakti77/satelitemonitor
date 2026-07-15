import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { Skeleton } from "@/components/ui/skeleton";
import { getExecutiveDashboard } from "@/lib/actions/dashboard";
import { getServerHealthStatuses } from "@/lib/actions/server-health";
import { requireAuth, getOperatorUkeFilter } from "@/lib/auth";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

async function DashboardContent({ searchParams }: PageProps) {
  const session = await requireAuth();
  const params = await searchParams;

  const selectedTahun = params.tahun ?? "all";
  const selectedScope = params.scope ?? "all";
  const selectedSuperApps = params.sudahSuperApps ?? "all";
  const tahunPekerjaan =
    selectedTahun !== "all" && params.tahun ? Number(params.tahun) : undefined;
  const scope =
    selectedScope === "INTERNAL" || selectedScope === "EKSTERNAL"
      ? selectedScope
      : undefined;
  const sudahSuperApps =
    selectedSuperApps === "true"
      ? true
      : selectedSuperApps === "false"
        ? false
        : undefined;

  const ukeId = getOperatorUkeFilter(session);

  const [data, serverHealth] = await Promise.all([
    getExecutiveDashboard({ tahunPekerjaan, ukeId, scope, sudahSuperApps }),
    getServerHealthStatuses(),
  ]);

  return (
    <DashboardClient
      data={data}
      selectedTahun={selectedTahun}
      selectedScope={selectedScope}
      selectedSuperApps={selectedSuperApps}
      serverHealth={serverHealth}
    />
  );
}

export default function DashboardPage({ searchParams }: PageProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Eksekutif"
        description="Monitoring layanan SuperApps — kesiapan integrasi lintas UKE I"
      />
      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
