"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown,
  Download,
  Eye,
  Lock,
  Pencil,
  Plus,
  Trash2,
  Unlock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DOMAIN_PROGRESS_STATUS_LABELS,
  MATURITY_LEVEL_LABELS,
  MATURITY_LEVEL_META,
} from "@/lib/constants";
import {
  deleteDomainLevelEvidence,
  updateDomainAssessment,
  updateDomainLevelEvidence,
  uploadDomainLevelEvidence,
} from "@/lib/actions/dossier";
import {
  computeMaturityFromEvidenceLevels,
  isDomainLevelUnlocked,
} from "@/lib/domain-maturity";
import type { DomainProgressStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

type Evidence = {
  id: string;
  level: number;
  title: string;
  notes: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string | Date;
};

type DomainRow = {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  assessments: {
    id: string;
    maturityLevel: number;
    status: DomainProgressStatus;
    remarks: string | null;
    targetText: string | null;
    evidences: Evidence[];
  }[];
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getPreviewKind(mimeType: string, filename: string) {
  const mime = (mimeType || "").toLowerCase();
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
    return "image" as const;
  }
  if (mime === "application/pdf" || ext === "pdf") {
    return "pdf" as const;
  }
  return "other" as const;
}

function evidenceUrl(id: string, mode: "view" | "download" = "download") {
  return `/api/dossier/domain-evidence/${id}?mode=${mode === "view" ? "view" : "download"}`;
}

export function DomainManager({
  year,
  domains,
  canEdit,
}: {
  year: number;
  domains: DomainRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [openDomainId, setOpenDomainId] = useState<string | null>(
    domains[0]?.id ?? null
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [drafts, setDrafts] = useState(() =>
    Object.fromEntries(
      domains.map((d) => {
        const a = d.assessments[0];
        return [
          a?.id ?? d.id,
          {
            status: a?.status ?? ("NEEDS_STRENGTHENING" as DomainProgressStatus),
            remarks: a?.remarks ?? "",
            targetText: a?.targetText ?? "",
          },
        ];
      })
    )
  );

  const [uploadOpen, setUploadOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Evidence | null>(null);
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(
    null
  );
  const [activeLevel, setActiveLevel] = useState<number>(1);
  const [editing, setEditing] = useState<Evidence | null>(null);

  const toggleDomain = (domainId: string) => {
    setOpenDomainId((prev) => (prev === domainId ? null : domainId));
  };

  const openPreview = (doc: Evidence) => {
    setPreviewDoc(doc);
    setPreviewOpen(true);
  };

  const saveMeta = (assessmentId: string) => {
    const draft = drafts[assessmentId];
    if (!draft) return;
    setPendingId(assessmentId);
    startTransition(async () => {
      const result = await updateDomainAssessment(assessmentId, {
        status: draft.status,
        remarks: draft.remarks || null,
        targetText: draft.targetText || null,
      });
      setPendingId(null);
      if (result.success) {
        toast.success("Meta domain disimpan");
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal menyimpan");
      }
    });
  };

  const onUpload = (formData: FormData) => {
    startTransition(async () => {
      const result = await uploadDomainLevelEvidence(formData);
      if (result.success) {
        toast.success(
          `Dokumen diunggah. Level kematangan sekarang: ${result.data?.maturityLevel ?? "-"}`
        );
        setUploadOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal unggah");
      }
    });
  };

  const onUpdate = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateDomainLevelEvidence(formData);
      if (result.success) {
        toast.success("Dokumen diperbarui");
        setEditOpen(false);
        setEditing(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal memperbarui");
      }
    });
  };

  const onDelete = (id: string) => {
    if (!confirm("Hapus dokumen dukungan ini?")) return;
    startTransition(async () => {
      const result = await deleteDomainLevelEvidence(id);
      if (result.success) {
        toast.success(
          `Dokumen dihapus. Level kematangan sekarang: ${result.data?.maturityLevel ?? 0}`
        );
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal menghapus");
      }
    });
  };

  const previewKind = previewDoc
    ? getPreviewKind(previewDoc.mimeType, previewDoc.originalName)
    : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Domain Prioritas · Baseline {year}
          </CardTitle>
          <CardDescription>
            Level kematangan dihitung dari dokumen dukungan per level (1–5).
            Level berikutnya terbuka setelah level sebelumnya punya dokumen.
            Klik header domain untuk membuka/menutup (hanya satu domain terbuka).
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="space-y-3">
        {domains.map((domain) => {
          const assessment = domain.assessments[0];
          if (!assessment) return null;
          const draft = drafts[assessment.id];
          if (!draft) return null;

          const isOpen = openDomainId === domain.id;
          const levelsWithDocs = new Set(
            assessment.evidences.map((e) => e.level)
          );
          const maturity = computeMaturityFromEvidenceLevels(levelsWithDocs);
          const docCount = assessment.evidences.length;

          return (
            <Card key={domain.id} className="overflow-hidden">
              <button
                type="button"
                onClick={() => toggleDomain(domain.id)}
                className="flex w-full items-start justify-between gap-3 px-6 py-4 text-left transition-colors hover:bg-muted/40"
                aria-expanded={isOpen}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold">
                      {domain.sortOrder}. {domain.name}
                    </p>
                    <Badge variant="outline">{domain.code}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Level saat ini:{" "}
                    <span className="font-medium text-foreground">
                      {maturity} — {MATURITY_LEVEL_LABELS[maturity]}
                    </span>
                    {docCount > 0 && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {docCount} dokumen
                      </span>
                    )}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </button>

              {isOpen && (
                <CardContent className="space-y-5 border-t border-border pt-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Status Perkembangan</Label>
                      {canEdit ? (
                        <NativeSelect
                          value={draft.status}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [assessment.id]: {
                                ...draft,
                                status: e.target.value as DomainProgressStatus,
                              },
                            }))
                          }
                        >
                          {Object.entries(DOMAIN_PROGRESS_STATUS_LABELS).map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            )
                          )}
                        </NativeSelect>
                      ) : (
                        <p className="text-sm font-medium">
                          {DOMAIN_PROGRESS_STATUS_LABELS[draft.status]}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Keterangan / Remarks</Label>
                      {canEdit ? (
                        <Input
                          value={draft.remarks}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [assessment.id]: {
                                ...draft,
                                remarks: e.target.value,
                              },
                            }))
                          }
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {draft.remarks || "-"}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Target Implementasi</Label>
                      {canEdit ? (
                        <Input
                          value={draft.targetText}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [assessment.id]: {
                                ...draft,
                                targetText: e.target.value,
                              },
                            }))
                          }
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {draft.targetText || "-"}
                        </p>
                      )}
                    </div>
                    {canEdit && (
                      <div className="md:col-span-2">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={pending && pendingId === assessment.id}
                          onClick={() => saveMeta(assessment.id)}
                        >
                          {pending && pendingId === assessment.id
                            ? "Menyimpan..."
                            : "Simpan Status & Target"}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium">
                      Dokumen Dukungan per Level
                    </p>
                    {([1, 2, 3, 4, 5] as const).map((level) => {
                      const meta = MATURITY_LEVEL_META[level];
                      const unlocked = isDomainLevelUnlocked(
                        level,
                        levelsWithDocs
                      );
                      const docs = assessment.evidences.filter(
                        (e) => e.level === level
                      );
                      const complete = docs.length > 0;

                      return (
                        <div
                          key={level}
                          className={cn(
                            "rounded-xl border p-3",
                            unlocked
                              ? "border-border bg-background"
                              : "border-dashed border-border/70 bg-muted/30 opacity-80"
                          )}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold">
                                  Level {level} — {meta.kategori}
                                </p>
                                {unlocked ? (
                                  <Badge variant="outline" className="gap-1">
                                    <Unlock className="h-3 w-3" />
                                    Terbuka
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="gap-1">
                                    <Lock className="h-3 w-3" />
                                    Terkunci
                                  </Badge>
                                )}
                                {complete && (
                                  <Badge className="bg-emerald-600 hover:bg-emerald-600">
                                    Ada dokumen
                                  </Badge>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {meta.karakteristik}
                              </p>
                            </div>
                            {canEdit && unlocked && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  setActiveAssessmentId(assessment.id);
                                  setActiveLevel(level);
                                  setUploadOpen(true);
                                }}
                              >
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                Unggah
                              </Button>
                            )}
                          </div>

                          {!unlocked && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Unggah dokumen Level {level - 1} terlebih dahulu
                              untuk membuka level ini.
                            </p>
                          )}

                          {docs.length > 0 && (
                            <ul className="mt-3 space-y-2">
                              {docs.map((doc) => (
                                <li
                                  key={doc.id}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 px-3 py-2 text-sm"
                                >
                                  <button
                                    type="button"
                                    onClick={() => openPreview(doc)}
                                    className="min-w-0 flex-1 text-left hover:underline"
                                  >
                                    <p className="font-medium">{doc.title}</p>
                                    <p className="truncate text-xs text-muted-foreground">
                                      {doc.originalName} ·{" "}
                                      {formatSize(doc.sizeBytes)}
                                      {doc.notes ? ` · ${doc.notes}` : ""}
                                    </p>
                                  </button>
                                  <div className="flex gap-1">
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      title="Lihat"
                                      onClick={() => openPreview(doc)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      asChild
                                    >
                                      <a
                                        href={evidenceUrl(doc.id, "download")}
                                        title="Unduh"
                                      >
                                        <Download className="h-4 w-4" />
                                      </a>
                                    </Button>
                                    {canEdit && unlocked && (
                                      <>
                                        <Button
                                          type="button"
                                          size="icon"
                                          variant="ghost"
                                          onClick={() => {
                                            setEditing(doc);
                                            setEditOpen(true);
                                          }}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          type="button"
                                          size="icon"
                                          variant="ghost"
                                          disabled={pending}
                                          onClick={() => onDelete(doc.id)}
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Unggah Dokumen · Level {activeLevel} —{" "}
              {MATURITY_LEVEL_META[activeLevel as 1 | 2 | 3 | 4 | 5]?.kategori}
            </DialogTitle>
          </DialogHeader>
          <form action={onUpload} className="space-y-4">
            <input
              type="hidden"
              name="assessmentId"
              value={activeAssessmentId ?? ""}
            />
            <input type="hidden" name="level" value={activeLevel} />
            <div className="space-y-2">
              <Label htmlFor="title">Judul dokumen</Label>
              <Input
                id="title"
                name="title"
                required
                placeholder="Contoh: SOP Domain"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Catatan</Label>
              <Input id="notes" name="notes" placeholder="Opsional" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <Input id="file" name="file" type="file" required />
              <p className="text-xs text-muted-foreground">
                PDF/Office/Gambar/ZIP, maks. 15 MB. Disimpan di
                /app/data/domain-dukung
              </p>
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Mengunggah..." : "Unggah"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Dokumen Dukungan</DialogTitle>
          </DialogHeader>
          {editing && (
            <form action={onUpdate} className="space-y-4">
              <input type="hidden" name="id" value={editing.id} />
              <div className="space-y-2">
                <Label htmlFor="edit-title">Judul dokumen</Label>
                <Input
                  id="edit-title"
                  name="title"
                  required
                  defaultValue={editing.title}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Catatan</Label>
                <Input
                  id="edit-notes"
                  name="notes"
                  defaultValue={editing.notes ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-file">Ganti file (opsional)</Label>
                <Input id="edit-file" name="file" type="file" />
                <p className="text-xs text-muted-foreground">
                  File saat ini: {editing.originalName}
                </p>
              </div>
              <Button type="submit" disabled={pending}>
                {pending ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) setPreviewDoc(null);
        }}
      >
        <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-4">
          <DialogHeader>
            <DialogTitle className="pr-8">
              {previewDoc?.title ?? "Pratinjau dokumen"}
            </DialogTitle>
            {previewDoc && (
              <p className="text-sm text-muted-foreground">
                {previewDoc.originalName} · {formatSize(previewDoc.sizeBytes)}
                {previewDoc.notes ? ` · ${previewDoc.notes}` : ""}
              </p>
            )}
          </DialogHeader>

          <div className="min-h-[280px] flex-1 overflow-hidden rounded-lg border border-border bg-muted/20">
            {previewDoc && previewKind === "image" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={evidenceUrl(previewDoc.id, "view")}
                alt={previewDoc.title}
                className="mx-auto max-h-[60vh] w-auto object-contain p-2"
              />
            )}
            {previewDoc && previewKind === "pdf" && (
              <iframe
                title={previewDoc.title}
                src={evidenceUrl(previewDoc.id, "view")}
                className="h-[60vh] w-full"
              />
            )}
            {previewDoc && previewKind === "other" && (
              <div className="flex h-[280px] flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Pratinjau tidak tersedia untuk tipe file ini. Unduh file untuk
                  membukanya di aplikasi terkait.
                </p>
                <p className="text-xs text-muted-foreground">
                  {previewDoc.mimeType || "unknown"} · {previewDoc.originalName}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewOpen(false)}
            >
              Tutup
            </Button>
            {previewDoc && (
              <Button type="button" asChild>
                <a href={evidenceUrl(previewDoc.id, "download")}>
                  <Download className="mr-2 h-4 w-4" />
                  Unduh
                </a>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
