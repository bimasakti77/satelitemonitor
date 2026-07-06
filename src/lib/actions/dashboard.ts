"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { INTEGRATION_LABELS } from "@/lib/constants";
import type { IntegrationReadiness, Prisma, ServiceScope } from "@prisma/client";

export interface DashboardFilters {
  tahunPekerjaan?: number;
  ukeId?: string;
}

export interface DashboardServiceItem {
  id: string;
  jenisLayanan: string;
  kelompokLayanan: string;
  tahunPekerjaan: number;
  scope: ServiceScope;
  kesiapanIntegrasi: IntegrationReadiness;
  sudahSuperApps: boolean;
  ukeCode: string | null;
  ukeName: string | null;
}

export interface DashboardUkeGroup {
  ukeId: string | null;
  code: string;
  name: string;
  count: number;
  services: DashboardServiceItem[];
}

export interface DashboardIntegrationGroup {
  key: IntegrationReadiness;
  label: string;
  count: number;
  services: DashboardServiceItem[];
}

export interface ExecutiveDashboardData {
  years: number[];
  summary: {
    totalServices: number;
    totalKelompok: number;
    totalJenisLayanan: number;
  };
  chartByUke: { code: string; name: string; count: number }[];
  jenisLayananByUke: { code: string; name: string; count: number }[];
  chartByIntegration: { key: "Q1" | "Q2" | "Q3"; label: string; count: number }[];
  chartIntegrationByUke: {
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
  services: DashboardServiceItem[];
}

const INTEGRATION_CHART_ORDER = ["Q1", "Q2", "Q3"] as const;

/** Unik per kombinasi kelompok + jenis (nama jenis bisa sama di kelompok berbeda). */
function jenisLayananDistinctKey(kelompokLayanan: string, jenisLayanan: string): string {
  return `${kelompokLayanan.toLowerCase().trim()}|${jenisLayanan.toLowerCase().trim()}`;
}

function buildServiceWhere(filters: DashboardFilters): Prisma.ServiceWhereInput {
  return {
    isDeleted: false,
    sudahSuperApps: false,
    ...(filters.ukeId ? { ukeId: filters.ukeId } : {}),
    ...(filters.tahunPekerjaan ? { tahunPekerjaan: filters.tahunPekerjaan } : {}),
  };
}

function mapService(
  s: {
    id: string;
    jenisLayanan: string;
    kelompokLayanan: string;
    tahunPekerjaan: number;
    scope: ServiceScope;
    kesiapanIntegrasi: IntegrationReadiness;
    sudahSuperApps: boolean;
    uke: { code: string; name: string } | null;
  }
): DashboardServiceItem {
  return {
    id: s.id,
    jenisLayanan: s.jenisLayanan,
    kelompokLayanan: s.kelompokLayanan,
    tahunPekerjaan: s.tahunPekerjaan,
    scope: s.scope,
    kesiapanIntegrasi: s.kesiapanIntegrasi,
    sudahSuperApps: s.sudahSuperApps,
    ukeCode: s.uke?.code ?? null,
    ukeName: s.uke?.name ?? null,
  };
}

export async function getExecutiveDashboard(
  filters: DashboardFilters = {}
): Promise<ExecutiveDashboardData> {
  await requireAuth();

  const where = buildServiceWhere(filters);
  const yearWhere: Prisma.ServiceWhereInput = {
    isDeleted: false,
    sudahSuperApps: false,
    ...(filters.ukeId ? { ukeId: filters.ukeId } : {}),
  };

  const [services, yearRows] = await Promise.all([
    prisma.service.findMany({
      where,
      include: { uke: { select: { id: true, code: true, name: true } } },
      orderBy: [
        { kelompokLayanan: "asc" },
        { jenisLayanan: "asc" },
        { uke: { code: "asc" } },
      ],
    }),
    prisma.service.findMany({
      where: yearWhere,
      select: { tahunPekerjaan: true },
      distinct: ["tahunPekerjaan"],
      orderBy: { tahunPekerjaan: "desc" },
    }),
  ]);

  const items = services.map(mapService);

  const kelompokSet = new Set(items.map((s) => s.kelompokLayanan.toLowerCase().trim()));
  const jenisSet = new Set(
    items.map((s) => jenisLayananDistinctKey(s.kelompokLayanan, s.jenisLayanan))
  );

  const ukeCountMap = new Map<string, { code: string; name: string; count: number }>();
  const ukeJenisMap = new Map<string, { code: string; name: string; jenis: Set<string> }>();
  const ukeIntegrationMap = new Map<
    string,
    {
      code: string;
      name: string;
      jenisKesiapan: Map<string, IntegrationReadiness>;
    }
  >();

  for (const s of services) {
    if (!s.uke) continue;
    const existing = ukeCountMap.get(s.uke.id);
    if (existing) {
      existing.count++;
    } else {
      ukeCountMap.set(s.uke.id, { code: s.uke.code, name: s.uke.name, count: 1 });
    }

    const jenisKey = jenisLayananDistinctKey(s.kelompokLayanan, s.jenisLayanan);
    const jenisEntry = ukeJenisMap.get(s.uke.id) ?? {
      code: s.uke.code,
      name: s.uke.name,
      jenis: new Set<string>(),
    };
    jenisEntry.jenis.add(jenisKey);
    ukeJenisMap.set(s.uke.id, jenisEntry);

    const integrationEntry = ukeIntegrationMap.get(s.uke.id) ?? {
      code: s.uke.code,
      name: s.uke.name,
      jenisKesiapan: new Map<string, IntegrationReadiness>(),
    };
    if (!integrationEntry.jenisKesiapan.has(jenisKey)) {
      integrationEntry.jenisKesiapan.set(jenisKey, s.kesiapanIntegrasi);
    }
    ukeIntegrationMap.set(s.uke.id, integrationEntry);
  }

  const chartByUke = Array.from(ukeCountMap.values()).sort((a, b) => b.count - a.count);
  const jenisLayananByUke = Array.from(ukeJenisMap.values())
    .map((u) => ({ code: u.code, name: u.name, count: u.jenis.size }))
    .sort((a, b) => b.count - a.count);

  const toPct = (count: number, total: number) =>
    total > 0 ? Math.round((count / total) * 1000) / 10 : 0;

  const chartIntegrationByUke = Array.from(ukeIntegrationMap.values())
    .map((u) => {
      const totalJenis = u.jenisKesiapan.size;
      let Q1 = 0;
      let Q2 = 0;
      let Q3 = 0;
      for (const kesiapan of u.jenisKesiapan.values()) {
        if (kesiapan === "Q1") Q1++;
        else if (kesiapan === "Q2") Q2++;
        else if (kesiapan === "Q3") Q3++;
      }
      return {
        code: u.code,
        name: u.name,
        totalJenis,
        Q1,
        Q2,
        Q3,
        Q1Pct: toPct(Q1, totalJenis),
        Q2Pct: toPct(Q2, totalJenis),
        Q3Pct: toPct(Q3, totalJenis),
      };
    })
    .sort((a, b) => a.totalJenis - b.totalJenis);

  const integrationCounts = { Q1: 0, Q2: 0, Q3: 0 };
  for (const s of items) {
    if (s.kesiapanIntegrasi === "Q1") integrationCounts.Q1++;
    else if (s.kesiapanIntegrasi === "Q2") integrationCounts.Q2++;
    else if (s.kesiapanIntegrasi === "Q3") integrationCounts.Q3++;
  }

  const chartByIntegration = INTEGRATION_CHART_ORDER.map((key) => ({
    key,
    label: INTEGRATION_LABELS[key],
    count: integrationCounts[key],
  }));

  return {
    years: yearRows.map((r) => r.tahunPekerjaan),
    summary: {
      totalServices: items.length,
      totalKelompok: kelompokSet.size,
      totalJenisLayanan: jenisSet.size,
    },
    chartByUke,
    jenisLayananByUke,
    chartByIntegration,
    chartIntegrationByUke,
    services: items,
  };
}

export async function getDashboardKpis(ukeFilter?: string) {
  await requireAuth();

  const where: Prisma.ServiceWhereInput = {
    isDeleted: false,
    ...(ukeFilter ? { ukeId: ukeFilter } : {}),
  };

  const [
    totalUke,
    kelompokRows,
    totalServices,
    sudahSuperApps,
    belumSuperApps,
  ] = await Promise.all([
    prisma.uke.count({ where: { isActive: true } }),
    prisma.service.findMany({
      where,
      select: { kelompokLayanan: true },
      distinct: ["kelompokLayanan"],
    }),
    prisma.service.count({ where }),
    prisma.service.count({ where: { ...where, sudahSuperApps: true } }),
    prisma.service.count({ where: { ...where, sudahSuperApps: false } }),
  ]);

  const totalServiceGroups = kelompokRows.length;

  const progressPercent =
    totalServices > 0 ? (sudahSuperApps / totalServices) * 100 : 0;

  return {
    totalUke,
    totalServiceGroups,
    totalServices,
    sudahSuperApps,
    belumSuperApps,
    progressPercent,
  };
}

export async function getServicesByUke(ukeFilter?: string) {
  await requireAuth();

  const services = await prisma.service.groupBy({
    by: ["ukeId"],
    where: {
      isDeleted: false,
      ukeId: { not: null },
      ...(ukeFilter ? { ukeId: ukeFilter } : {}),
    },
    _count: { id: true },
  });

  const ukes = await prisma.uke.findMany({
    where: { id: { in: services.map((s) => s.ukeId!).filter(Boolean) } },
    select: { id: true, name: true, code: true },
  });

  const ukeMap = new Map(ukes.map((u) => [u.id, u]));

  return services
    .map((s) => ({
      name: ukeMap.get(s.ukeId!)?.code ?? "Unknown",
      fullName: ukeMap.get(s.ukeId!)?.name ?? "Unknown",
      count: s._count.id,
    }))
    .sort((a, b) => b.count - a.count);
}

export async function getServicesByYear(ukeFilter?: string) {
  await requireAuth();

  const services = await prisma.service.groupBy({
    by: ["tahunPekerjaan"],
    where: {
      isDeleted: false,
      ...(ukeFilter ? { ukeId: ukeFilter } : {}),
    },
    _count: { id: true },
    orderBy: { tahunPekerjaan: "asc" },
  });

  return services.map((s) => ({
    year: String(s.tahunPekerjaan),
    count: s._count.id,
  }));
}

export async function getIntegrationReadiness(ukeFilter?: string) {
  await requireAuth();

  const data = await prisma.service.groupBy({
    by: ["kesiapanIntegrasi"],
    where: {
      isDeleted: false,
      ...(ukeFilter ? { ukeId: ukeFilter } : {}),
    },
    _count: { id: true },
  });

  return data.map((d) => ({
    name: d.kesiapanIntegrasi,
    count: d._count.id,
  }));
}

export async function getInternalVsExternal(ukeFilter?: string) {
  await requireAuth();

  const data = await prisma.service.groupBy({
    by: ["scope"],
    where: {
      isDeleted: false,
      ...(ukeFilter ? { ukeId: ukeFilter } : {}),
    },
    _count: { id: true },
  });

  return data.map((d) => ({
    name: d.scope === "INTERNAL" ? "Internal" : "Eksternal",
    count: d._count.id,
  }));
}

export async function getSuperAppsReadiness(ukeFilter?: string) {
  await requireAuth();

  const [sudah, belum] = await Promise.all([
    prisma.service.count({
      where: {
        isDeleted: false,
        sudahSuperApps: true,
        ...(ukeFilter ? { ukeId: ukeFilter } : {}),
      },
    }),
    prisma.service.count({
      where: {
        isDeleted: false,
        sudahSuperApps: false,
        ...(ukeFilter ? { ukeId: ukeFilter } : {}),
      },
    }),
  ]);

  return [
    { name: "Sudah SuperApps", count: sudah },
    { name: "Belum SuperApps", count: belum },
  ];
}

export async function getMonthlyChanges(ukeFilter?: string) {
  await requireAuth();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const histories = await prisma.serviceHistory.findMany({
    where: {
      createdAt: { gte: sixMonthsAgo },
      ...(ukeFilter
        ? { service: { ukeId: ukeFilter, isDeleted: false } }
        : {}),
    },
    select: { createdAt: true, action: true },
  });

  const monthMap = new Map<string, { created: number; updated: number; deleted: number }>();

  for (const h of histories) {
    const key = `${h.createdAt.getFullYear()}-${String(h.createdAt.getMonth() + 1).padStart(2, "0")}`;
    const entry = monthMap.get(key) ?? { created: 0, updated: 0, deleted: 0 };
    if (h.action === "CREATED") entry.created++;
    else if (h.action === "UPDATED") entry.updated++;
    else if (h.action === "DELETED") entry.deleted++;
    monthMap.set(key, entry);
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, counts]) => ({
      month,
      ...counts,
      total: counts.created + counts.updated + counts.deleted,
    }));
}

