import { Transaction, Expense, PaymentMethod } from "../types";

type ReportTotals = {
  sales: number;
  expenses: number;
  collected: number;
  cashCollected: number;
  vodafoneCollected: number;
  cardCollected: number;
  debt: number;
  cashBalance: number;
};

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

export function calcReportTotals(
  transactions: Transaction[],
  expensesList: Expense[]
): ReportTotals {
  const salesTx = transactions.filter(t => t.type === "sale");

  const sales = sum(salesTx.map(t => t.total || 0));

  const expenses = sum(expensesList.map(e => e.amount || 0));

  // كل التحصيل = مجموع الدفعات
  const collected = sum(
    salesTx.flatMap(t => (t.payments || []).map(p => p.amount || 0))
  );

  const collectedByMethod = (method: PaymentMethod) =>
    sum(
      salesTx.flatMap(t =>
        (t.payments || [])
          .filter(p => p.method === method)
          .map(p => p.amount || 0)
      )
    );

  const cashCollected = collectedByMethod("cash");
  const vodafoneCollected = collectedByMethod("vodafone_cash");
  const cardCollected = collectedByMethod("credit"); // لو بتستخدمها كطريقة دفع للدفعة نفسها
  // ملاحظة: لو عندك method = "card" بدل "credit" عدّلها

  // إجمالي المديونية = إجمالي كل فاتورة - المدفوع عليها
  const debt = sum(
    salesTx.map(t => {
      const paid = sum((t.payments || []).map(p => p.amount || 0));
      return Math.max(0, (t.total || 0) - paid);
    })
  );

  const cashBalance = collected - expenses;

  return {
    sales,
    expenses,
    collected,
    cashCollected,
    vodafoneCollected,
    cardCollected,
    debt,
    cashBalance
  };
}
