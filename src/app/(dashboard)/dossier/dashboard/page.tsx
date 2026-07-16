import { PageHeader } from "@/components/layout/page-header";
import { DossierDashboardView } from "@/components/dossier/dossier-dashboard";
import { getDossierDashboardData } from "@/lib/actions/dossier";

export default async function DossierDashboardPage() {
  const data = await getDossierDashboardData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Dossier · Dashboard"
        description="Executive Baseline Dashboard — ringkasan maturity, integrasi, domain, indikator, dan roadmap"
      />
      <DossierDashboardView data={data} />
    </div>
  );
}
