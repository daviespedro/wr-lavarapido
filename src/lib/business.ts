import type { Database, ReceptionInput, Transaction, Vehicle } from './types';
import { digits, localDate } from './format';
import { services } from './data';
export function registerVehicle(db: Database, input: ReceptionInput, id: string, now: string): Database {
  const phone = digits(input.phone);
  const plate = input.plate.replace(/[^a-z0-9]/gi, '').toUpperCase();
  if (!/^\d{10,11}$/.test(phone)) throw new Error('Informe um telefone válido com DDD.');
  if (!input.name.trim() || !input.model.trim()) throw new Error('Preencha o nome e o modelo do veículo.');
  if (!/^[A-Z]{3}\d[A-Z\d]\d{2}$/.test(plate)) throw new Error('Informe uma placa válida (ABC1D23 ou ABC1234).');
  if (!services.some(s => s.id === input.serviceId)) throw new Error('Selecione um serviço.');
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) throw new Error('Informe um valor válido maior que zero.');
  if (db.vehicles.some(v => v.client.plate === plate)) throw new Error('Este veículo já está no pátio.');
  const previous = db.clients.find(c => c.phone === phone);
  const client = { phone, name: input.name.trim(), model: input.model.trim(), plate, visits: (previous?.visits ?? 0) + 1 };
  const vehicle: Vehicle = { id, client, serviceId: input.serviceId, amount: input.amount, status: 'Aguardando', arrivedAt: now };
  const next = recordVehicleIncome(db, vehicle, `reception-${id}`, now, localDate(new Date(now)));
  return { ...next, clients: [...db.clients.filter(c => c.phone !== phone), client], vehicles: [...db.vehicles, vehicle] };
}
export function addTransaction(db: Database, transaction: Transaction): Database {
  if (!transaction.description.trim()) throw new Error('Informe a descrição da transação.');
  if (!Number.isSafeInteger(transaction.amount) || transaction.amount <= 0) throw new Error('Informe um valor válido maior que zero.');
  const date = new Date(`${transaction.date}T12:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(transaction.date) || Number.isNaN(date.getTime()) || date.getFullYear() !== Number(transaction.date.slice(0, 4)) || date.getMonth() + 1 !== Number(transaction.date.slice(5, 7)) || date.getDate() !== Number(transaction.date.slice(8, 10))) throw new Error('Informe uma data válida.');
  if (transaction.type !== 'entrada' && transaction.type !== 'saida') throw new Error('Tipo de transação inválido.');
  return { ...db, transactions: [...db.transactions, { ...transaction, description: transaction.description.trim() }] };
}
export function dailyLedger(transactions: Transaction[], day: string) {
  return periodLedger(transactions.filter(t => t.date === day));
}
export function monthlyLedger(transactions: Transaction[], month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Selecione um mês e ano válidos.');
  return periodLedger(transactions.filter(t => t.date.slice(0, 7) === month));
}
function periodLedger(transactions: Transaction[]) {
  let balance = 0, income = 0, expenses = 0;
  const rows = [...transactions]
    .sort((a, b) => a.date.localeCompare(b.date) || Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id))
    .map(t => {
      if (t.type === 'entrada') { income += t.amount; balance += t.amount; }
      else { expenses += t.amount; balance -= t.amount; }
      return { ...t, balance };
    });
  return { rows, income, expenses, balance };
}
export function finishVehicle(db: Database, id: string, transactionId: string, now: string, day: string): Database {
  const vehicle = db.vehicles.find(v => v.id === id);
  if (!vehicle) throw new Error('Este atendimento já foi concluído.');
  if (vehicle.status !== 'Pronto') throw new Error('Marque o veículo como pronto antes de finalizar.');
  const next = hasVehicleIncome(db, id) ? db : recordVehicleIncome(db, vehicle, transactionId, now, day);
  return { ...next, vehicles: db.vehicles.filter(v => v.id !== id) };
}
export function hasVehicleIncome(db: Database, vehicleId: string) {
  return db.transactions.some(transaction => transaction.vehicleId === vehicleId);
}
function recordVehicleIncome(db: Database, vehicle: Vehicle, id: string, now: string, day: string): Database {
  const service = services.find(s => s.id === vehicle.serviceId)!;
  return addTransaction(db, {
    id, date: day, description: `${service.name} — ${vehicle.client.model} (${vehicle.client.plate})`,
    type: 'entrada', amount: vehicle.amount, createdAt: now, vehicleId: vehicle.id,
  });
}
