import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const job = await prisma.complaint.findUnique({
    where: { id },
    select: { billImage: true, billImageType: true },
  });
  if (!job?.billImage || !job.billImageType) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(job.billImage), {
    headers: {
      "Content-Type": job.billImageType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
