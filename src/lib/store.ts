import { useSyncExternalStore } from 'react';
import { createEmptyDatabase } from './data';
import type { Database } from './types';

import { validateDatabase } from './database';

export const STORAGE_KEY = 'wr-lava-rapido:v2';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
let snapshot: { db: Database; error: string | null };
function readDatabase() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? validateDatabase(JSON.parse(raw)) : createEmptyDatabase();
}
try {
  const db = readDatabase();
  if (localStorage.getItem(STORAGE_KEY) === null) localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  snapshot = { db, error: null };
} catch (error) {
  snapshot = { db: { version: 2, clients: [], vehicles: [], transactions: [] }, error: error instanceof Error ? error.message : 'Não foi possível acessar os dados do navegador.' };
}
window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY || event.key === null) {
    try { snapshot = { db: readDatabase(), error: null }; }
    catch { snapshot = { ...snapshot, error: 'Os dados do navegador mudaram, mas não puderam ser lidos.' }; }
    emit();
  }
});
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export const useDatabase = () => useSyncExternalStore(subscribe, () => snapshot);
export function commitDatabase(update: (current: Database) => Database) {
  if (snapshot.error) throw new Error(snapshot.error);
  // A single key commits client history, yard and ledger together. Read the latest
  // storage value first so sequential actions from another tab are preserved.
  let next: Database;
  try { next = update(readDatabase()); }
  catch (error) { throw error instanceof Error ? error : new Error('Não foi possível ler os dados.'); }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
  catch { throw new Error('Não foi possível salvar. O armazenamento está indisponível ou cheio; seus dados anteriores foram preservados.'); }
  snapshot = { db: next, error: null };
  emit();
}

// Restore deliberately bypasses an unreadable snapshot so a valid backup can recover it.
export function restoreDatabase(value: unknown) {
  const db = validateDatabase(value);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }
  catch { throw new Error('Não foi possível restaurar. O armazenamento está indisponível ou cheio; os dados atuais foram preservados.'); }
  snapshot = { db, error: null };
  emit();
}
export function exportDatabase() {
  if (snapshot.error) throw new Error(snapshot.error);
  return readDatabase();
}
