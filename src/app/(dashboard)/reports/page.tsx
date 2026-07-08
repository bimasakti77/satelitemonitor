import {
  getDashboardKpis,
  getProgressByUke,
  getServicesByYear,
  getRecentChanges,
  getTopApplications,
} from "@/lib/actions/dashboard";
import { ReportClient } from "@/components/reports/report-client";
import { requireAuth, getOperatorUkeFilter } from "@/lib/auth";

export default async function ReportsPage() {
  const session = await requireAuth();
  const ukeFilter = getOperatorUkeFilter(session);

  const [kpis, progressByUke, progressByYear, recentChanges, topApps] =
    await Promise.all([
      getDashboardKpis(ukeFilter),
      getProgressByUke(ukeFilter),
      getServicesByYear(ukeFilter),
      getRecentChanges(15, ukeFilter),
      getTopApplications(10, ukeFilter),
    ]);

  return (
    <ReportClient
      data={{
        kpis,
        progressByUke,
        progressByYear,
        recentChanges,
        topApps,
      }}
    />
  );
}
