"use server";

import bcrypt from "bcryptjs";
import { redirect, unstable_rethrow } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { clearSessionCookie, currentUser, setSessionCookie, signSession } from "@/lib/auth";
import { STARTER_PRODUCTS, EXPENSE_CATEGORIES, LABOR_CHARGE } from "@/lib/catalog";
import { karachiDayStart } from "@/lib/dates";
import { clip, moneyOrNull, optionalWhole, str, usernameOf, validUsername, wholeQty, type ActionState } from "@/lib/input";
import { onHand } from "@/lib/stock";
import { roundMoney } from "@/lib/format";

async function actor() {
  const user = await currentUser();
  if (!user) return { error: "forbidden" as const };
  return { user };
}

async function adminActor() {
  const result = await actor();
  if ("error" in result) return result;
  if (result.user.role !== "ADMIN") return { error: "forbidden" as const };
  return result;
}

function safeNext(value: string) {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  return value;
}

export async function setLang(formData: FormData) {
  const lang = formData.get("lang") === "ur" ? "ur" : "en";
  const { cookies } = await import("next/headers");
  (await cookies()).set("hsc_lang", lang, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  redirect(safeNext(str(formData, "next") || "/"));
}

export async function logout() {
  await clearSessionCookie();
  redirect("/login?msg=loggedOut");
}

export async function setup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const existing = await prisma.user.count();
  if (existing > 0) redirect("/login");

  const name = clip(str(formData, "name"), 80);
  const username = usernameOf(str(formData, "username"));
  const password = str(formData, "password");
  const confirm = str(formData, "confirm");
  if (!name) return { error: "name_required" };
  if (!validUsername(username)) return { error: "username_invalid" };
  if (password.length < 6) return { error: "password_short" };
  if (password !== confirm) return { error: "password_mismatch" };

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: { name, username, passwordHash, role: "ADMIN" },
    });
    await tx.product.createMany({ data: STARTER_PRODUCTS.map((item) => ({ ...item })) });
  });
  redirect("/login?msg=setupReady");
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const username = usernameOf(str(formData, "username"));
  const password = str(formData, "password");
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return { error: "bad_login" };
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return { error: "bad_login" };
  if (!user.active) return { error: "inactive" };
  await setSessionCookie(await signSession(user));
  redirect("/");
}

async function resolveProduct(formData: FormData) {
  const productId = str(formData, "productId");
  const nameEn = clip(str(formData, "newProductEn"), 80);
  const nameUr = clip(str(formData, "newProductUr"), 80);
  if (nameEn) {
    const created = await prisma.product.create({
      data: { nameEn, nameUr: nameUr || nameEn },
    });
    return created.id;
  }
  if (!productId) return null;
  const found = await prisma.product.findUnique({ where: { id: productId } });
  return found?.id ?? null;
}

const BILL_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const BILL_LIMIT = 1_500_000;

function stockLevels(formData: FormData) {
  const minRaw = str(formData, "minQty");
  const maxRaw = str(formData, "maxQty");
  const minQty = minRaw === "" ? 2 : optionalWhole(formData, "minQty");
  const maxQty = maxRaw === "" ? null : optionalWhole(formData, "maxQty");
  if (minQty == null || Number.isNaN(minQty) || (maxQty != null && Number.isNaN(maxQty))) {
    return { error: "qty_level_invalid" as const };
  }
  if (maxQty != null && maxQty < minQty) return { error: "level_invalid" as const };
  return { minQty, maxQty };
}

function purchaseMeta(formData: FormData) {
  const sourceRaw = str(formData, "source");
  const source = sourceRaw === "LOCAL" ? "LOCAL" : sourceRaw === "COMPANY" ? "COMPANY" : "";
  if (!source) return { error: "required" as const };
  const payment = str(formData, "payment") === "ADVANCE" ? "ADVANCE" : "PAID";
  const billNumber = clip(str(formData, "billNumber"), 40);
  if (!billNumber) return { error: "bill_required" as const };
  return { source, payment, billNumber };
}

