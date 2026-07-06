import {
  getDashboardKpis,
  getProgressByUke,
  getServicesByYear,
  getRecentChanges,
  getTopApplications,
} from "@/lib/actions/dashboard";
import { ReportClient } from "@/components/reports/report-client";

export default async function ReportsPage() {
  const [kpis, progressByUke, progressByYear, recentChanges, topApps] =
    await Promise.all([
      getDashboardKpis(),
      getProgressByUke(),
      getServicesByYear(),
      getRecentChanges(15),
      getTopApplications(10),
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
