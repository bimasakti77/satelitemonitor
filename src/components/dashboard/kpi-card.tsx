import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatNumber, formatPercent } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  format?: "number" | "percent" | "raw";
  className?: string;
  onClick?: () => void;
}

export function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  format = "number",
  className,
  onClick,
}: KpiCardProps) {
  const displayValue =
    format === "percent" && typeof value === "number"
      ? formatPercent(value)
      : format === "number" && typeof value === "number"
        ? formatNumber(value)
        : value;

  const Component = onClick ? "button" : "div";

  return (
    <Card
      className={cn(
        "relative overflow-hidden text-left transition-colors",
        onClick && "cursor-pointer hover:border-primary/40 hover:bg-accent/30",
        className
      )}
    >
      <Component
        type={onClick ? "button" : undefined}
        onClick={onClick}
        className={cn("block w-full", onClick && "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl")}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="rounded-lg bg-primary/10 p-2">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">{displayValue}</div>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
          {onClick && (
            <p className="mt-2 text-[10px] text-primary/80">Klik untuk detail</p>
          )}
        </CardContent>
      </Component>
    </Card>
  );
}