async function readBill(formData: FormData) {
  const file = formData.get("billPhoto");
  if (!(file instanceof File) || file.size === 0) return null;
  if (!BILL_TYPES.has(file.type) || file.size > BILL_LIMIT) return { error: "bill_invalid" as const };
  return { image: Buffer.from(await file.arrayBuffer()), type: file.type };
}

function priced(cost: number, marginRaw: number | null, retailRaw: number | null) {
  if (marginRaw != null && !Number.isNaN(marginRaw)) {
    if (marginRaw < 0 || marginRaw > 500) return { error: "amount_invalid" as const };
    if (cost > 0) {
      return { retail: roundMoney(cost * (1 + marginRaw / 100)), margin: marginRaw };
    }
    if (retailRaw != null && !Number.isNaN(retailRaw) && retailRaw >= 0) {
      return { retail: retailRaw, margin: marginRaw };
    }
    return { error: "retail_required" as const };
  }
  if (retailRaw == null || Number.isNaN(retailRaw) || retailRaw < 0) {
    return { error: "retail_required" as const };
  }
  return { retail: retailRaw, margin: null };
}

export async function createPart(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await adminActor();
  if ("error" in gate) return gate;

  const code = clip(str(formData, "code"), 20);
  const name = clip(str(formData, "name"), 120);
  const model = clip(str(formData, "model"), 80);
  if (!code || !name) return { error: "required" };

  const productId = await resolveProduct(formData);
  if (!productId) return { error: "product_required" };

  const firstQtyRaw = str(formData, "firstQty");
  const firstQty = firstQtyRaw && firstQtyRaw !== "0" ? wholeQty(formData, "firstQty") : 0;
  if (Number.isNaN(firstQty)) return { error: "qty_invalid" };
  const firstCost = firstQtyRaw ? moneyOrNull(formData, "firstCost") : 0;
  if (firstCost == null || Number.isNaN(firstCost) || firstCost < 0) return { error: "amount_invalid" };

  const price = priced(firstCost ?? 0, moneyOrNull(formData, "margin"), moneyOrNull(formData, "retail"));
  if ("error" in price) return price;
  const levels = stockLevels(formData);
  if ("error" in levels) return levels;
  const opening = firstQty && firstQty > 0 ? purchaseMeta(formData) : null;
  if (opening && "error" in opening) return opening;

  try {
    await prisma.$transaction(async (tx) => {
      const part = await tx.part.create({
        data: {
          code,
          name,
          model,
          productId,
          costPrice: firstCost ?? 0,
          retailPrice: price.retail,
          marginPercent: price.margin,
          minQty: levels.minQty,
          maxQty: levels.maxQty,
        },
      });
      if (firstQty && firstQty > 0 && opening && !("error" in opening)) {
        await tx.stockMove.create({
          data: {
            type: "PURCHASE",
            partId: part.id,
            qty: firstQty,
            unitCost: firstCost ?? 0,
            unitRetail: price.retail,
            amount: roundMoney(firstQty * (firstCost ?? 0)),
            source: opening.source,
            payment: opening.payment,
            billNumber: opening.billNumber,
            note: clip(str(formData, "note"), 300),
            createdById: gate.user.id,
          },
        });
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "code_taken" };
    }
    throw error;
  }
  redirect("/parts?msg=part_saved");
}

export async function updatePart(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await adminActor();
  if ("error" in gate) return gate;
  const id = str(formData, "id");
  const part = await prisma.part.findUnique({ where: { id } });
  if (!part) return { error: "required" };

  const name = clip(str(formData, "name"), 120);
  const model = clip(str(formData, "model"), 80);
  if (!name) return { error: "required" };
  const productId = await resolveProduct(formData);
  if (!productId) return { error: "product_required" };

  const price = priced(part.costPrice, moneyOrNull(formData, "margin"), moneyOrNull(formData, "retail"));
  if ("error" in price) return price;
  const levels = stockLevels(formData);
  if ("error" in levels) return levels;

  await prisma.part.update({
    where: { id },
    data: {
      name,
      model,
      productId,
      retailPrice: price.retail,
      marginPercent: price.margin,
      minQty: levels.minQty,
      maxQty: levels.maxQty,
      active: formData.get("active") === "on",
    },
  });
  redirect(`/parts/${id}?msg=part_saved`);
}

export async function purchaseStock(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await adminActor();
  if ("error" in gate) return gate;
  const partId = str(formData, "partId");
  const qty = wholeQty(formData);
  const unitCost = moneyOrNull(formData, "unitCost");
  if (!partId) return { error: "partMissing" };
  if (qty == null || Number.isNaN(qty)) return { error: "qty_invalid" };
  if (unitCost == null || Number.isNaN(unitCost) || unitCost < 0) return { error: "amount_invalid" };

  const part = await prisma.part.findUnique({ where: { id: partId } });
  if (!part) return { error: "partMissing" };
  const meta = purchaseMeta(formData);
  if ("error" in meta) return meta;

  const marginRaw = moneyOrNull(formData, "margin");
  const retailRaw = moneyOrNull(formData, "retail");
  let retail = part.retailPrice;
  let margin: number | null = part.marginPercent;
  if (marginRaw != null && !Number.isNaN(marginRaw)) {
    if (marginRaw < 0 || marginRaw > 500) return { error: "amount_invalid" };
    retail = roundMoney(unitCost * (1 + marginRaw / 100));
    margin = marginRaw;
  } else if (retailRaw != null && !Number.isNaN(retailRaw)) {
    if (retailRaw < 0) return { error: "amount_invalid" };
    retail = retailRaw;
    margin = null;
  } else if (part.marginPercent != null) {
    retail = roundMoney(unitCost * (1 + part.marginPercent / 100));
    margin = part.marginPercent;
  }

  await prisma.$transaction([
    prisma.part.update({
      where: { id: partId },
      data: { costPrice: unitCost, retailPrice: retail, marginPercent: margin, active: true },
    }),
    prisma.stockMove.create({
      data: {
        type: "PURCHASE",
        partId,
        qty,
        unitCost,
        unitRetail: retail,
        amount: roundMoney(qty * unitCost),
        note: clip(str(formData, "note"), 300),
        source: meta.source,
        payment: meta.payment,
        billNumber: meta.billNumber,
        createdById: gate.user.id,
      },
    }),
  ]);
  redirect("/purchase?msg=received");
}

export async function recordSale(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await actor();
  if ("error" in gate) return gate;
  const type = str(formData, "type") === "ISSUE" ? "ISSUE" : "SALE";
  const partId = str(formData, "partId");
  const qty = wholeQty(formData);
  const crt = clip(str(formData, "crt"), 40);
  const technicianName = clip(str(formData, "technicianName"), 80);
  const customerName = clip(str(formData, "customerName"), 80);
  const note = clip(str(formData, "note"), 300);
  if (!partId) return { error: "partMissing" };
  if (qty == null || Number.isNaN(qty)) return { error: "qty_invalid" };
  if (!crt) return { error: "crt_required" };
  if (type === "ISSUE" && !technicianName) return { error: "technician_required" };

  const part = await prisma.part.findUnique({ where: { id: partId } });
  if (!part || !part.active) return { error: "not_for_sale" };

  const typedAmount = moneyOrNull(formData, "amount");
  if (Number.isNaN(typedAmount)) return { error: "amount_invalid" };
  if (typedAmount != null && typedAmount < 0) return { error: "amount_invalid" };
  const amount = typedAmount == null ? roundMoney(part.retailPrice * qty) : typedAmount;

  try {
    const move = await prisma.$transaction(async (tx) => {
      const rows = await tx.stockMove.findMany({
        where: { partId },
        select: { type: true, qty: true },
      });
      const available = rows.reduce((sum, row) => sum + (row.type === "PURCHASE" ? row.qty : -row.qty), 0);
      if (qty > available) throw new Error("NOT_ENOUGH");
      return tx.stockMove.create({
        data: {
          type,
          partId,
          qty,
          unitCost: part.costPrice,
          unitRetail: part.retailPrice,
          amount,
          crtNumber: crt,
          technicianName: type === "ISSUE" ? technicianName : "",
          customerName,
          note,
          createdById: gate.user.id,
        },
      });
    });
    redirect(`/slip/${move.id}`);
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof Error && error.message === "NOT_ENOUGH") return { error: "not_enough" };
    throw error;
  }
}

