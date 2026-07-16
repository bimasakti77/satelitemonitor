"use client";

import { useActionState, useState, useTransition } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DOCUMENT_COMPLETENESS_LABELS,
  DOSSIER_DOCUMENT_CATEGORIES,
  DOSSIER_TEAM_TYPE_LABELS,
} from "@/lib/constants";
import {
  deleteDossierDocument,
  deleteDossierTeamMember,
  updateProjectProfile,
  upsertDossierDocumentMeta,
  upsertDossierTeamMember,
} from "@/lib/actions/dossier";
import type { ActionResult } from "@/lib/actions/auth";
import type { DocumentCompleteness, DossierTeamType } from "@prisma/client";

type Profile = {
  id: string;
  title: string;
  subtitle: string | null;
  background: string | null;
  baselineYear: number;
  targetYear: number;
  targetMaturityLevel: number;
};

type TeamMember = {
  id: string;
  name: string;
  roleTitle: string;
  unit: string | null;
  teamType: DossierTeamType;
  sortOrder: number;
};

type DocumentItem = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  completeness: DocumentCompleteness;
  notes: string | null;
  sortOrder: number;
};

export function DokumenManager({
  profile,
  team,
  documents,
  canEdit,
}: {
  profile: Profile | null;
  team: TeamMember[];
  documents: DocumentItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [teamOpen, setTeamOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamMember | null>(null);
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [pendingDelete, startDelete] = useTransition();

  const [profileState, profileAction, profilePending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await updateProjectProfile(prev, formData);
      if (result.success) {
        toast.success("Profil proyek disimpan");
        router.refresh();
      } else toast.error(result.error ?? "Gagal menyimpan");
      return result;
    },
    { success: false, error: "" } as ActionResult
  );

  const [teamState, teamAction, teamPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await upsertDossierTeamMember(prev, formData);
      if (result.success) {
        toast.success(editingTeam ? "Anggota diperbarui" : "Anggota ditambahkan");
        setTeamOpen(false);
        setEditingTeam(null);
        router.refresh();
      } else toast.error(result.error ?? "Gagal menyimpan");
      return result;
    },
    { success: false, error: "" } as ActionResult
  );

  const [docState, docAction, docPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await upsertDossierDocumentMeta(prev, formData);
      if (result.success) {
        toast.success(editingDoc ? "Dokumen diperbarui" : "Dokumen ditambahkan");
        setDocOpen(false);
        setEditingDoc(null);
        router.refresh();
      } else toast.error(result.error ?? "Gagal menyimpan");
      return result;
    },
    { success: false, error: "" } as ActionResult
  );

  const completeCount = documents.filter(
    (d) => d.completeness === "COMPLETE" || d.completeness === "VERIFIED"
  ).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profil Proyek</CardTitle>
          <CardDescription>
            Latar belakang, baseline year, dan target kematangan
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profile ? (
            canEdit ? (
              <form action={profileAction} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="title">Judul</Label>
                  <Input id="title" name="title" required defaultValue={profile.title} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="subtitle">Subtitle</Label>
                  <Input
                    id="subtitle"
                    name="subtitle"
                    defaultValue={profile.subtitle ?? ""}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="background">Latar Belakang</Label>
                  <Input
                    id="background"
                    name="background"
                    defaultValue={profile.background ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="baselineYear">Baseline Year</Label>
                  <Input
                    id="baselineYear"
                    name="baselineYear"
                    type="number"
                    defaultValue={profile.baselineYear}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetYear">Target Year</Label>
                  <Input
                    id="targetYear"
                    name="targetYear"
                    type="number"
                    defaultValue={profile.targetYear}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetMaturityLevel">Target Maturity Level</Label>
                  <NativeSelect
                    id="targetMaturityLevel"
                    name="targetMaturityLevel"
                    defaultValue={String(profile.targetMaturityLevel)}
                  >
                    {[1, 2, 3, 4, 5].map((level) => (
                      <option key={level} value={level}>
                        Level {level}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={profilePending}>
                    {profilePending ? "Menyimpan..." : "Simpan Profil"}
                  </Button>
                </div>
                {!profileState.success && profileState.error && (
                  <p className="text-sm text-destructive md:col-span-2">
                    {profileState.error}
                  </p>
                )}
              </form>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="font-semibold">{profile.title}</p>
                {profile.subtitle && (
                  <p className="text-muted-foreground">{profile.subtitle}</p>
                )}
                {profile.background && (
                  <p className="text-muted-foreground">{profile.background}</p>
                )}
                <p>
                  Baseline {profile.baselineYear} → Target Level{" "}
                  {profile.targetMaturityLevel} ({profile.targetYear})
                </p>
              </div>
            )
          ) : (
            <p className="text-sm text-muted-foreground">Profil belum tersedia</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Struktur Tim</CardTitle>
              <CardDescription>Anggota Tim & Tim Pelaksana</CardDescription>
            </div>
            {canEdit && (
              <Dialog
                open={teamOpen}
                onOpenChange={(next) => {
                  setTeamOpen(next);
                  if (!next) setEditingTeam(null);
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    onClick={() => {
                      setEditingTeam(null);
                      setTeamOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Anggota
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingTeam ? "Edit Anggota" : "Tambah Anggota"}
                    </DialogTitle>
                  </DialogHeader>
                  <form action={teamAction} className="space-y-4">
                    {editingTeam && (
                      <input type="hidden" name="id" value={editingTeam.id} />
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="name">Nama</Label>
                      <Input
                        id="name"
                        name="name"
                        required
                        defaultValue={editingTeam?.name ?? ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="roleTitle">Peran / Jabatan</Label>
                      <Input
                        id="roleTitle"
                        name="roleTitle"
                        required
                        defaultValue={editingTeam?.roleTitle ?? ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit">Unit</Label>
                      <Input
                        id="unit"
                        name="unit"
                        defaultValue={editingTeam?.unit ?? ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="teamType">Tipe Tim</Label>
                      <NativeSelect
                        id="teamType"
                        name="teamType"
                        defaultValue={editingTeam?.teamType ?? "STEERING"}
                      >
                        {Object.entries(DOSSIER_TEAM_TYPE_LABELS).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          )
                        )}
                      </NativeSelect>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sortOrder">Urutan</Label>
                      <Input
                        id="sortOrder"
                        name="sortOrder"
                        type="number"
                        defaultValue={editingTeam?.sortOrder ?? 0}
                      />
                    </div>
                    {!teamState.success && teamState.error && (
                      <p className="text-sm text-destructive">{teamState.error}</p>
                    )}
                    <Button type="submit" disabled={teamPending}>
                      {teamPending ? "Menyimpan..." : "Simpan"}
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
                  <TableHead>Nama</TableHead>
                  <TableHead>Peran</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Tim</TableHead>
                  {canEdit && <TableHead>Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={canEdit ? 5 : 4}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Belum ada anggota tim
                    </TableCell>
                  </TableRow>
                ) : (
                  team.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>{member.roleTitle}</TableCell>
                      <TableCell>{member.unit || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {DOSSIER_TEAM_TYPE_LABELS[member.teamType]}
                        </Badge>
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingTeam(member);
                                setTeamOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              disabled={pendingDelete}
                              onClick={() => {
                                if (!confirm("Nonaktifkan anggota ini?")) return;
                                startDelete(async () => {
                                  const result = await deleteDossierTeamMember(
                                    member.id
                                  );
                                  if (result.success) {
                                    toast.success("Anggota dihapus");
                                    router.refresh();
                                  } else toast.error(result.error ?? "Gagal");
                                });
                              }}
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

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Checklist Kelengkapan Dokumen</CardTitle>
              <CardDescription>
                {completeCount}/{documents.length} dokumen lengkap/terverifikasi
              </CardDescription>
            </div>
            {canEdit && (
              <Dialog
                open={docOpen}
                onOpenChange={(next) => {
                  setDocOpen(next);
                  if (!next) setEditingDoc(null);
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    onClick={() => {
                      setEditingDoc(null);
                      setDocOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Dokumen
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingDoc ? "Edit Dokumen" : "Tambah Dokumen"}
                    </DialogTitle>
                  </DialogHeader>
                  <form action={docAction} className="space-y-4">
                    {editingDoc && (
                      <input type="hidden" name="id" value={editingDoc.id} />
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="category">Kategori</Label>
                      <NativeSelect
                        id="category"
                        name="category"
                        defaultValue={
                          editingDoc?.category ?? DOSSIER_DOCUMENT_CATEGORIES[0]
                        }
                      >
                        {DOSSIER_DOCUMENT_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
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
                        defaultValue={editingDoc?.title ?? ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Deskripsi</Label>
                      <Input
                        id="description"
                        name="description"
                        defaultValue={editingDoc?.description ?? ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="completeness">Kelengkapan</Label>
                      <NativeSelect
                        id="completeness"
                        name="completeness"
                        defaultValue={editingDoc?.completeness ?? "NOT_AVAILABLE"}
                      >
                        {Object.entries(DOCUMENT_COMPLETENESS_LABELS).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          )
                        )}
                      </NativeSelect>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Catatan</Label>
                      <Input
                        id="notes"
                        name="notes"
                        defaultValue={editingDoc?.notes ?? ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sortOrder">Urutan</Label>
                      <Input
                        id="sortOrder"
                        name="sortOrder"
                        type="number"
                        defaultValue={editingDoc?.sortOrder ?? 0}
                      />
                    </div>
                    {!docState.success && docState.error && (
                      <p className="text-sm text-destructive">{docState.error}</p>
                    )}
                    <Button type="submit" disabled={docPending}>
                      {docPending ? "Menyimpan..." : "Simpan"}
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
                  <TableHead>Kategori</TableHead>
                  <TableHead>Judul</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Catatan</TableHead>
                  {canEdit && <TableHead>Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={canEdit ? 5 : 4}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Belum ada dokumen
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>{doc.category}</TableCell>
                      <TableCell className="font-medium">{doc.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {DOCUMENT_COMPLETENESS_LABELS[doc.completeness]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {doc.notes || "-"}
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingDoc(doc);
                                setDocOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              disabled={pendingDelete}
                              onClick={() => {
                                if (!confirm("Nonaktifkan dokumen ini?")) return;
                                startDelete(async () => {
                                  const result = await deleteDossierDocument(doc.id);
                                  if (result.success) {
                                    toast.success("Dokumen dihapus");
                                    router.refresh();
                                  } else toast.error(result.error ?? "Gagal");
                                });
                              }}
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
    </div>
  );
}
