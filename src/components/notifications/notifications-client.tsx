"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { markAsRead, markAllAsRead } from "@/lib/actions/notifications";
import { formatDate } from "@/lib/utils";
import { Bell, CheckCheck } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  service: { jenisLayanan: string; uke: { code: string } | null } | null;
}

const typeVariant: Record<string, "default" | "success" | "warning" | "destructive"> = {
  NEW_SERVICE: "success",
  UPDATED_SERVICE: "default",
  DELETED_SERVICE: "destructive",
};

export function NotificationsClient({ notifications }: { notifications: Notification[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleMarkRead = (id: string) => {
    startTransition(async () => {
      await markAsRead(id);
      router.refresh();
    });
  };

  const handleMarkAll = () => {
    startTransition(async () => {
      await markAllAsRead();
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Notifikasi" description="Perubahan layanan terbaru">
        <Button variant="outline" onClick={handleMarkAll} disabled={pending}>
          <CheckCheck className="mr-2 h-4 w-4" />
          Tandai Semua Dibaca
        </Button>
      </PageHeader>

      <div className="space-y-2">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p>Tidak ada notifikasi</p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((n) => (
            <Card
              key={n.id}
              className={n.isRead ? "opacity-60" : "border-primary/30"}
            >
              <CardContent className="flex items-start gap-4 p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={typeVariant[n.type] ?? "secondary"}>
                      {n.type.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(n.createdAt)}
                    </span>
                  </div>
                  <p className="font-medium">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                  {n.service && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {n.service.uke?.code ?? "-"} • {n.service.jenisLayanan}
                    </p>
                  )}
                </div>
                {!n.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkRead(n.id)}
                    disabled={pending}
                  >
                    Tandai dibaca
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
