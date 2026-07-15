import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { ServiceForm } from "@/components/services/service-form";
import { ServiceFunctionApisPanel } from "@/components/services/service-function-apis";
import { ServiceTimeline } from "@/components/services/service-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getServiceById } from "@/lib/actions/services";
import { getUkes } from "@/lib/actions/uke";
import { getKelompokLayananOptions } from "@/lib/actions/kelompok-layanan";
import { requireAuth, canWrite } from "@/lib/auth";
import { INTEGRATION_LABELS, SCOPE_LABELS } from "@/lib/constants";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const session = await requireAuth();
  const { id } = await params;
  const service = await getServiceById(id);

  if (!service) notFound();

  const [ukes, kelompokOptions] = await Promise.all([
    getUkes(),
    getKelompokLayananOptions(),
  ]);

  const toOption = (items: { id: string; code?: string; name: string }[]) =>
    items.map((i) => ({
      id: i.id,
      label: i.code ? `${i.code} - ${i.name}` : i.name,
    }));

  const writable = canWrite(session.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/services">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader
          title={service.jenisLayanan}
          description={[service.uke?.code, service.kelompokLayanan].filter(Boolean).join(" • ")}
        />
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detail Layanan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-muted-foreground">UKE I</p>
                <p className="font-medium">{service.uke?.name ?? "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tahun Pekerjaan</p>
                <p className="font-medium">{service.tahunPekerjaan}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Kelompok Layanan</p>
                <p className="font-medium">{service.kelompokLayanan}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tipe Layanan</p>
                <Badge variant="outline">{SCOPE_LABELS[service.scope]}</Badge>
              </div>
              {service.scope === "INTERNAL" && (
                <div>
                  <p className="text-muted-foreground">Tipe Layanan Internal</p>
                  <p className="font-medium">{service.tipeLayananInternal ?? "-"}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Kesiapan Integrasi</p>
                <Badge variant="secondary">
                  {INTEGRATION_LABELS[service.kesiapanIntegrasi]}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Sudah di Superapps</p>
                <Badge variant={service.sudahSuperApps ? "success" : "warning"}>
                  {service.sudahSuperApps ? "Sudah" : "Belum"}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Nama Aplikasi Terkait</p>
                <p className="font-medium">{service.namaAplikasi ?? "-"}</p>
              </div>
            </div>
            {service.detailAplikasi && (
              <div>
                <p className="text-muted-foreground">Detail Aplikasi Terkait</p>
                <p className="mt-1 whitespace-pre-wrap">{service.detailAplikasi}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground mb-2">Daftar Fungsi Terkait Layanan</p>
              {service.fungsi.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5">
                  {service.fungsi.map((f) => (
                    <li key={f.id}>
                      {f.nama}
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({f.apis.length} API)
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">-</p>
              )}
            </div>
          </CardContent>
        </Card>

        {writable && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Edit Layanan</CardTitle>
            </CardHeader>
            <CardContent>
              <ServiceForm
                ukes={toOption(ukes)}
                kelompokOptions={kelompokOptions}
                service={service}
              />
            </CardContent>
          </Card>
        )}
      </div>

      <ServiceFunctionApisPanel fungsi={service.fungsi} canEdit={writable} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat Perubahan</CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceTimeline histories={service.histories} />
        </CardContent>
      </Card>
    </div>
  );
}
