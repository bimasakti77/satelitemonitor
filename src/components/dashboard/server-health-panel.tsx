"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { ExternalLink, Loader2, RefreshCw, Server } from "lucide-react";
import { refreshServerHealthStatuses } from "@/lib/actions/server-health";
import type { ServerHealthResult, ServerHealthStatus } from "@/lib/server-health";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

interface ServerHealthPanelProps {
  initialHealth: ServerHealthResult[];
}

const STATUS_LABEL: Record<ServerHealthStatus, string> = {
  online: "Online",
  degraded: "Degraded",
  offline: "Offline",
};

const STATUS_VARIANT: Record<
  ServerHealthStatus,
  "success" | "warning" | "destructive"
> = {
  online: "success",
  degraded: "warning",
  offline: "destructive",
};

const STATUS_DOT: Record<ServerHealthStatus, string> = {
  online: "bg-emerald-500",
  degraded: "bg-amber-500",
  offline: "bg-red-500",
};

function formatCheckedAt(iso: string) {
  return formatDate(iso);
}

export function ServerHealthPanel({ initialHealth }: ServerHealthPanelProps) {
  const [health, setHealth] = useState(initialHealth);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      const result = await refreshServerHealthStatuses();
      if (result.success && result.data) {
        setHealth(result.data);
      } else if (!result.success) {
        toast.error(result.error);
      }
    });
  }, []);

  useEffect(() => {
    setHealth(initialHealth);
  }, [initialHealth]);

  useEffect(() => {
    const interval = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Server className="h-4 w-4 text-primary" />
              Status Server SuperApps
            </CardTitle>
            <CardDescription>
              Health check Development, Staging, dan Production
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Periksa Ulang
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-3">
          {health.map((item) => (
            <div
              key={item.key}
              className="rounded-xl border border-border bg-muted/20 p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{item.label}</p>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline break-all"
                  >
                    {item.url.replace(/^https:\/\//, "")}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
                <Badge variant={STATUS_VARIANT[item.status]}>
                  <span
                    className={`mr-1.5 inline-block h-2 w-2 rounded-full ${STATUS_DOT[item.status]}`}
                  />
                  {STATUS_LABEL[item.status]}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-background/80 px-2 py-1.5">
                  <p className="text-muted-foreground">HTTP</p>
                  <p className="font-medium">{item.statusCode ?? "—"}</p>
                </div>
                <div className="rounded-md bg-background/80 px-2 py-1.5">
                  <p className="text-muted-foreground">Respon</p>
                  <p className="font-medium">
                    {item.responseTimeMs != null ? `${item.responseTimeMs} ms` : "—"}
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                {item.message ?? "—"}
                <span className="block mt-1">
                  Dicek: {formatCheckedAt(item.checkedAt)}
                </span>
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
