import { PageHeader } from "@/components/layout/page-header";
import { MasterDataTable } from "@/components/master/master-data-table";
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
        description="Kelola daftar aplikasi existing"
      />
      <MasterDataTable
        title="Aplikasi"
        description="Daftar aplikasi existing"
        items={apps}
        canEdit={canEdit}
        createAction={createApplication}
        updateAction={updateApplication}
        deleteAction={deleteApplication}
        fields={[
          { name: "name", label: "Nama", required: true },
          { name: "vendor", label: "Vendor" },
          { name: "description", label: "Deskripsi", type: "textarea" },
        ]}
        columns={[
          { key: "name", label: "Nama" },
          { key: "vendor", label: "Vendor" },
          { key: "isActive", label: "Status", type: "active-badge" },
        ]}
      />
    </div>
  );
}
