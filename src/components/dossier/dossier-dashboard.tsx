import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DOMAIN_PROGRESS_STATUS_LABELS,
  MATURITY_LEVEL_LABELS,
} from "@/lib/constants";
import { formatNumber, formatPercent } from "@/lib/utils";
import type { getDossierDashboardData } from "@/lib/actions/dossier";

type DashboardData = Awaited<ReturnType<typeof getDossierDashboardData>>;

function maturityColor(level: number) {
  if (level <= 0) return "bg-muted-foreground/40";
  if (level === 1) return "bg-red-500";
  if (level === 2) return "bg-amber-400";
  if (level === 3) return "bg-sky-500";
  if (level === 4) return "bg-emerald-400";
  return "bg-emerald-700";
}

function statusDot(status: keyof typeof DOMAIN_PROGRESS_STATUS_LABELS) {
  if (status === "VERY_HIGH") return "bg-red-500";
  if (status === "ACHIEVED") return "bg-emerald-500";
  return "bg-amber-400";
}

export function DossierDashboardView({ data }: { data: DashboardData }) {
  const { profile, assessments, indicators, roadmap, summary } = data;
  const maturityLabel =
    MATURITY_LEVEL_LABELS[Math.round(summary.maturityAvg)] ?? "Developing";

  const roadmapByYear = roadmap.reduce<Record<number, typeof roadmap>>(
    (acc, item) => {
      (acc[item.year] ??= []).push(item);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-background to-background p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Executive Baseline Dashboard · {profile.baselineYear}
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">{profile.title}</h2>
        {profile.subtitle && (
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {profile.subtitle}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Level Maturity Baseline</CardDescription>
            <CardTitle className="text-2xl">
              {summary.maturityAvg.toFixed(1)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {maturityLabel}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Layanan Terintegrasi</CardDescription>
            <CardTitle className="text-2xl">
              {formatNumber(summary.integratedServices)} /{" "}
              {formatNumber(summary.totalServices)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {formatPercent(summary.integratedPct)} sudah SuperApps
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Domain Dinilai</CardDescription>
            <CardTitle className="text-2xl">
              {formatNumber(summary.domainCount)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Domain prioritas
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Prioritas Sangat Tinggi</CardDescription>
            <CardTitle className="text-2xl">
              {formatNumber(summary.highPriorityCount)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Domain butuh perhatian segera
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Kelengkapan Dokumen</CardDescription>
            <CardTitle className="text-2xl">
              {formatNumber(summary.docsComplete)} /{" "}
              {formatNumber(summary.docsTotal)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Lengkap / terverifikasi
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Tingkat Kematangan Organisasi</CardTitle>
          <CardDescription>
            Skala 1–5 per domain berdasarkan dokumen dukungan (Tabel 5.1). Baseline{" "}
            {profile.baselineYear}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {assessments.map((a) => (
            <div key={a.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {a.domain.sortOrder}. {a.domain.name}
                </span>
                <span className="text-muted-foreground">
                  Level {a.maturityLevel} ·{" "}
                  {MATURITY_LEVEL_LABELS[a.maturityLevel] ?? "-"}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`h-2 rounded-full ${
                      level <= a.maturityLevel
                        ? maturityColor(a.maturityLevel)
                        : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Progress Integrasi Layanan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span>Kondisi Awal (Sudah SuperApps)</span>
                <span>
                  {formatNumber(summary.integratedServices)} (
                  {formatPercent(summary.integratedPct)})
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${summary.integratedPct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span>Belum SuperApps</span>
                <span>
                  {formatNumber(summary.totalServices - summary.integratedServices)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{
                    width: `${
                      summary.totalServices > 0
                        ? ((summary.totalServices - summary.integratedServices) /
                            summary.totalServices) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Indikator Utama</CardTitle>
          </CardHeader>
          <CardContent>
            {indicators.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada indikator. Tambahkan di menu Indikator Baseline.
              </p>
            ) : (
              <div className="space-y-3">
                {indicators.slice(0, 6).map((ind) => (
                  <div key={ind.id} className="rounded-lg border border-border p-3 text-sm">
                    <p className="font-medium">{ind.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Awal: {ind.baselineCondition}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Target: {ind.targetCondition}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">4. Status Perkembangan Domain</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium">Domain</th>
                  <th className="px-3 py-2 font-medium">Level</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((a) => (
                  <tr key={a.id} className="border-b border-border/70">
                    <td className="px-3 py-2">
                      {a.domain.sortOrder}. {a.domain.name}
                    </td>
                    <td className="px-3 py-2">{a.maturityLevel}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${statusDot(a.status)}`}
                        />
                        {DOMAIN_PROGRESS_STATUS_LABELS[a.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {a.remarks || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">5. Target Implementasi Domain</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {assessments.map((a) => (
              <div
                key={a.id}
                className="rounded-xl border border-border bg-muted/20 p-3 text-sm"
              >
                <p className="font-medium">{a.domain.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {a.targetText || "Target belum diisi"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            6. Roadmap Implementasi ({profile.baselineYear}–{profile.targetYear})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(roadmapByYear).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada roadmap. Tambahkan di menu Roadmap.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {Object.entries(roadmapByYear).map(([year, items]) => (
                <div key={year} className="rounded-xl border border-border p-4">
                  <Badge className="mb-3">{year}</Badge>
                  <ul className="space-y-2 text-sm">
                    {items.map((item) => (
                      <li key={item.id}>
                        <p className="font-medium">{item.title}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">7. Executive Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg border border-border p-3">
            <p className="text-muted-foreground">Rata-rata Maturity</p>
            <p className="mt-1 font-semibold">{summary.maturityAvg.toFixed(1)}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-muted-foreground">Domain Prioritas Tinggi</p>
            <p className="mt-1 font-semibold">
              {assessments
                .filter((a) => a.status === "VERY_HIGH")
                .map((a) => a.domain.name)
                .join(", ") || "-"}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-muted-foreground">Target Akhir</p>
            <p className="mt-1 font-semibold">
              Level {profile.targetMaturityLevel} (
              {MATURITY_LEVEL_LABELS[profile.targetMaturityLevel] ?? "-"}) by{" "}
              {profile.targetYear}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
