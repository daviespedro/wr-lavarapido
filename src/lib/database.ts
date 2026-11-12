import { services } from './data';
import type { Client, Database } from './types';
const isClient = (c: Client) => c && typeof c.phone === 'string' && /^\d{10,11}$/.test(c.phone) && typeof c.name === 'string' && typeof c.model === 'string' && typeof c.plate === 'string' && Number.isSafeInteger(c.visits) && c.visits >= 0;
const isDate = (value: string) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && date.getFullYear() === Number(value.slice(0, 4)) && date.getMonth() + 1 === Number(value.slice(5, 7)) && date.getDate() === Number(value.slice(8, 10));
};
const unique = (values: string[]) => new Set(values).size === values.length;
export function validateDatabase(value: unknown): Database {
  const db = value as Database;
  if (!db || db.version !== 2 || !Array.isArray(db.clients) || !Array.isArray(db.vehicles) || !Array.isArray(db.transactions)
    || !db.clients.every(isClient)
    || !db.vehicles.every(v => v && typeof v.id === 'string' && v.id.length > 0 && Number.isSafeInteger(v.amount) && v.amount > 0 && isClient(v.client) && services.some(s => s.id === v.serviceId) && ['Aguardando', 'Em lavagem', 'Pronto'].includes(v.status) && typeof v.arrivedAt === 'string' && !Number.isNaN(Date.parse(v.arrivedAt)))
    || !db.transactions.every(t => t && typeof t.id === 'string' && t.id.length > 0 && isDate(t.date) && typeof t.description === 'string' && t.description.trim().length > 0 && (t.vehicleId === undefined || typeof t.vehicleId === 'string') && ['entrada', 'saida'].includes(t.type) && Number.isSafeInteger(t.amount) && t.amount > 0 && typeof t.createdAt === 'string' && !Number.isNaN(Date.parse(t.createdAt)))) {
    throw new Error('Os dados salvos não puderam ser lidos. Preserve uma cópia do localStorage antes de restaurar o armazenamento.');
  }
  if (!unique(db.clients.map(c => c.phone)) || !unique(db.vehicles.map(v => v.id)) || !unique(db.vehicles.map(v => v.client.plate)) || !unique(db.transactions.map(t => t.id)) || !unique(db.transactions.filter(t => t.vehicleId !== undefined).map(t => t.vehicleId!))) {
    throw new Error('O arquivo contém registros duplicados e não pode ser restaurado.');
  }
  return db;
}