export async function addExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await adminActor();
  if ("error" in gate) return gate;
  const category = str(formData, "category");
  const title = clip(str(formData, "title"), 80);
  const note = clip(str(formData, "note"), 300);
  const dateRaw = str(formData, "date");
  const amount = moneyOrNull(formData, "amount");
  if (!EXPENSE_CATEGORIES.includes(category as (typeof EXPENSE_CATEGORIES)[number])) {
    return { error: "categoryBad" };
  }
  if (!title) return { error: "titleRequired" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) return { error: "date_invalid" };
  if (amount == null || Number.isNaN(amount) || amount <= 0) return { error: "amount_invalid" };

  await prisma.expense.create({
    data: {
      category,
      title,
      note,
      amount,
      date: karachiDayStart(dateRaw),
      createdById: gate.user.id,
    },
  });
  redirect("/expenses?msg=expense_saved");
}

export async function createComplaint(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await actor();
  if ("error" in gate) return gate;
  const customerName = clip(str(formData, "customerName"), 80);
  const phone = clip(str(formData, "phone").replace(/\s+/g, ""), 20);
  const technicianName = clip(str(formData, "technicianName"), 80);
  const visitType = str(formData, "visitType") === "WORKSHOP" ? "WORKSHOP" : "FIELD";
  if (!customerName) return { error: "name_required" };
  if (!phone) return { error: "phone_required" };
  if (!technicianName) return { error: "technician_required" };
  const estimate = moneyOrNull(formData, "estimate") ?? 0;
  const laborRaw = moneyOrNull(formData, "laborCharge");
  const laborCharge = laborRaw == null ? LABOR_CHARGE : laborRaw;
  if (Number.isNaN(estimate) || estimate < 0 || Number.isNaN(laborCharge) || laborCharge < 0) {
    return { error: "amount_invalid" };
  }

  const complaint = await prisma.complaint.create({
    data: {
      customerName,
      phone,
      address: clip(str(formData, "address"), 200),
      productName: clip(str(formData, "productName"), 80),
      model: clip(str(formData, "model"), 80),
      detail: clip(str(formData, "detail"), 2000),
      visitType,
      technicianName,
      estimate,
      laborCharge,
      createdById: gate.user.id,
    },
  });
  redirect(`/complaints/${complaint.id}?msg=complaint_saved`);
}

