import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const UKE_SEED = [
  { code: "ITJEN", name: "Inspektorat Jenderal" },
  { code: "BSK", name: "Badan Strategi Kebijakan" },
  { code: "BPSDM", name: "Badan Pengembangan Sumber Daya Manusia" },
  { code: "AHU", name: "Direktorat Jenderal Administrasi Hukum Umum" },
  { code: "KI", name: "Direktorat Jenderal Kekayaan Intelektual" },
  { code: "PP", name: "Direktorat Jenderal Peraturan Perundang-Undangan" },
  { code: "BPHN", name: "Badan Pembinaan Hukum Nasional" },
  { code: "SETJEN", name: "Sekretariat Jenderal" },
] as const;

/** Hanya upsert UKE — tidak menghapus layanan yang sudah ada. */
async function ensureUkes() {
  console.log(">> Ensuring UKE master data...");

  const ukes = [];
  for (const uke of UKE_SEED) {
    const record = await prisma.uke.upsert({
      where: { code: uke.code },
      update: { name: uke.name, description: uke.name, isActive: true },
      create: {
        code: uke.code,
        name: uke.name,
        description: uke.name,
        isActive: true,
      },
    });
    ukes.push(record);
  }

  console.log(`>> ${ukes.length} UKE records ready.`);
  return ukes;
}

/** Reset penuh — hanya saat SEED_RESET=true (manual). */
async function resetServiceData() {
  console.log(">> SEED_RESET: wiping all service data...");

  await prisma.notification.deleteMany({ where: { serviceId: { not: null } } });
  await prisma.serviceFunction.deleteMany({});
  await prisma.serviceHistory.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.user.updateMany({
    where: { ukeId: { not: null } },
    data: { ukeId: null },
  });

  const validCodes = UKE_SEED.map((u) => u.code);
  await prisma.uke.deleteMany({
    where: { code: { notIn: [...validCodes] } },
  });
}

async function main() {
  const reset = process.env.SEED_RESET === "true";
  console.log(`Seeding database... (reset=${reset})`);

  if (reset) {
    await resetServiceData();
  }

  const passwordHash = await bcrypt.hash("password123", 12);
  const ukes = await ensureUkes();
  const ukeByCode = Object.fromEntries(ukes.map((u) => [u.code, u]));

  const admin = await prisma.user.upsert({
    where: { email: "admin@kemenkumham.go.id" },
    update: { isActive: true },
    create: {
      email: "admin@kemenkumham.go.id",
      name: "Administrator",
      passwordHash,
      role: "ADMINISTRATOR",
    },
  });

  for (const uke of UKE_SEED) {
    const email = `operator-${uke.code.toLowerCase()}@kemenkumham.go.id`;
    await prisma.user.upsert({
      where: { email },
      update: {
        ukeId: ukeByCode[uke.code].id,
        name: `Operator ${uke.code}`,
        role: "OPERATOR_UKE",
        isActive: true,
      },
      create: {
        email,
        name: `Operator ${uke.code}`,
        passwordHash,
        role: "OPERATOR_UKE",
        ukeId: ukeByCode[uke.code].id,
      },
    });
  }

  await prisma.user.updateMany({
    where: { email: "operator@kemenkumham.go.id" },
    data: { isActive: false },
  });

  await prisma.user.upsert({
    where: { email: "executive@kemenkumham.go.id" },
    update: { isActive: true },
    create: {
      email: "executive@kemenkumham.go.id",
      name: "Executive Viewer",
      passwordHash,
      role: "EXECUTIVE",
    },
  });

  const serviceData = [
    {
      externalId: "SRV-PGW-001",
      kelompokLayanan: "Layanan Pengawasan",
      jenisLayanan:
        "Input dan upload Tindak lanjut temuan hasil pengawasan Internal oleh admin satker",
      tahunPekerjaan: 2027,
      scope: "INTERNAL" as const,
      tipeLayananInternal: "Layanan Internal",
      sudahSuperApps: false,
      kesiapanIntegrasi: "Q3" as const,
      namaAplikasi: "SIMWAS (Sistem Informasi Manajemen Pengawasan)",
      detailAplikasi:
        "Aplikasi Management Hasil Pengawasan Internal dan Eksternal yang dikelola oleh Inspektorat Jenderal",
      ukeId: ukeByCode.ITJEN.id,
      fungsi: ["Input data tindak lanjut", "Upload dokumen temuan", "Tarik laporan"],
    },
    {
      externalId: "SRV-PGW-002",
      kelompokLayanan: "Layanan Pengawasan",
      jenisLayanan:
        "Input dan upload Tindak lanjut temuan hasil pemeriksaan Eksternal oleh admin satker",
      tahunPekerjaan: 2027,
      scope: "INTERNAL" as const,
      tipeLayananInternal: "Layanan Internal",
      sudahSuperApps: false,
      kesiapanIntegrasi: "Q3" as const,
      ukeId: ukeByCode.ITJEN.id,
      fungsi: ["Input data", "Upload dokumen"],
    },
    {
      externalId: "SRV-PGW-003",
      kelompokLayanan: "Layanan Pengawasan",
      jenisLayanan:
        "Input dan upload tahapan-tahapan proses Hukuman Disiplin oleh admin satker",
      tahunPekerjaan: 2027,
      scope: "INTERNAL" as const,
      tipeLayananInternal: "Layanan Internal",
      sudahSuperApps: false,
      kesiapanIntegrasi: "Q3" as const,
      ukeId: ukeByCode.ITJEN.id,
      fungsi: ["Register proses", "Input tahapan"],
    },
    {
      externalId: "SRV-PGW-004",
      kelompokLayanan: "Layanan Pengawasan",
      jenisLayanan:
        "View statistik Hasil Pengawasan Internal dan Eksternal yang dikelola oleh Inspektorat Jenderal",
      tahunPekerjaan: 2027,
      scope: "INTERNAL" as const,
      tipeLayananInternal: "Layanan Internal",
      sudahSuperApps: false,
      kesiapanIntegrasi: "Q3" as const,
      ukeId: ukeByCode.ITJEN.id,
      fungsi: ["View statistik", "Tarik laporan"],
    },
  ];

  for (const { fungsi, ...data } of serviceData) {
    const service = await prisma.service.upsert({
      where: { externalId: data.externalId },
      update: reset
        ? {
            ...data,
            fungsi: {
              deleteMany: {},
              create: fungsi.map((nama, sortOrder) => ({ nama, sortOrder })),
            },
          }
        : {},
      create: {
        ...data,
        fungsi: { create: fungsi.map((nama, sortOrder) => ({ nama, sortOrder })) },
      },
    });

    await prisma.serviceHistory.upsert({
      where: { id: `seed-history-${data.externalId}` },
      update: {},
      create: {
        id: `seed-history-${data.externalId}`,
        serviceId: service.id,
        action: "CREATED",
        userId: admin.id,
        snapshot: data,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: reset ? "SEED_RESET" : "SEED",
      entity: "Database",
      metadata: {
        message: reset
          ? "Full database reset with sample services"
          : "Ensured users, UKE, and sample services without wiping existing data",
      },
    },
  });

  console.log("Seed completed!");
  console.log("  admin@kemenkumham.go.id / password123 (Administrator)");
  console.log("  executive@kemenkumham.go.id / password123 (Executive)");
  console.log("  Operator UKE (password123):");
  for (const uke of UKE_SEED) {
    console.log(`    operator-${uke.code.toLowerCase()}@kemenkumham.go.id (${uke.code})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
