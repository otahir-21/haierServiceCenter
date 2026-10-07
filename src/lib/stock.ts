import { prisma } from "./db";

export async function onHand(partId: string) {
  const moves = await prisma.stockMove.findMany({
    where: { partId },
    select: { type: true, qty: true },
  });
  return moves.reduce((sum, move) => sum + (move.type === "PURCHASE" ? move.qty : -move.qty), 0);
}

export function stockAlert(qty: number, minQty: number, maxQty: number | null) {
  if (qty <= minQty) return "low" as const;
  if (maxQty != null && qty >= maxQty) return "high" as const;
  return null;
}

export async function stockByPart() {
  const moves = await prisma.stockMove.groupBy({
    by: ["partId", "type"],
    _sum: { qty: true },
  });
  const map = new Map<string, number>();
  for (const row of moves) {
    const qty = row._sum.qty ?? 0;
    const signed = row.type === "PURCHASE" ? qty : -qty;
    map.set(row.partId, (map.get(row.partId) ?? 0) + signed);
  }
  return map;
}