export async function updateComplaint(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await actor();
  if ("error" in gate) return gate;
  const id = str(formData, "id");
  const existing = await prisma.complaint.findUnique({ where: { id } });
  if (!existing) return { error: "required" };

  const customerName = clip(str(formData, "customerName"), 80);
  const phone = clip(str(formData, "phone").replace(/\s+/g, ""), 20);
  const technicianName = clip(str(formData, "technicianName"), 80);
  const solution = clip(str(formData, "solution"), 2000);
  const visitType = str(formData, "visitType") === "WORKSHOP" ? "WORKSHOP" : "FIELD";
  const intent = str(formData, "intent");
  if (!customerName) return { error: "name_required" };
  if (!phone) return { error: "phone_required" };
  if (!technicianName) return { error: "technician_required" };
  if (intent === "close" && !solution) return { error: "solution_required" };

  const estimate = moneyOrNull(formData, "estimate") ?? 0;
  const collection = moneyOrNull(formData, "collection") ?? 0;
  const laborRaw = moneyOrNull(formData, "laborCharge");
  const laborCharge = laborRaw == null ? LABOR_CHARGE : laborRaw;
  if (
    Number.isNaN(estimate) ||
    estimate < 0 ||
    Number.isNaN(collection) ||
    collection < 0 ||
    Number.isNaN(laborCharge) ||
    laborCharge < 0
  ) {
    return { error: "amount_invalid" };
  }
  const crtNumber = clip(str(formData, "crt"), 40);
  if (collection > 0 && !crtNumber) return { error: "crt_required" };
  const bill = await readBill(formData);
  if (bill && "error" in bill) return bill;

  const amountChanged = collection !== existing.collectionAmount;
  await prisma.$transaction([
    prisma.complaint.update({
    where: { id },
    data: {
      customerName,
      phone,
      address: clip(str(formData, "address"), 200),
      productName: clip(str(formData, "productName"), 80),
      model: clip(str(formData, "model"), 80),
      detail: clip(str(formData, "detail"), 2000),
      visitType,
      technicianName,
      estimate,
      laborCharge,
      laborWork: clip(str(formData, "laborWork"), 2000),
      billNumber: clip(str(formData, "billNumber"), 40),
      ...(bill ? { billImage: bill.image, billImageType: bill.type } : {}),
      problemFound: clip(str(formData, "problemFound"), 2000),
      partsFitted: clip(str(formData, "partsFitted"), 2000),
      offerGiven: clip(str(formData, "offerGiven"), 2000),
      solution,
      crtNumber,
      collectionAmount: collection,
      collectedAt: collection > 0 ? (amountChanged ? new Date() : existing.collectedAt ?? new Date()) : null,
      status: intent === "close" ? "CLOSED" : existing.status,
      closedAt: intent === "close" ? new Date() : existing.closedAt,
    },
    }),
    prisma.stockMove.updateMany({
      where: { complaintId: id },
      data: { crtNumber, technicianName, customerName },
    }),
  ]);
  redirect(`/complaints/${id}?msg=${intent === "close" ? "closed_saved" : "saved"}`);
}

