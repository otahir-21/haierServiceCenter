import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLang } from "@/lib/lang";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if ((await prisma.user.count()) === 0) redirect("/setup");
  const user = await currentUser();
  if (!user) redirect("/api/logout");
  const lang = await getLang();
  return (
    <Shell user={user} lang={lang}>
      {children}
    </Shell>
  );
}
