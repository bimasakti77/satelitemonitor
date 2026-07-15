"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  LabelList,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CHART_COLORS, INTEGRATION_LABELS } from "@/lib/constants";
import type { LabelProps } from "recharts";

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function ChartCard({
  title,
  description,
  children,
  className,
  contentClassName,
}: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className={contentClassName ?? "h-[300px]"}>{children}</CardContent>
    </Card>
  );
}

interface BarChartData {
  name: string;
  count: number;
  fullName?: string;
}

export function ServicesBarChart({ data }: { data: BarChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11 }}
          className="fill-muted-foreground"
        />
        <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value, _name, props) => [
            value,
            (props.payload as BarChartData).fullName ?? "Layanan",
          ]}
        />
        <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function YearBarChart({ data }: { data: { year: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
        <XAxis dataKey="year" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="count" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PieChartView({ data }: { data: { name: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey="count"
          nameKey="name"
        >
          {data.map((_, index) => (
            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MonthlyChangesChart({
  data,
}: {
  data: { month: string; created: number; updated: number; deleted: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="created" stroke={CHART_COLORS[3]} strokeWidth={2} name="Baru" />
        <Line type="monotone" dataKey="updated" stroke={CHART_COLORS[0]} strokeWidth={2} name="Update" />
        <Line type="monotone" dataKey="deleted" stroke={CHART_COLORS[5]} strokeWidth={2} name="Hapus" />
      </LineChart>
    </ResponsiveContainer>
  );
}

const QUARTER_COLORS: Record<string, string> = {
  Q1: "#22c55e",
  Q2: "#f59e0b",
  Q3: "#3b82f6",
};

const CHART_COUNT_LABEL_COLOR = "#111827";

const countLabelProps = {
  fill: CHART_COUNT_LABEL_COLOR,
  fontSize: 11,
  fontWeight: 600,
} as const;

function createIntegrationSegmentLabel(dataKey: "Q1" | "Q2" | "Q3") {
  return (props: LabelProps) => {
    const x = Number(props.x ?? 0);
    const y = Number(props.y ?? 0);
    const width = Number(props.width ?? 0);
    const height = Number(props.height ?? 0);
    const payload = (props as LabelProps & { payload?: { Q1?: number; Q2?: number; Q3?: number } })
      .payload;
    const count = payload?.[dataKey];
    if (!count || width < 18) {
      return <g />;
    }

    return (
      <text
        x={x + width / 2}
        y={y + height / 2}
        fill={CHART_COUNT_LABEL_COLOR}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={10}
        fontWeight={700}
      >
        {count}
      </text>
    );
  };
}

export function ExecutiveUkeChart({
  data,
}: {
  data: { code: string; name: string; count: number }[];
}) {
  const chartData = [...data].sort((a, b) => a.count - b.count);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.4} horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="code"
          width={52}
          tick={{ fontSize: 11, fontWeight: 600 }}
          className="fill-foreground"
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--accent))", opacity: 0.4 }}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "10px",
            fontSize: "12px",
          }}
          formatter={(value, _name, props) => [
            `${value} layanan`,
            (props.payload as { name: string }).name,
          ]}
        />
        <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={22}>
          <LabelList dataKey="count" position="right" {...countLabelProps} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function IntegrationQuarterChart({
  data,
  onBarClick,
}: {
  data: { key: string; label: string; count: number }[];
  onBarClick?: (entry: { key: string; label: string; count: number }) => void;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.4} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: "hsl(var(--accent))", opacity: 0.35 }}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "10px",
            fontSize: "12px",
          }}
          formatter={(value) => [`${value} layanan`, "Jumlah"]}
        />
        <Bar
          dataKey="count"
          radius={[8, 8, 0, 0]}
          barSize={48}
          cursor={onBarClick ? "pointer" : undefined}
          onClick={(state) => {
            if (!onBarClick) return;
            const payload = state?.payload as
              | { key: string; label: string; count: number }
              | undefined;
            if (payload?.key) onBarClick(payload);
          }}
        >
          {data.map((entry) => (
            <Cell key={entry.key} fill={QUARTER_COLORS[entry.key] ?? CHART_COLORS[0]} />
          ))}
          <LabelList dataKey="count" position="top" offset={8} {...countLabelProps} fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function IntegrationByUkeChart({
  data,
}: {
  data: {
    code: string;
    name: string;
    totalJenis: number;
    Q1: number;
    Q2: number;
    Q3: number;
    Q1Pct: number;
    Q2Pct: number;
    Q3Pct: number;
  }[];
}) {
  const chartData = [...data].sort((a, b) => a.totalJenis - b.totalJenis);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          className="stroke-border"
          opacity={0.4}
          horizontal={false}
        />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="code"
          width={52}
          tick={{ fontSize: 11, fontWeight: 600 }}
          className="fill-foreground"
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--accent))", opacity: 0.4 }}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "10px",
            fontSize: "12px",
          }}
          labelFormatter={(_label, payload) => {
            const row = payload?.[0]?.payload as
              | { name?: string; code?: string; totalJenis?: number }
              | undefined;
            const title = row?.name ?? row?.code ?? "";
            return row?.totalJenis
              ? `${title} (${row.totalJenis} jenis layanan)`
              : title;
          }}
          formatter={(value, name, props) => {
            const row = props.payload as { Q1: number; Q2: number; Q3: number };
            const count =
              name === "Q1Pct" ? row.Q1 : name === "Q2Pct" ? row.Q2 : row.Q3;
            const label =
              INTEGRATION_LABELS[
                String(name).replace("Pct", "") as keyof typeof INTEGRATION_LABELS
              ] ?? name;
            return [`${value}% (${count} jenis)`, label];
          }}
        />
        <Legend
          formatter={(value) =>
            INTEGRATION_LABELS[value.replace("Pct", "") as keyof typeof INTEGRATION_LABELS] ??
            value
          }
        />
        <Bar dataKey="Q1Pct" name="Q1Pct" stackId="uke" fill={QUARTER_COLORS.Q1} barSize={22}>
          <LabelList content={createIntegrationSegmentLabel("Q1")} />
        </Bar>
        <Bar dataKey="Q2Pct" name="Q2Pct" stackId="uke" fill={QUARTER_COLORS.Q2} barSize={22}>
          <LabelList content={createIntegrationSegmentLabel("Q2")} />
        </Bar>
        <Bar
          dataKey="Q3Pct"
          name="Q3Pct"
          stackId="uke"
          fill={QUARTER_COLORS.Q3}
          radius={[0, 6, 6, 0]}
          barSize={22}
        >
          <LabelList content={createIntegrationSegmentLabel("Q3")} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
