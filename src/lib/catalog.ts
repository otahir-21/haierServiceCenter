export const STARTER_PRODUCTS = [
  { nameEn: "Air Conditioner", nameUr: "ایئر کنڈیشنر" },
  { nameEn: "Refrigerator", nameUr: "ریفریجریٹر" },
  { nameEn: "Washing Machine", nameUr: "واشنگ مشین" },
  { nameEn: "Microwave Oven", nameUr: "مائیکروویو" },
  { nameEn: "LED TV", nameUr: "ایل ای ڈی ٹی وی" },
  { nameEn: "Water Dispenser", nameUr: "واٹر ڈسپنسر" },
  { nameEn: "Deep Freezer", nameUr: "ڈیپ فریزر" },
  { nameEn: "Other", nameUr: "دیگر" },
] as const;

export const EXPENSE_CATEGORIES = [
  "RENT",
  "SALARY",
  "ELECTRICITY",
  "GAS",
  "INTERNET",
  "TRANSPORT",
  "TEA",
  "OTHER",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const LABOR_CHARGE = 1000;
