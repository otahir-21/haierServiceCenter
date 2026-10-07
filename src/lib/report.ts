import { prisma } from "./db";

export async function buildReport(start: Date, end: Date) {
  const [moves, expenses, complaints] = await Promise.all([
    prisma.stockMove.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { part: true, createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.expense.findMany({
      where: { date: { gte: start, lte: end } },
      include: { createdBy: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.complaint.findMany({
      where: { collectedAt: { gte: start, lte: end }, collectionAmount: { gt: 0 } },
      orderBy: { collectedAt: "desc" },
    }),
  ]);

  let partsCash = 0;
  let costOfSold = 0;
  let soldQty = 0;
  let receivedQty = 0;
  let purchaseValue = 0;
  let companyPurchase = 0;
  let localPurchase = 0;

  for (const move of moves) {
    if (move.type === "PURCHASE") {
      receivedQty += move.qty;
      purchaseValue += move.amount;
      if (move.source === "COMPANY") companyPurchase += move.amount;
      else if (move.source === "LOCAL") localPurchase += move.amount;
    } else {
      soldQty += move.qty;
      costOfSold += move.qty * move.unitCost;
      partsCash += move.amount;
    }
  }

  const complaintCash = complaints.reduce((sum, row) => sum + row.collectionAmount, 0);
  const expenseTotal = expenses.reduce((sum, row) => sum + row.amount, 0);
  const cashCollected = partsCash + complaintCash;
  const grossProfit = cashCollected - costOfSold;
  const left = grossProfit - expenseTotal;

  const byCategory = new Map<string, number>();
  for (const expense of expenses) {
    byCategory.set(expense.category, (byCategory.get(expense.category) ?? 0) + expense.amount);
  }

  return {
    partsCash,
    complaintCash,
    cashCollected,
    costOfSold,
    grossProfit,
    expenseTotal,
    left,
    soldQty,
    receivedQty,
    purchaseValue,
    companyPurchase,
    localPurchase,
    spent: purchaseValue + expenseTotal,
    incomeAfterSpent: cashCollected - (purchaseValue + expenseTotal),
    byCategory: [...byCategory.entries()],
    moves,
    expenses,
    complaints,
  };
}
