"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DatabaseZap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractApplicationsFromServices } from "@/lib/actions/applications";

export function ExtractApplicationsButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const handleExtract = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    startTransition(async () => {
      const result = await extractApplicationsFromServices();
      setConfirming(false);

      if (!result.success || !result.data) {
        toast.error(
          !result.success
            ? (result.error ?? "Gagal mengekstrak data aplikasi")
            : "Gagal mengekstrak data aplikasi"
        );
        return;
      }

      const { count, publicCount, internalCount } = result.data;
      toast.success(
        `Berhasil generate ${count} aplikasi (${publicCount} publik, ${internalCount} internal)`
      );
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2">
      {confirming && !pending && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
        >
          Batal
        </Button>
      )}
      <Button
        type="button"
        variant={confirming ? "destructive" : "outline"}
        disabled={pending}
        onClick={handleExtract}
      >
        {pending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <DatabaseZap className="mr-2 h-4 w-4" />
        )}
        {pending
          ? "Mengekstrak..."
          : confirming
            ? "Ya, Truncate & Generate"
            : "Extract Data"}
      </Button>
    </div>
  );
}
