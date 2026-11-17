import { useSyncExternalStore } from 'react';
import { createEmptyDatabase } from './data';
import type { Database, RecurringExpense } from './types';
import { clientsByPlate } from './business';
import { validateDatabase } from './database';
import { applyRecurring, EXPENSES_KEY, LEGACY_EXPENSES_KEY, LOGS_KEY, validateExpenses, validateLogs } from './recurring';

export const TRANSACTIONS_KEY = 'transacoes';
const CLIENTS_KEY = 'wr_clientes';
export const STORAGE_KEY = 'wr-lava-rapido:v2';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
let snapshot: { db: Database; expenses: RecurringExpense[]; error: string | null };
const read = (key: string, fallback: unknown) => {
  const raw = localStorage.getItem(key);
  return raw === null ? fallback : JSON.parse(raw);
};
const readDatabase = () => {
  const db = validateDatabase(read(STORAGE_KEY, createEmptyDatabase()));
  const transactions = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) ?? 'null');
  const stored = validateDatabase({ ...db, clientVehicles: read(CLIENTS_KEY, []) }).clientVehicles ?? [];
  const combined = validateDatabase({ ...db, transactions: transactions ?? db.transactions, clientVehicles: [...stored, ...(db.clientVehicles ?? [])] });
  const vehicles = [...clientsByPlate(combined).values()];
  const byPhone = new Map(vehicles.map(client => [client.phone, client]));
  for (const client of combined.clients) byPhone.set(client.phone, client);
  return { ...combined, clients: [...byPhone.values()], clientVehicles: vehicles };
};
const readExpenses = () => validateExpenses(read(EXPENSES_KEY, null) ?? read(LEGACY_EXPENSES_KEY, []));
const readLogs = () => validateLogs(read(LOGS_KEY, null) ?? []);
const save = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));
function refresh() {
  try {
    const db = readDatabase(), expenses = readExpenses();
    readLogs();
    snapshot = { db, expenses, error: null };
  } catch (error) {
    snapshot = { db: snapshot?.db ?? createEmptyDatabase(), expenses: snapshot?.expenses ?? [], error: error instanceof Error ? error.message : 'Não foi possível acessar os dados do navegador.' };
  }
  emit();
}
refresh();
window.addEventListener('storage', event => {
  if (event.key === null || [STORAGE_KEY, CLIENTS_KEY, TRANSACTIONS_KEY, EXPENSES_KEY, LEGACY_EXPENSES_KEY, LOGS_KEY].includes(event.key)) refresh();
});
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export const useDatabase = () => useSyncExternalStore(subscribe, () => snapshot);
export function commitDatabase(update: (current: Database) => Database) {
  if (snapshot.error) throw new Error(snapshot.error);
  const next = update(readDatabase());
  save(TRANSACTIONS_KEY, next.transactions);
  save(STORAGE_KEY, next);
  const clients = JSON.stringify([...clientsByPlate(next).values()]);
  if (localStorage.getItem(CLIENTS_KEY) !== clients) localStorage.setItem(CLIENTS_KEY, clients);
  refresh();
}
export function processRecurring(period: string, today = new Date()) {
  const db = readDatabase();
  const storedLogs = JSON.parse(localStorage.getItem(LOGS_KEY) ?? 'null') ?? [];
  const logs = validateLogs(storedLogs);
  const expenses = validateExpenses(JSON.parse(localStorage.getItem(EXPENSES_KEY) ?? 'null')
    ?? JSON.parse(localStorage.getItem(LEGACY_EXPENSES_KEY) ?? 'null') ?? []);
  const next = applyRecurring(db, expenses, logs, period, today);
  if (localStorage.getItem(EXPENSES_KEY) === null && localStorage.getItem(LEGACY_EXPENSES_KEY) !== null) {
    save(EXPENSES_KEY, expenses);
  }
  const hasChanges = next.hasChanges || JSON.stringify(storedLogs) !== JSON.stringify(next.logs);
  if (hasChanges) {
    save(TRANSACTIONS_KEY, next.db.transactions);
    save(LOGS_KEY, next.logs);
    refresh();
  }
}

export function updateRecurring(update: (expenses: RecurringExpense[]) => RecurringExpense[]) {
  if (snapshot.error) throw new Error(snapshot.error);
  save(EXPENSES_KEY, validateExpenses(update(readExpenses())));
  refresh();
}

type StorageEntries = Record<string, string>;
export function exportBackup() {
  const storage = Object.fromEntries(Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)!)
    .map(key => [key, localStorage.getItem(key)!]));
  return { format: 'wr-local-storage', storage } as const;
}
export function parseBackup(value: unknown): StorageEntries {
  const backup = value as { format?: unknown; storage?: unknown } | null;
  if (backup?.format !== 'wr-local-storage') return { [STORAGE_KEY]: JSON.stringify(validateDatabase(value)) };
  const storage = backup.storage;
  if (!storage || typeof storage !== 'object' || Array.isArray(storage) || !Object.values(storage).every(v => typeof v === 'string')) throw new Error('Backup inválido.');
  const entries = storage as StorageEntries;
  if (Object.hasOwn(entries, STORAGE_KEY)) validateDatabase(JSON.parse(entries[STORAGE_KEY]));
  if (Object.hasOwn(entries, CLIENTS_KEY)) validateDatabase({ ...createEmptyDatabase(), clientVehicles: JSON.parse(entries[CLIENTS_KEY]) });
  if (Object.hasOwn(entries, TRANSACTIONS_KEY)) validateDatabase({ ...createEmptyDatabase(), transactions: JSON.parse(entries[TRANSACTIONS_KEY]) });
  if (Object.hasOwn(entries, LEGACY_EXPENSES_KEY)) validateExpenses(JSON.parse(entries[LEGACY_EXPENSES_KEY]));
  if (Object.hasOwn(entries, EXPENSES_KEY)) validateExpenses(JSON.parse(entries[EXPENSES_KEY]));
  if (Object.hasOwn(entries, LOGS_KEY)) validateLogs(JSON.parse(entries[LOGS_KEY]));
  return entries;
}
export function restoreBackup(entries: StorageEntries) {
  const previous = exportBackup().storage;
  const replace = (values: StorageEntries) => {
    localStorage.clear();
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
  };
  try { replace(entries); }
  catch (error) { replace(previous); throw error; }
  refresh();
}
export function exportDatabase() {
  if (snapshot.error) throw new Error(snapshot.error);
  return readDatabase();
}
