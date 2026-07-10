"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import type { ActionResult } from "@/lib/actions/auth";

interface Column {
  key: string;
  label: string;
  type?: "text" | "active-badge" | "boolean-badge" | "service-count";
  trueLabel?: string;
  falseLabel?: string;
}

interface MasterDataTableProps<T extends { id: string; isActive?: boolean }> {
  title: string;
  description: string;
  items: T[];
  columns: Column[];
  canEdit: boolean;
  createAction: (prev: ActionResult, formData: FormData) => Promise<ActionResult<unknown>>;
  updateAction: (id: string, prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  deleteAction: (id: string) => Promise<ActionResult>;
  fields: {
    name: string;
    label: string;
    type?: "text" | "textarea";
    required?: boolean;
  }[];
}

export function MasterDataTable<T extends { id: string; isActive?: boolean }>({
  title,
  description,
  items,
  columns,
  canEdit,
  createAction,
  updateAction,
  deleteAction,
  fields,
}: MasterDataTableProps<T>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);

  const [createState, createFormAction, createPending] = useActionState(
    async (prev: ActionResult<unknown>, formData: FormData) => {
      const result = await createAction(prev, formData);
      if (result.success) {
        toast.success("Data berhasil ditambahkan");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
      return result;
    },
    { success: false, error: "" }
  );

  const handleUpdate = async (id: string, formData: FormData) => {
    const result = await updateAction(id, { success: false, error: "" }, formData);
    if (result.success) {
      toast.success("Data berhasil diperbarui");
      setEditing(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menonaktifkan data ini?")) return;
    const result = await deleteAction(id);
    if (result.success) {
      toast.success("Data berhasil dinonaktifkan");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const renderCell = (item: T, col: Column) => {
    const record = item as unknown as Record<string, unknown>;

    switch (col.type) {
      case "active-badge":
        return (
          <Badge variant={item.isActive ? "success" : "secondary"}>
            {item.isActive ? "Aktif" : "Nonaktif"}
          </Badge>
        );
      case "boolean-badge": {
        const value = Boolean(record[col.key]);
        return (
          <Badge variant={value ? "success" : "secondary"}>
            {value ? (col.trueLabel ?? "Ya") : (col.falseLabel ?? "Tidak")}
          </Badge>
        );
      }
      case "service-count": {
        const count = (record._count as { services?: number } | undefined)?.services ?? 0;
        return String(count);
      }
      default:
        return String(record[col.key] ?? "");
    }
  };

  const FormFields = ({ item }: { item?: T }) => (
    <>
      {fields.map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>{field.label}</Label>
          {field.type === "textarea" ? (
            <textarea
              id={field.name}
              name={field.name}
              defaultValue={String((item as unknown as Record<string, unknown>)?.[field.name] ?? "")}
              className="flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
            />
          ) : (
            <Input
              id={field.name}
              name={field.name}
              defaultValue={String((item as unknown as Record<string, unknown>)?.[field.name] ?? "")}
              required={field.required}
            />
          )}
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          name="isActive"
          value="true"
          defaultChecked={item?.isActive !== false}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="isActive">Aktif</Label>
      </div>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Tambah
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah {title}</DialogTitle>
              </DialogHeader>
              <form action={createFormAction} className="space-y-4">
                <FormFields />
                {!createState.success && createState.error && (
                  <p className="text-sm text-destructive">{createState.error}</p>
                )}
                <Button type="submit" disabled={createPending}>
                  Simpan
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={String(col.key)}>{col.label}</TableHead>
              ))}
              {canEdit && <TableHead className="w-[100px]">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-center py-8 text-muted-foreground">
                  Tidak ada data
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  {columns.map((col) => (
                    <TableCell key={String(col.key)}>
                      {renderCell(item, col)}
                    </TableCell>
                  ))}
                  {canEdit && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Dialog
                          open={editing?.id === item.id}
                          onOpenChange={(o) => !o && setEditing(null)}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditing(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit {title}</DialogTitle>
                            </DialogHeader>
                            <form
                              action={(fd) => handleUpdate(item.id, fd)}
                              className="space-y-4"
                            >
                              <FormFields item={item} />
                              <Button type="submit">Perbarui</Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
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
    </div>
  );
}
