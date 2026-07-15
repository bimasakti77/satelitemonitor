import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export const ukeSchema = z.object({
  code: z.string().min(1, "Kode wajib diisi").max(20),
  name: z.string().min(1, "Nama wajib diisi").max(200),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const applicationSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(200),
  description: z.string().optional(),
  vendor: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const serviceSchema = z
  .object({
    ukeId: z.string().min(1, "UKE wajib dipilih"),
    kelompokLayanan: z.string().min(1, "Kelompok layanan wajib diisi").max(200),
    jenisLayanan: z.string().min(1, "Jenis layanan wajib diisi").max(500),
    tahunPekerjaan: z.coerce.number().int().min(2020).max(2035),
    scope: z.enum(["INTERNAL", "EKSTERNAL"]),
    tipeLayananInternal: z.string().optional().nullable(),
    sudahSuperApps: z.boolean().default(false),
    kesiapanIntegrasi: z.enum(["Q1", "Q2", "Q3", "NOT_READY"]),
    namaAplikasi: z.string().optional().nullable(),
    detailAplikasi: z.string().optional().nullable(),
    fungsi: z.array(z.string().min(1).max(200)).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.scope === "INTERNAL" && !data.tipeLayananInternal?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Tipe layanan internal wajib diisi untuk layanan internal",
        path: ["tipeLayananInternal"],
      });
    }
  });

export const serviceFunctionApiSchema = z.object({
  nama: z.string().min(1, "Nama API wajib diisi").max(200),
  endpoint: z.string().max(500).optional().nullable(),
  status: z.enum(["BELUM_TERSEDIA", "ON_PROGRESS", "SUDAH_TERSEDIA"]),
  catatan: z.string().max(2000).optional().nullable(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type UkeInput = z.infer<typeof ukeSchema>;
export type ApplicationInput = z.infer<typeof applicationSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type ServiceFunctionApiInput = z.infer<typeof serviceFunctionApiSchema>;
