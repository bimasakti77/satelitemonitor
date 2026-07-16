import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveStoredAbsolutePath } from "@/lib/domain-evidence-storage";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (
    !session ||
    (session.role !== "ADMINISTRATOR" && session.role !== "EXECUTIVE")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const evidence = await prisma.dossierDomainLevelEvidence.findUnique({
    where: { id },
  });

  if (!evidence || !evidence.isActive) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const mode = new URL(request.url).searchParams.get("mode");
  const inline = mode === "view";

  try {
    const absolute = resolveStoredAbsolutePath(evidence.storagePath);
    const buffer = await readFile(absolute);
    const filename = encodeURIComponent(evidence.originalName);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": evidence.mimeType || "application/octet-stream",
        "Content-Disposition": inline
          ? `inline; filename="${filename}"`
          : `attachment; filename="${filename}"`,
        "Content-Length": String(evidence.sizeBytes),
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }
}
