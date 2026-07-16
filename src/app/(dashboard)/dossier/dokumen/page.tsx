import { PageHeader } from "@/components/layout/page-header";
import { DokumenManager } from "@/components/dossier/dokumen-manager";
import { getDossierDocuments } from "@/lib/actions/dossier";
import { canManageDossier, requireDossierAccess } from "@/lib/auth";

export default async function DossierDokumenPage() {
  const session = await requireDossierAccess();
  const { profile, team, documents } = await getDossierDocuments();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Dossier · Dokumen"
        description="Profil proyek, struktur tim, dan checklist kelengkapan dokumen"
      />
      <DokumenManager
        profile={profile}
        team={team}
        documents={documents}
        canEdit={canManageDossier(session.role)}
      />
    </div>
  );
}
