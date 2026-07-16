import { PageHeader } from "@/components/layout/page-header";
import { IndikatorManager } from "@/components/dossier/indikator-manager";
import { getDossierIndicators } from "@/lib/actions/dossier";
import { canManageDossier, requireDossierAccess } from "@/lib/auth";

export default async function DossierIndikatorPage() {
  const session = await requireDossierAccess();
  const items = await getDossierIndicators();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Dossier · Indikator Baseline"
        description="Indikator utama: kondisi awal versus target implementasi"
      />
      <IndikatorManager items={items} canEdit={canManageDossier(session.role)} />
    </div>
  );
}