export async function settlePurchase(formData: FormData) {
  const gate = await adminActor();
  if ("error" in gate) redirect("/login");
  const id = str(formData, "id");
  const move = await prisma.stockMove.findUnique({ where: { id } });
  if (move && move.type === "PURCHASE" && move.payment === "ADVANCE") {
    await prisma.stockMove.update({
      where: { id },
      data: { payment: "PAID", paidAt: new Date() },
    });
  }
  const preset = str(formData, "preset") || "month";
  const params = new URLSearchParams({ preset, msg: "purchase_paid" });
  const from = str(formData, "from");
  const to = str(formData, "to");
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  redirect(`/reports?${params.toString()}`);
}

export async function reopenComplaint(formData: FormData) {
  const gate = await actor();
  if ("error" in gate) redirect("/login");
  const id = str(formData, "id");
  await prisma.complaint.update({
    where: { id },
    data: { status: "OPEN", closedAt: null },
  });
  redirect(`/complaints/${id}?msg=reopened`);
}

export async function takePartForComplaint(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await actor();
  if ("error" in gate) return gate;
  const complaintId = str(formData, "complaintId");
  const partId = str(formData, "partId");
  const qty = wholeQty(formData);
  const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
  const part = await prisma.part.findUnique({ where: { id: partId } });
  if (!complaint || !partId) return { error: "required" };
  if (!part || !part.active) return { error: "not_for_sale" };
  if (qty == null || Number.isNaN(qty)) return { error: "qty_invalid" };

  const available = await onHand(partId);
  if (qty > available) return { error: "not_enough" };

  try {
    await prisma.$transaction(async (tx) => {
      const rows = await tx.stockMove.findMany({
        where: { partId },
        select: { type: true, qty: true },
      });
      const live = rows.reduce((sum, row) => sum + (row.type === "PURCHASE" ? row.qty : -row.qty), 0);
      if (qty > live) throw new Error("NOT_ENOUGH");
      await tx.stockMove.create({
        data: {
          type: "ISSUE",
          partId,
          qty,
          unitCost: part.costPrice,
          unitRetail: part.retailPrice,
          amount: 0,
          crtNumber: complaint.crtNumber,
          technicianName: complaint.technicianName,
          customerName: complaint.customerName,
          complaintId,
          note: "Complaint",
          createdById: gate.user.id,
        },
      });
    });
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof Error && error.message === "NOT_ENOUGH") return { error: "not_enough" };
    throw error;
  }
  redirect(`/complaints/${complaintId}?msg=partTaken`);
}

