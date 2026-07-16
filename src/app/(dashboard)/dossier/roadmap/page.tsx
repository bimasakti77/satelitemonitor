import { PageHeader } from "@/components/layout/page-header";
import { RoadmapManager } from "@/components/dossier/roadmap-manager";
import { getDossierRoadmap } from "@/lib/actions/dossier";
import { canManageDossier, requireDossierAccess } from "@/lib/auth";

export default async function DossierRoadmapPage() {
  const session = await requireDossierAccess();
  const items = await getDossierRoadmap();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Dossier · Roadmap"
        description="Milestone implementasi SuperApps per tahun pekerjaan"
      />
      <RoadmapManager items={items} canEdit={canManageDossier(session.role)} />
    </div>
  );
}
