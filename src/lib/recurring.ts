import { localDate } from './format';
import type { Database, RecurringExpense, RecurringLog } from './types';

export const EXPENSES_KEY = 'wr-lava-rapido:recurring_expenses';
export const LOGS_KEY = 'processed_recurring_logs';
const positiveInteger = (value: number) => Number.isSafeInteger(value) && value > 0;

export function validateExpenses(value: unknown): RecurringExpense[] {
  const expenses = value as RecurringExpense[];
  if (!Array.isArray(expenses) || !expenses.every(e => e && typeof e.id === 'string' && e.id.length > 0 && typeof e.description === 'string' && !!e.description.trim() && positiveInteger(e.amount) && positiveInteger(e.dia_vencimento) && e.dia_vencimento <= 31)
    || new Set(expenses.map(e => e.id)).size !== expenses.length) throw new Error('Despesas recorrentes inválidas. Informe descrição, valor positivo e dia de 1 a 31.');
  return expenses;
}
export function validateLogs(value: unknown): RecurringLog[] {
  const logs = value as RecurringLog[];
  if (!Array.isArray(logs) || !logs.every(l => l && typeof l.expenseId === 'string' && l.expenseId.length > 0 && positiveInteger(l.month) && l.month <= 12 && positiveInteger(l.year))
    || new Set(logs.map(l => JSON.stringify([l.expenseId, l.month, l.year]))).size !== logs.length) throw new Error('Histórico de despesas recorrentes inválido.');
  return logs;
}
export function applyRecurring(db: Database, expenses: RecurringExpense[], logs: RecurringLog[], today: Date) {
  const month = today.getMonth() + 1, year = today.getFullYear(), day = localDate(today);
  const done = new Set(logs.filter(l => l.month === month && l.year === year).map(l => l.expenseId));
  const existing = new Set(db.transactions.map(t => t.id));
  let next = db;
  const processed = [...logs];
  for (const expense of expenses) {
    if (expense.dia_vencimento > today.getDate() || done.has(expense.id)) continue;
    const id = `recurring:${year}-${month}:${expense.id}`;
    // If a previous save stopped before recording the flag, recover it without charging again.
    if (!existing.has(id)) {
      next = { ...next, transactions: [...next.transactions, { id, date: day, createdAt: today.toISOString(), description: expense.description.trim(), type: 'saida', amount: expense.amount }] };
    }
    processed.push({ expenseId: expense.id, month, year });
  }
  return { db: next, logs: processed };
}