export async function createLogin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await adminActor();
  if ("error" in gate) return gate;
  const name = clip(str(formData, "name"), 80);
  const username = usernameOf(str(formData, "username"));
  const password = str(formData, "password");
  const role = str(formData, "role") === "ADMIN" ? "ADMIN" : "STAFF";
  if (!name) return { error: "name_required" };
  if (!validUsername(username)) return { error: "username_invalid" };
  if (password.length < 6) return { error: "password_short" };
  try {
    await prisma.user.create({
      data: { name, username, passwordHash: await bcrypt.hash(password, 10), role },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "username_taken" };
    }
    throw error;
  }
  redirect("/people?msg=login_saved");
}

export async function setUserPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await adminActor();
  if ("error" in gate) return gate;
  const id = str(formData, "id");
  const password = str(formData, "password");
  if (password.length < 6) return { error: "password_short" };
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });
  redirect("/people?msg=password_saved");
}

export async function setUserRole(formData: FormData) {
  const gate = await adminActor();
  if ("error" in gate) redirect("/login");
  const id = str(formData, "id");
  const role = str(formData, "role") === "ADMIN" ? "ADMIN" : "STAFF";
  if (role === "STAFF") {
    const admins = await prisma.user.count({ where: { role: "ADMIN", active: true } });
    const target = await prisma.user.findUnique({ where: { id } });
    if (target?.role === "ADMIN" && target.active && admins <= 1) redirect("/people?msg=last_admin");
  }
  await prisma.user.update({ where: { id }, data: { role } });
  redirect("/people?msg=user_updated");
}

export async function toggleUser(formData: FormData) {
  const gate = await adminActor();
  if ("error" in gate) redirect("/login");
  const id = str(formData, "id");
  if (id === gate.user.id) redirect("/people?msg=cannot_self");
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) redirect("/people");
  if (target.active && target.role === "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN", active: true } });
    if (admins <= 1) redirect("/people?msg=last_admin");
  }
  await prisma.user.update({ where: { id }, data: { active: !target.active } });
  redirect("/people?msg=user_updated");
}

export async function addTechnician(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await adminActor();
  if ("error" in gate) return gate;
  const name = clip(str(formData, "name"), 80);
  const kindRaw = str(formData, "kind");
  const kind = kindRaw === "WORKSHOP" || kindRaw === "BOTH" ? kindRaw : "FIELD";
  if (!name) return { error: "name_required" };
  await prisma.technician.create({ data: { name, kind } });
  redirect("/people?msg=tech_saved");
}

export async function toggleTechnician(formData: FormData) {
  const gate = await adminActor();
  if ("error" in gate) redirect("/login");
  const id = str(formData, "id");
  const tech = await prisma.technician.findUnique({ where: { id } });
  if (!tech) redirect("/people");
  await prisma.technician.update({ where: { id }, data: { active: !tech.active } });
  redirect("/people?msg=tech_saved");
}
