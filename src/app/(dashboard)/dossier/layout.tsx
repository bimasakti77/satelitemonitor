import { requireDossierAccess } from "@/lib/auth";

export default async function DossierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireDossierAccess();
  return children;
}
