import { localDate } from './format';
import type { Database, RecurringExpense, RecurringLog, Transaction } from './types';

export const EXPENSES_KEY = 'despesas_recorrentes';
export const LEGACY_EXPENSES_KEY = 'wr-lava-rapido:recurring_expenses';
export const LOGS_KEY = 'processed_recurring_logs';

const positiveInteger = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const validId = (value: unknown): value is string | number => (typeof value === 'string' && value.length > 0) || positiveInteger(value);

export function validateExpenses(value: unknown): RecurringExpense[] {
  const message = 'Despesas recorrentes inválidas. Informe descrição, valor positivo e dia de 1 a 31.';
  if (!Array.isArray(value)) throw new Error(message);
  const expenses = value.map(expense => {
    const { id, dia_vencimento } = expense ?? {};
    const descricao = expense?.descricao ?? expense?.description;
    const valor = expense?.valor ?? expense?.amount;
    if (!validId(id) || typeof descricao !== 'string' || !descricao.trim() || !positiveInteger(valor)
      || !positiveInteger(dia_vencimento) || dia_vencimento > 31) throw new Error(message);
    return { id, descricao, valor, dia_vencimento };
  });
  if (new Set(expenses.map(expense => String(expense.id))).size !== expenses.length) throw new Error(message);
  return expenses;
}

export function validateLogs(value: unknown): RecurringLog[] {
  const message = 'Histórico de despesas recorrentes inválido.';
  if (!Array.isArray(value)) throw new Error(message);
  const logs = value.map(log => {
    const id_despesa = log?.id_despesa ?? log?.expenseId;
    const mes = log?.mes ?? log?.month;
    const ano = log?.ano ?? log?.year;
    if (!validId(id_despesa) || !positiveInteger(mes) || mes > 12 || !positiveInteger(ano)) throw new Error(message);
    return { id_despesa, mes, ano };
  });
  if (new Set(logs.map(log => JSON.stringify([String(log.id_despesa), log.mes, log.ano]))).size !== logs.length) throw new Error(message);
  return logs;
}

export function applyRecurring(db: Database, expenses: RecurringExpense[], logs: RecurringLog[], period: string, today: Date) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period) || period.startsWith('0000-')) throw new Error('Selecione um mês e ano válidos.');
  const [ano, mes] = period.split('-').map(Number);
  const currentDate = localDate(today);
  const done = new Set(logs.filter(log => log.mes === mes && log.ano === ano).map(log => String(log.id_despesa)));
  const existing = new Set(db.transactions.map(transaction => transaction.id));
  const transactions: Transaction[] = [];
  const processed = [...logs];

  for (const despesa of expenses) {
    const date = `${period}-${String(despesa.dia_vencimento).padStart(2, '0')}`;
    const due = new Date(`${date}T12:00:00`);
    if (date > currentDate || due.getDate() !== despesa.dia_vencimento || done.has(String(despesa.id))) continue;

    // Keep the same ID as older versions to recover a missing flag without a second charge.
    const id = `recurring:${ano}-${mes}:${despesa.id}`;
    if (!existing.has(id)) {
      transactions.push({
        id,
        date,
        description: despesa.descricao,
        type: 'saida',
        amount: despesa.valor,
        createdAt: today.toISOString(),
      });
    }
    processed.push({ id_despesa: despesa.id, mes, ano });
  }

  const next = transactions.length ? { ...db, transactions: [...db.transactions, ...transactions] } : db;
  return { db: next, logs: processed };
}
