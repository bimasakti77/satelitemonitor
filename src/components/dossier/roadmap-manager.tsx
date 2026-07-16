"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  deleteDossierRoadmapItem,
  upsertDossierRoadmapItem,
} from "@/lib/actions/dossier";
import type { ActionResult } from "@/lib/actions/auth";

type RoadmapItem = {
  id: string;
  year: number;
  title: string;
  description: string | null;
  sortOrder: number;
};

export function RoadmapManager({
  items,
  canEdit,
}: {
  items: RoadmapItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoadmapItem | null>(null);
  const [pendingDelete, startDelete] = useTransition();

  const byYear = useMemo(() => {
    const map = new Map<number, RoadmapItem[]>();
    for (const item of items) {
      const list = map.get(item.year) ?? [];
      list.push(item);
      map.set(item.year, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [items]);

  const [state, formAction, pending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await upsertDossierRoadmapItem(prev, formData);
      if (result.success) {
        toast.success(editing ? "Milestone diperbarui" : "Milestone ditambahkan");
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
    if (!confirm("Nonaktifkan milestone ini?")) return;
    startDelete(async () => {
      const result = await deleteDossierRoadmapItem(id);
      if (result.success) {
        toast.success("Milestone dihapus");
        router.refresh();
      } else toast.error(result.error ?? "Gagal menghapus");
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Roadmap Implementasi</CardTitle>
              <CardDescription>
                Milestone per tahun pekerjaan (2026–2028)
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
                    Tambah Milestone
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editing ? "Edit Milestone" : "Tambah Milestone"}
                    </DialogTitle>
                  </DialogHeader>
                  <form action={formAction} className="space-y-4">
                    {editing && <input type="hidden" name="id" value={editing.id} />}
                    <div className="space-y-2">
                      <Label htmlFor="year">Tahun</Label>
                      <NativeSelect
                        id="year"
                        name="year"
                        defaultValue={String(editing?.year ?? 2026)}
                      >
                        {[2026, 2027, 2028].map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="title">Judul</Label>
                      <Input
                        id="title"
                        name="title"
                        required
                        defaultValue={editing?.title ?? ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Deskripsi</Label>
                      <Input
                        id="description"
                        name="description"
                        defaultValue={editing?.description ?? ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sortOrder">Urutan</Label>
                      <Input
                        id="sortOrder"
                        name="sortOrder"
                        type="number"
                        defaultValue={editing?.sortOrder ?? 0}
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
      </Card>

      {byYear.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Belum ada milestone roadmap
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {byYear.map(([year, yearItems]) => (
            <Card key={year}>
              <CardHeader className="pb-3">
                <Badge className="w-fit">{year}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {yearItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border p-3 text-sm"
                  >
                    <p className="font-medium">{item.title}</p>
                    {item.description && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                    {canEdit && (
                      <div className="mt-2 flex gap-1">
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
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
