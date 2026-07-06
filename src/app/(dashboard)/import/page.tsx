import { PageHeader } from "@/components/layout/page-header";
import { ImportPageClient } from "@/components/import/import-page-client";
import { getImports, getLatestCommittedImportId } from "@/lib/actions/import";
import { requireAuth } from "@/lib/auth";

export default async function ImportPage() {
  const session = await requireAuth();
  const [imports, rollbackableImportId] = await Promise.all([
    getImports(),
    getLatestCommittedImportId(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Spreadsheet"
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
