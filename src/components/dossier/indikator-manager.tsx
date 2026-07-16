"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteDossierIndicator,
  upsertDossierIndicator,
} from "@/lib/actions/dossier";
import type { ActionResult } from "@/lib/actions/auth";

type Indicator = {
  id: string;
  name: string;
  baselineCondition: string;
  targetCondition: string;
  sortOrder: number;
};

export function IndikatorManager({
  items,
  canEdit,
}: {
  items: Indicator[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Indicator | null>(null);
  const [pendingDelete, startDelete] = useTransition();

  const [state, formAction, pending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await upsertDossierIndicator(prev, formData);
      if (result.success) {
        toast.success(editing ? "Indikator diperbarui" : "Indikator ditambahkan");
        setOpen(false);
        setEditing(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal menyimpan");
      }
      return result;
    },
    { success: false, error: "" } as ActionResult
  );

  const onDelete = (id: string) => {
    if (!confirm("Nonaktifkan indikator ini?")) return;
    startDelete(async () => {
      const result = await deleteDossierIndicator(id);
      if (result.success) {
        toast.success("Indikator dihapus");
        router.refresh();
      } else toast.error(result.error ?? "Gagal menghapus");
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Indikator Utama Baseline</CardTitle>
            <CardDescription>
              Bandingkan kondisi awal vs target implementasi
            </CardDescription>
          </div>
          {canEdit && (
            <Dialog
              open={open}
              onOpenChange={(next) => {
                setOpen(next);
                if (!next) setEditing(null);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Indikator
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editing ? "Edit Indikator" : "Tambah Indikator"}
                  </DialogTitle>
                </DialogHeader>
                <form action={formAction} className="space-y-4">
                  {editing && <input type="hidden" name="id" value={editing.id} />}
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Indikator</Label>
                    <Input
                      id="name"
                      name="name"
                      required
                      defaultValue={editing?.name ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="baselineCondition">Kondisi Awal</Label>
                    <Input
                      id="baselineCondition"
                      name="baselineCondition"
                      required
                      defaultValue={editing?.baselineCondition ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetCondition">Target</Label>
                    <Input
                      id="targetCondition"
                      name="targetCondition"
                      required
                      defaultValue={editing?.targetCondition ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sortOrder">Urutan</Label>
                    <Input
                      id="sortOrder"
                      name="sortOrder"
                      type="number"
                      defaultValue={editing?.sortOrder ?? items.length + 1}
                    />
                  </div>
                  {!state.success && state.error && (
                    <p className="text-sm text-destructive">{state.error}</p>
                  )}
                  <Button type="submit" disabled={pending}>
                    {pending ? "Menyimpan..." : "Simpan"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No</TableHead>
                <TableHead>Indikator</TableHead>
                <TableHead>Kondisi Awal</TableHead>
                <TableHead>Target</TableHead>
                {canEdit && <TableHead className="w-[120px]">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canEdit ? 5 : 4}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Belum ada indikator
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.baselineCondition}</TableCell>
                    <TableCell>{item.targetCondition}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditing(item);
                              setOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={pendingDelete}
                            onClick={() => onDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
