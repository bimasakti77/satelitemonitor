"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { createService, updateService } from "@/lib/actions/services";
import type { ActionResult } from "@/lib/actions/auth";
import { INTEGRATION_LABELS, SCOPE_LABELS, mergeTahunOptions } from "@/lib/constants";

interface Option {
  id: string;
  label: string;
}

interface ServiceFormProps {
  ukes: Option[];
  kelompokOptions: string[];
  defaultUkeId?: string;
  service?: {
    id: string;
    kelompokLayanan: string;
    ukeId: string | null;
    jenisLayanan: string;
    tahunPekerjaan: number;
    scope: string;
    tipeLayananInternal: string | null;
    sudahSuperApps: boolean;
    kesiapanIntegrasi: string;
    namaAplikasi: string | null;
    detailAplikasi: string | null;
    fungsi: { nama: string }[];
  };
  trigger?: React.ReactNode;
}

function TextArea({
  id,
  name,
  defaultValue,
  rows = 3,
}: {
  id: string;
  name: string;
  defaultValue?: string | null;
  rows?: number;
}) {
  return (
    <textarea
      id={id}
      name={name}
      defaultValue={defaultValue ?? ""}
      rows={rows}
      className="flex min-h-[60px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
    />
  );
}

export function ServiceForm({
  ukes,
  kelompokOptions,
  defaultUkeId,
  service,
  trigger,
}: ServiceFormProps) {
  const router = useRouter();
  const isEdit = !!service;

  const [scope, setScope] = useState(service?.scope ?? "INTERNAL");
  const [fungsiRows, setFungsiRows] = useState<string[]>(
    service?.fungsi?.length ? service.fungsi.map((f) => f.nama) : [""]
  );

  const action = isEdit
    ? updateService.bind(null, service.id)
    : createService;

  const [state, formAction, pending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await action(prev, formData);
      if (result.success) {
        toast.success(isEdit ? "Layanan diperbarui" : "Layanan ditambahkan");
        router.refresh();
        if (!isEdit && result.data && typeof result.data === "object" && "id" in result.data) {
          router.push(`/services/${(result.data as { id: string }).id}`);
        }
      } else {
        toast.error(result.error);
      }
      return result;
    },
    { success: false, error: "" }
  );

  const addFungsiRow = () => setFungsiRows((rows) => [...rows, ""]);
  const removeFungsiRow = (index: number) =>
    setFungsiRows((rows) => rows.filter((_, i) => i !== index));
  const updateFungsiRow = (index: number, value: string) =>
    setFungsiRows((rows) => rows.map((row, i) => (i === index ? value : row)));

  const FormContent = () => (
    <form
      action={formAction}
      className={
        isEdit
          ? "space-y-5"
          : "max-h-[70vh] space-y-4 overflow-y-auto pr-2"
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ukeId">UKE I</Label>
          <NativeSelect
            id="ukeId"
            name="ukeId"
            defaultValue={service?.ukeId ?? defaultUkeId ?? ""}
            required
          >
            <option value="">Pilih UKE</option>
            {ukes.map((u) => (
              <option key={u.id} value={u.id}>{u.label}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tahunPekerjaan">Tahun Pekerjaan</Label>
          <NativeSelect
            id="tahunPekerjaan"
            name="tahunPekerjaan"
            defaultValue={String(
              service?.tahunPekerjaan ?? new Date().getFullYear()
            )}
            required
          >
            {mergeTahunOptions(service?.tahunPekerjaan).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="kelompokLayanan">Kelompok Layanan</Label>
        <Input
          id="kelompokLayanan"
          name="kelompokLayanan"
          list="kelompok-options"
          defaultValue={service?.kelompokLayanan}
          required
        />
        <datalist id="kelompok-options">
          {kelompokOptions.map((k) => (
            <option key={k} value={k} />
          ))}
        </datalist>
      </div>

      <div className="space-y-2">
        <Label htmlFor="jenisLayanan">Jenis Layanan</Label>
        <TextArea
          id="jenisLayanan"
          name="jenisLayanan"
          defaultValue={service?.jenisLayanan}
          rows={2}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="scope">Tipe Layanan</Label>
          <NativeSelect
            id="scope"
            name="scope"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          >
            {Object.entries(SCOPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </NativeSelect>
        </div>
        {scope === "INTERNAL" && (
          <div className="space-y-2">
            <Label htmlFor="tipeLayananInternal">Tipe Layanan Internal</Label>
            <Input
              id="tipeLayananInternal"
              name="tipeLayananInternal"
              defaultValue={service?.tipeLayananInternal ?? ""}
              placeholder="Contoh: Layanan Internal"
              required
            />
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="kesiapanIntegrasi">Kesiapan Integrasi</Label>
          <NativeSelect
            id="kesiapanIntegrasi"
            name="kesiapanIntegrasi"
            defaultValue={service?.kesiapanIntegrasi ?? "NOT_READY"}
          >
            {Object.entries(INTEGRATION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex items-end gap-2 pb-2">
          <input
            type="checkbox"
            id="sudahSuperApps"
            name="sudahSuperApps"
            value="true"
            defaultChecked={service?.sudahSuperApps}
            className="h-4 w-4 rounded border-input"
          />
          <Label htmlFor="sudahSuperApps">Sudah di Superapps</Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="namaAplikasi">Nama Aplikasi Terkait</Label>
        <Input id="namaAplikasi" name="namaAplikasi" defaultValue={service?.namaAplikasi ?? ""} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="detailAplikasi">Detail Aplikasi Terkait</Label>
        <TextArea id="detailAplikasi" name="detailAplikasi" defaultValue={service?.detailAplikasi} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Daftar Fungsi Terkait Layanan</Label>
          <Button type="button" variant="outline" size="sm" onClick={addFungsiRow}>
            <Plus className="mr-1 h-3 w-3" />
            Tambah Baris
          </Button>
        </div>
        <div className="space-y-2">
          {fungsiRows.map((row, index) => (
            <div key={index} className="flex gap-2">
              <Input
                name="fungsi"
                value={row}
                onChange={(e) => updateFungsiRow(index, e.target.value)}
                placeholder="Contoh: Register, Input data, Tarik laporan"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeFungsiRow(index)}
                disabled={fungsiRows.length === 1}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {!state.success && state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" disabled={pending}>
        {isEdit ? "Perbarui" : "Simpan"}
      </Button>
    </form>
  );

  if (isEdit) {
    return <FormContent />;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Layanan
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tambah Layanan</DialogTitle>
        </DialogHeader>
        <FormContent />
      </DialogContent>
    </Dialog>
  );
}
