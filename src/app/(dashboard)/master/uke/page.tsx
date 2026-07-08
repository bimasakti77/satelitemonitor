import { PageHeader } from "@/components/layout/page-header";
import { MasterDataTable } from "@/components/master/master-data-table";
import { getUkes } from "@/lib/actions/uke";
import { createUke, updateUke, deleteUke } from "@/lib/actions/uke";
import { requireRole } from "@/lib/auth";

export default async function UkePage() {
  const session = await requireRole(["ADMINISTRATOR"]);
  const ukes = await getUkes(true);
  const canEdit = session.role === "ADMINISTRATOR";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master UKE"
        description="Kelola Unit Kerja Eselon I"
      />
      <MasterDataTable
        title="UKE"
        description="Daftar Unit Kerja Eselon I"
        items={ukes}
        canEdit={canEdit}
        createAction={createUke}
        updateAction={updateUke}
        deleteAction={deleteUke}
        fields={[
          { name: "code", label: "Kode", required: true },
          { name: "name", label: "Nama", required: true },
          { name: "description", label: "Deskripsi", type: "textarea" },
        ]}
        columns={[
          { key: "code", label: "Kode" },
          { key: "name", label: "Nama" },
          { key: "isActive", label: "Status", type: "active-badge" },
          { key: "_count", label: "Layanan", type: "service-count" },
        ]}
      />
    </div>
  );
}
