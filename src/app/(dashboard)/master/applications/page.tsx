import { PageHeader } from "@/components/layout/page-header";
import { ApplicationsMasterTable } from "@/components/master/applications-master-table";
import { ExtractApplicationsButton } from "@/components/master/extract-applications-button";
import {
  getApplications,
  createApplication,
  updateApplication,
  deleteApplication,
} from "@/lib/actions/applications";
import { requireRole } from "@/lib/auth";

export default async function ApplicationsPage() {
  const session = await requireRole(["ADMINISTRATOR"]);
  const apps = await getApplications(true);
  const canEdit = session.role === "ADMINISTRATOR";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Existing Applications"
        description="Kelola daftar aplikasi existing. Extract Data akan mengosongkan tabel lalu mengisi ulang dari nama aplikasi di daftar layanan."
      >
        {canEdit && <ExtractApplicationsButton />}
      </PageHeader>
      <ApplicationsMasterTable
        items={apps}
        canEdit={canEdit}
        createAction={createApplication}
        updateAction={updateApplication}
        deleteAction={deleteApplication}
      />
    </div>
  );
}
