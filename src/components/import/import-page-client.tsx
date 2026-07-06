"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, CheckCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { previewImport, commitImport, rollbackImport, downloadImportTemplate } from "@/lib/actions/import";
import type { ImportRow } from "@/lib/actions/import";
import type { ActionResult } from "@/lib/actions/auth";
import { formatDate } from "@/lib/utils";

interface ImportPageClientProps {
  imports: {
    id: string;
    filename: string;
    status: string;
    totalRows: number;
    insertedCount: number;
    updatedCount: number;
    errorCount: number;
    createdAt: Date;
    user: { name: string };
  }[];
  isAdmin: boolean;
  rollbackableImportId: string | null;
}

const statusBadge: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  PREVIEW: "warning",
  COMMITTED: "success",
  ROLLED_BACK: "secondary",
  FAILED: "destructive",
};

const rowStatusBadge: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  new: "success",
  update: "default",
  duplicate: "warning",
  error: "destructive",
};

export function ImportPageClient({ imports, isAdmin, rollbackableImportId }: ImportPageClientProps) {
  const router = useRouter();
  const [preview, setPreview] = useState<{ importId: string; rows: ImportRow[] } | null>(null);

  const [state, formAction, pending] = useActionState(
    async (prev: ActionResult<{ importId: string; rows: ImportRow[] }>, formData: FormData) => {
      const result = await previewImport(prev, formData);
      if (result.success && result.data) {
        setPreview(result.data);
        toast.success("Preview siap");
      } else if (!result.success) {
        toast.error(result.error);
      }
      return result;
    },
    { success: false, error: "" }
  );

  const handleCommit = async () => {
    if (!preview) return;
    const result = await commitImport(preview.importId);
    if (result.success) {
      toast.success("Import berhasil");
      setPreview(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleRollback = async (importId: string) => {
    if (!confirm("Yakin ingin rollback import ini?")) return;
    const result = await rollbackImport(importId);
    if (result.success) {
      const { deleted = 0, restored = 0, skipped = 0 } = result.data ?? {};
      const parts = [];
      if (deleted > 0) parts.push(`${deleted} layanan dihapus`);
      if (restored > 0) parts.push(`${restored} layanan dikembalikan`);
      if (skipped > 0) parts.push(`${skipped} dilewati (sudah tidak ada)`);
      toast.success(parts.length > 0 ? `Rollback: ${parts.join(", ")}` : "Rollback berhasil");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleDownloadTemplate = async () => {
    const result = await downloadImportTemplate();
    if (!result.success || !result.data) {
      toast.error(result.error ?? "Gagal mengunduh template");
      return;
    }

    const bytes = Uint8Array.from(atob(result.data.base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.data.filename;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Template berhasil diunduh");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Spreadsheet
          </CardTitle>
          <CardDescription>
            Unggah file Excel (.xlsx) untuk import data layanan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Unduh Template Excel
            </Button>
            <p className="text-sm text-muted-foreground">
              Format standar dengan 1 baris contoh data layanan
            </p>
          </div>
          <form action={formAction} className="space-y-4">
            <div className="flex items-center gap-4">
              <Input type="file" name="file" accept=".xlsx,.xls" required />
              <Button type="submit" disabled={pending}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Preview
              </Button>
            </div>
            {!state.success && state.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
          </form>
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Preview Import</CardTitle>
                <CardDescription>
                  {preview.rows.filter((r) => r.status === "new").length} baru,{" "}
                  {preview.rows.filter((r) => r.status === "update").length} update,{" "}
                  {preview.rows.filter((r) => r.status === "error").length} error
                </CardDescription>
              </div>
              <Button onClick={handleCommit}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Commit Import
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Baris</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Jenis Layanan</TableHead>
                    <TableHead>Unit Kerja / UKE</TableHead>
                    <TableHead>Kelompok Layanan</TableHead>
                    <TableHead>Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((row) => (
                    <TableRow key={row.rowNumber}>
                      <TableCell>{row.rowNumber}</TableCell>
                      <TableCell>
                        <Badge variant={rowStatusBadge[row.status]}>{row.status}</Badge>
                      </TableCell>
                      <TableCell>{row.jenisLayanan}</TableCell>
                      <TableCell>{row.unitKerja || row.ukeCode || "-"}</TableCell>
                      <TableCell>{row.kelompokLayanan}</TableCell>
                      <TableCell className="text-xs text-destructive">
                        {row.errors.join(", ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Import</CardTitle>
          <CardDescription>
            Rollback hanya tersedia untuk import terakhir yang di-commit (urutan LIFO).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Baris</TableHead>
                <TableHead>Insert</TableHead>
                <TableHead>Update</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>Oleh</TableHead>
                <TableHead>Tanggal</TableHead>
                {isAdmin && <TableHead>Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {imports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Belum ada import
                  </TableCell>
                </TableRow>
              ) : (
                imports.map((imp) => (
                  <TableRow key={imp.id}>
                    <TableCell className="font-medium">{imp.filename}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadge[imp.status] ?? "secondary"}>
                        {imp.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{imp.totalRows}</TableCell>
                    <TableCell>{imp.insertedCount}</TableCell>
                    <TableCell>{imp.updatedCount}</TableCell>
                    <TableCell>{imp.errorCount}</TableCell>
                    <TableCell>{imp.user.name}</TableCell>
                    <TableCell className="text-xs">{formatDate(imp.createdAt)}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        {imp.status === "COMMITTED" && imp.id === rollbackableImportId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRollback(imp.id)}
                          >
                            Rollback
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
