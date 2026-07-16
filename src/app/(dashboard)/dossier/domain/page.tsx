import { PageHeader } from "@/components/layout/page-header";
import { DomainManager } from "@/components/dossier/domain-manager";
import { getDossierDomains } from "@/lib/actions/dossier";
import { canManageDossier, requireDossierAccess } from "@/lib/auth";

export default async function DossierDomainPage() {
  const session = await requireDossierAccess();
  const { year, domains } = await getDossierDomains();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Dossier · Domain"
        description="10 domain prioritas: maturity level, status perkembangan, remarks, dan target"
      />
      <DomainManager
        year={year}
        domains={domains}
        canEdit={canManageDossier(session.role)}
      />
    </div>
  );
}