export async function getProgressByUke() {
  await requireAuth();

  const ukes = await prisma.uke.findMany({
    where: { isActive: true },
    include: {
      services: {
        where: { isDeleted: false },
        select: { sudahSuperApps: true },
      },
    },
  });

  return ukes.map((u) => {
    const total = u.services.length;
    const done = u.services.filter((s) => s.sudahSuperApps).length;
    return {
      code: u.code,
      name: u.name,
      total,
      done,
      percent: total > 0 ? (done / total) * 100 : 0,
    };
  });
}

export async function getTopApplications(limit = 10) {
  await requireAuth();

  const data = await prisma.service.groupBy({
    by: ["namaAplikasi"],
    where: { isDeleted: false, namaAplikasi: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });

  return data
    .filter((d) => d.namaAplikasi)
    .map((d) => ({
      name: d.namaAplikasi!,
      count: d._count.id,
    }));
}

export async function getServicesByKelompok(ukeFilter?: string) {
  await requireAuth();

  const data = await prisma.service.groupBy({
    by: ["kelompokLayanan"],
    where: {
      isDeleted: false,
      ...(ukeFilter ? { ukeId: ukeFilter } : {}),
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  return data.map((d) => ({
    name: d.kelompokLayanan,
    count: d._count.id,
  }));
}

export async function getRecentChanges(limit = 20) {
  await requireAuth();

  return prisma.serviceHistory.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      service: {
        select: {
          jenisLayanan: true,
          uke: { select: { code: true } },
        },
      },
    },
  });
}
