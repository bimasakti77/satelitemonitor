"use client";

import { useActionState, useMemo, useState, useTransition, Fragment } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  FolderTree,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createServiceFunctionApi,
  deleteServiceFunctionApi,
  updateServiceFunctionApiStatus,
} from "@/lib/actions/service-function-apis";
import { FUNCTION_API_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/actions/auth";
import type { FunctionApiStatus } from "@prisma/client";

type FunctionApi = {
  id: string;
  nama: string;
  endpoint: string | null;
  status: FunctionApiStatus;
  catatan: string | null;
  sortOrder: number;
};

type ServiceFunctionItem = {
  id: string;
  nama: string;
  sortOrder: number;
  apis: FunctionApi[];
};

function statusBadgeVariant(status: FunctionApiStatus) {
  switch (status) {
    case "SUDAH_TERSEDIA":
      return "success" as const;
    case "ON_PROGRESS":
      return "warning" as const;
    default:
      return "secondary" as const;
  }
}

function AddApiDialog({
  functionId,
  functionName,
}: {
  functionId: string;
  functionName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const boundCreate = createServiceFunctionApi.bind(null, functionId);

  const [state, formAction, pending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await boundCreate(prev, formData);
      if (result.success) {
        toast.success("API berhasil ditambahkan");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal menambahkan API");
      }
      return result;
    },
    { success: false, error: "" } as ActionResult
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Plus className="mr-1 h-3.5 w-3.5" />
          Tambah API
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah API — {functionName}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`nama-${functionId}`}>Nama API</Label>
            <Input
              id={`nama-${functionId}`}
              name="nama"
              placeholder="Contoh: API Register Temuan"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`endpoint-${functionId}`}>Endpoint (opsional)</Label>
            <Input
              id={`endpoint-${functionId}`}
              name="endpoint"
              placeholder="Contoh: /api/v1/temuan"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`status-${functionId}`}>Status</Label>
            <NativeSelect
              id={`status-${functionId}`}
              name="status"
              defaultValue="BELUM_TERSEDIA"
            >
              {Object.entries(FUNCTION_API_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`catatan-${functionId}`}>Catatan (opsional)</Label>
            <Input id={`catatan-${functionId}`} name="catatan" placeholder="Catatan singkat" />
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
  );
}

function ApiStatusSelect({
  apiId,
  status,
  disabled,
}: {
  apiId: string;
  status: FunctionApiStatus;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <NativeSelect
      value={status}
      disabled={disabled || pending}
      className="h-8 min-w-[170px]"
      onChange={(e) => {
        const next = e.target.value as FunctionApiStatus;
        startTransition(async () => {
          const result = await updateServiceFunctionApiStatus(apiId, next);
          if (result.success) {
            toast.success("Status API diperbarui");
            router.refresh();
          } else {
            toast.error(result.error ?? "Gagal memperbarui status");
          }
        });
      }}
    >
      {Object.entries(FUNCTION_API_STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </NativeSelect>
  );
}

export function ServiceFunctionApisPanel({
  fungsi,
  canEdit,
}: {
  fungsi: ServiceFunctionItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const totalApis = useMemo(
    () => fungsi.reduce((sum, fn) => sum + fn.apis.length, 0),
    [fungsi]
  );

  const toggleFunction = (functionId: string) => {
    setCollapsed((prev) => ({ ...prev, [functionId]: !prev[functionId] }));
  };

  const handleDelete = (apiId: string) => {
    if (!confirm("Yakin ingin menghapus API ini?")) return;
    setDeletingId(apiId);
    startTransition(async () => {
      const result = await deleteServiceFunctionApi(apiId);
      setDeletingId(null);
      if (result.success) {
        toast.success("API berhasil dihapus");
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal menghapus API");
      }
    });
  };

  if (fungsi.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fungsi & API Terkait</CardTitle>
          <CardDescription>
            Belum ada fungsi pada layanan ini. Tambahkan fungsi lewat form edit layanan.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderTree className="h-4 w-4 text-primary" />
              Fungsi & API Terkait
            </CardTitle>
            <CardDescription>
              {fungsi.length} fungsi · {totalApis} API
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No</TableHead>
                <TableHead>Hierarki Fungsi / API</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Catatan</TableHead>
                {canEdit && <TableHead className="w-[140px]">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {fungsi.map((fn, index) => {
                const isCollapsed = Boolean(collapsed[fn.id]);
                const hasApis = fn.apis.length > 0;

                return (
                  <Fragment key={fn.id}>
                    <TableRow className="bg-muted/40 hover:bg-muted/60">
                      <TableCell className="align-middle font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="align-middle">
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => toggleFunction(fn.id)}
                            className={cn(
                              "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-background",
                              "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            )}
                            aria-label={
                              isCollapsed ? "Perluas fungsi" : "Sembunyikan API"
                            }
                          >
                            {isCollapsed ? (
                              <ChevronRight className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">{fn.nama}</p>
                            <p className="text-xs text-muted-foreground">
                              Fungsi layanan · {fn.apis.length} API
                            </p>
                          </div>
                          <Badge variant="outline" className="ml-auto shrink-0">
                            Fungsi
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle text-muted-foreground">—</TableCell>
                      <TableCell className="align-middle text-muted-foreground">—</TableCell>
                      <TableCell className="align-middle text-muted-foreground">—</TableCell>
                      {canEdit && (
                        <TableCell className="align-middle">
                          <AddApiDialog functionId={fn.id} functionName={fn.nama} />
                        </TableCell>
                      )}
                    </TableRow>

                    {!isCollapsed &&
                      (hasApis ? (
                        fn.apis.map((api, apiIndex) => (
                          <TableRow key={api.id} className="bg-background">
                            <TableCell className="align-middle text-muted-foreground">
                              {index + 1}.{apiIndex + 1}
                            </TableCell>
                            <TableCell className="align-middle">
                              <div className="flex items-start gap-2 pl-8">
                                <CornerDownRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                                <div className="min-w-0">
                                  <p className="font-medium">{api.nama}</p>
                                  <p className="text-xs text-muted-foreground">
                                    API dari {fn.nama}
                                  </p>
                                </div>
                                <Badge variant="secondary" className="ml-auto shrink-0">
                                  API
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="align-middle font-mono text-xs text-muted-foreground">
                              {api.endpoint || "-"}
                            </TableCell>
                            <TableCell className="align-middle">
                              {canEdit ? (
                                <ApiStatusSelect apiId={api.id} status={api.status} />
                              ) : (
                                <Badge variant={statusBadgeVariant(api.status)}>
                                  {FUNCTION_API_STATUS_LABELS[api.status]}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate align-middle text-sm text-muted-foreground">
                              {api.catatan || "-"}
                            </TableCell>
                            {canEdit && (
                              <TableCell className="align-middle">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={pending && deletingId === api.id}
                                  onClick={() => handleDelete(api.id)}
                                >
                                  {pending && deletingId === api.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  )}
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell />
                          <TableCell
                            colSpan={canEdit ? 5 : 4}
                            className="pl-14 text-sm text-muted-foreground"
                          >
                            <div className="flex items-center gap-2">
                              <CornerDownRight className="h-4 w-4" />
                              Belum ada API untuk fungsi ini
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
