import { PageHeader } from "@/components/layout/page-header";
import { ImportPageClient } from "@/components/import/import-page-client";
import { getImports, getLatestCommittedImportId } from "@/lib/actions/import";
import { requireRole } from "@/lib/auth";

export const maxDuration = 60;

export default async function ImportPage() {
  const session = await requireRole(["ADMINISTRATOR", "OPERATOR_UKE"]);
  const [imports, rollbackableImportId] = await Promise.all([
    getImports(),
    getLatestCommittedImportId(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import / Export Data"
        description="Unggah dan sinkronkan data dari Excel"
      />
      <ImportPageClient
        imports={imports}
        isAdmin={session.role === "ADMINISTRATOR"}
        rollbackableImportId={rollbackableImportId}
      />
    </div>
  );
}
