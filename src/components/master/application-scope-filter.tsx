"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type ApplicationScopeFilterValue = "all" | "public" | "internal";

interface ApplicationScopeFilterProps {
  value: ApplicationScopeFilterValue;
  onValueChange: (value: ApplicationScopeFilterValue) => void;
  counts?: {
    all: number;
    public: number;
    internal: number;
  };
  className?: string;
  listClassName?: string;
}

export function ApplicationScopeFilter({
  value,
  onValueChange,
  counts,
  className,
  listClassName,
}: ApplicationScopeFilterProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onValueChange(v as ApplicationScopeFilterValue)}
      className={className}
    >
      <TabsList className={cn("w-full justify-start", listClassName)}>
        <TabsTrigger value="all">
          Semua{counts ? ` (${counts.all})` : ""}
        </TabsTrigger>
        <TabsTrigger value="public">
          Aplikasi Layanan Publik{counts ? ` (${counts.public})` : ""}
        </TabsTrigger>
        <TabsTrigger value="internal">
          Internal{counts ? ` (${counts.internal})` : ""}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

export function filterByApplicationScope<T extends { isPublic?: boolean }>(
  items: T[],
  filter: ApplicationScopeFilterValue
): T[] {
  if (filter === "public") return items.filter((item) => item.isPublic === true);
  if (filter === "internal") return items.filter((item) => item.isPublic !== true);
  return items;
}

export function countByApplicationScope(items: { isPublic?: boolean }[]) {
  const publicCount = items.filter((item) => item.isPublic === true).length;
  return {
    all: items.length,
    public: publicCount,
    internal: items.length - publicCount,
  };
}
