import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAuditLogs } from "@/lib/actions/audit";
import { requireRole } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export default async function AuditPage() {
  await requireRole(["ADMINISTRATOR", "EXECUTIVE"]);
  const { items } = await getAuditLogs({ pageSize: 50 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Catatan semua aktivitas pengguna"
      />
      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Pengguna</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead>Entitas</TableHead>
              <TableHead>ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Belum ada log
                </TableCell>
              </TableRow>
            ) : (
              items.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {formatDate(log.createdAt)}
                  </TableCell>
                  <TableCell>{log.user.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{ROLE_LABELS[log.user.role]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge>{log.action}</Badge>
                  </TableCell>
                  <TableCell>{log.entity}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.entityId?.slice(0, 8) ?? "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
