"use client";

import { useMemo, useState } from "react";
import { MasterDataTable } from "@/components/master/master-data-table";
import {
  ApplicationScopeFilter,
  countByApplicationScope,
  filterByApplicationScope,
  type ApplicationScopeFilterValue,
} from "@/components/master/application-scope-filter";
import type { ActionResult } from "@/lib/actions/auth";

type ApplicationItem = {
  id: string;
  name: string;
  description: string | null;
  vendor: string | null;
  isPublic: boolean;
  isActive: boolean;
};

interface ApplicationsMasterTableProps {
  items: ApplicationItem[];
  canEdit: boolean;
  createAction: (
    prev: ActionResult,
    formData: FormData
  ) => Promise<ActionResult<unknown>>;
  updateAction: (
    id: string,
    prev: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
  deleteAction: (id: string) => Promise<ActionResult>;
}

export function ApplicationsMasterTable({
  items,
  canEdit,
  createAction,
  updateAction,
  deleteAction,
}: ApplicationsMasterTableProps) {
  const [scopeFilter, setScopeFilter] =
    useState<ApplicationScopeFilterValue>("all");

  const counts = useMemo(() => countByApplicationScope(items), [items]);
  const filteredItems = useMemo(
    () => filterByApplicationScope(items, scopeFilter),
    [items, scopeFilter]
  );

  return (
    <div className="space-y-4">
      <ApplicationScopeFilter
        value={scopeFilter}
        onValueChange={setScopeFilter}
        counts={counts}
      />
      <MasterDataTable
        title="Aplikasi"
        description={
          scopeFilter === "all"
            ? "Daftar aplikasi existing"
            : scopeFilter === "public"
              ? "Menampilkan aplikasi layanan publik"
              : "Menampilkan aplikasi internal"
        }
        items={filteredItems}
        canEdit={canEdit}
        createAction={createAction}
        updateAction={updateAction}
        deleteAction={deleteAction}
        fields={[
          { name: "name", label: "Nama", required: true },
          { name: "vendor", label: "Vendor" },
          { name: "description", label: "Deskripsi", type: "textarea" },
        ]}
        columns={[
          { key: "name", label: "Nama" },
          { key: "vendor", label: "Vendor" },
          {
            key: "isPublic",
            label: "Keterangan",
            type: "boolean-badge",
            trueLabel: "Aplikasi Layanan Publik",
            falseLabel: "Aplikasi Internal",
          },
          { key: "isActive", label: "Status", type: "active-badge" },
        ]}
      />
    </div>
  );
}
