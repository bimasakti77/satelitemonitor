import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { GitCommit, Plus, Pencil, Trash2 } from "lucide-react";
import type { HistoryAction } from "@prisma/client";

interface HistoryItem {
  id: string;
  action: HistoryAction;
  fieldName: string | null;
  previousValue: string | null;
  newValue: string | null;
  createdAt: Date;
  user: { name: string; email: string };
}

const actionConfig: Record<
  HistoryAction,
  { icon: typeof Plus; label: string; color: string }
> = {
  CREATED: { icon: Plus, label: "Dibuat", color: "text-emerald-500" },
  UPDATED: { icon: Pencil, label: "Diperbarui", color: "text-blue-500" },
  DELETED: { icon: Trash2, label: "Dihapus", color: "text-red-500" },
};

export function ServiceTimeline({ histories }: { histories: HistoryItem[] }) {
  if (histories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <GitCommit className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">Belum ada riwayat perubahan</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
      <div className="space-y-6">
        {histories.map((h) => {
          const config = actionConfig[h.action];
          const Icon = config.icon;
          return (
            <div key={h.id} className="relative flex gap-4 pl-10">
              <div
                className={`absolute left-2.5 flex h-3 w-3 items-center justify-center rounded-full border-2 border-background bg-card ${config.color}`}
              >
                <div className="h-1.5 w-1.5 rounded-full bg-current" />
              </div>
              <div className="flex-1 rounded-lg border border-border bg-card/50 p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  <span className="text-sm font-medium">{config.label}</span>
                  {h.fieldName && (
                    <Badge variant="secondary" className="text-xs">
                      {h.fieldName}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formatDate(h.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  oleh <span className="font-medium text-foreground">{h.user.name}</span>
                </p>
                {h.previousValue !== null && h.newValue !== null && (
                  <div className="mt-2 rounded-md bg-muted/50 p-3 font-mono text-xs space-y-1">
                    <div className="text-red-500/80 line-through">{h.previousValue || "(kosong)"}</div>
                    <div className="text-emerald-500/80">{h.newValue || "(kosong)"}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
