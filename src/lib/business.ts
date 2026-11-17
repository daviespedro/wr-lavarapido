import type { Client, Database, PaymentMethod, ReceptionInput, Transaction, Vehicle } from './types';
import { digits, localDate } from './format';
import { paymentMethods } from './types';
import { services, serviceName } from './data';
export function registerVehicle(db: Database, input: ReceptionInput, id: string, now: string, catalog = services): Database {
  const phone = digits(input.phone);
  const plate = input.plate.replace(/[^a-z0-9]/gi, '').toUpperCase();
  if (!/^\d{10,11}$/.test(phone)) throw new Error('Informe um telefone válido com DDD.');
  if (!input.name.trim() || !input.model.trim()) throw new Error('Preencha o nome e o modelo do veículo.');
  if (plate && !/^[A-Z]{3}\d[A-Z\d]\d{2}$/.test(plate)) throw new Error('Informe uma placa válida (ABC1D23 ou ABC1234).');
  const service = catalog.find(s => s.id === input.serviceId);
  if (!service) throw new Error('Selecione um serviço.');
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) throw new Error('Informe um valor válido maior que zero.');
  if (plate && db.vehicles.some(v => v.client.plate === plate)) throw new Error('Este veículo já está no pátio.');
  const owner = plate ? clientsByPlate(db).get(plate) : undefined;
  if (owner && owner.phone !== phone) throw new Error('Esta placa está vinculada a outro cliente.');
  const previous = db.clients.find(c => c.phone === phone);
  const client = { phone, name: input.name.trim(), model: input.model.trim(), plate, visits: (previous?.visits ?? 0) + 1 };
  const vehicle: Vehicle = { id, client, serviceId: input.serviceId, serviceName: service.name, amount: input.amount, status: 'Aguardando', arrivedAt: now };
  return { ...db, clients: [...db.clients.filter(c => c.phone !== phone), client], vehicles: [...db.vehicles, vehicle] };
}
export function addTransaction(db: Database, transaction: Transaction): Database {
  if (!transaction.description.trim()) throw new Error('Informe a descrição da transação.');
  if (!Number.isSafeInteger(transaction.amount) || transaction.amount <= 0) throw new Error('Informe um valor válido maior que zero.');
  const date = new Date(`${transaction.date}T12:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(transaction.date) || Number.isNaN(date.getTime()) || date.getFullYear() !== Number(transaction.date.slice(0, 4)) || date.getMonth() + 1 !== Number(transaction.date.slice(5, 7)) || date.getDate() !== Number(transaction.date.slice(8, 10))) throw new Error('Informe uma data válida.');
  if (transaction.type !== 'entrada' && transaction.type !== 'saida') throw new Error('Tipo de transação inválido.');
  return { ...db, transactions: [...db.transactions, { ...transaction, description: transaction.description.trim() }] };
}
export function dailyLedger(transactions: Transaction[], day: string, initial = 0) {
  return accountLedger(transactions, day, t => t.date === day, initial);
}
export function monthlyLedger(transactions: Transaction[], month: string, initial = 0) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Selecione um mês e ano válidos.');
  return accountLedger(transactions, `${month}-01`, t => t.date.slice(0, 7) === month, initial);
}
function accountLedger(transactions: Transaction[], start: string, inPeriod: (transaction: Transaction) => boolean, initial: number) {
  const previousBalance = transactions.reduce((balance, transaction) => {
    if (transaction.date >= start) return balance;
    return balance + (transaction.type === 'entrada'
      ? transaction.amount - cardFee(transaction.amount, transaction.payment)
      : -transaction.amount);
  }, initial);
  return { ...periodLedger(transactions.filter(inPeriod), previousBalance), previousBalance };
}
function periodLedger(transactions: Transaction[], previousBalance: number) {
  let balance = previousBalance, income = 0, expenses = 0, fees = 0;
  const rows = [...transactions]
    .sort((a, b) => a.date.localeCompare(b.date) || Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id))
    .map(t => {
      if (t.type === 'entrada') { const fee = cardFee(t.amount, t.payment); fees += fee; income += t.amount; balance += t.amount - fee; }
      else { expenses += t.amount; balance -= t.amount; }
      return { ...t, balance };
    });
  return { rows, income, expenses, fees, netIncome: income - fees, balance };
}
export function cardFee(amount: number, payment?: PaymentMethod) {
  return payment === 'Crédito' || payment === 'Débito' ? Math.round(amount * 0.03) : 0;
}
export function finishVehicle(db: Database, id: string, transactionId: string, now: string, day: string, payment: PaymentMethod): Database {
  const vehicle = db.vehicles.find(v => v.id === id);
  if (!vehicle) throw new Error('Este atendimento já foi concluído.');
  if (vehicle.status !== 'Finalizado') throw new Error('Marque o serviço como finalizado antes de fechar o atendimento.');
  if (!paymentMethods.includes(payment)) throw new Error('Selecione a forma de pagamento.');
  const existing = db.transactions.find(t => t.vehicleId === id);
  const next = existing
    ? { ...db, transactions: db.transactions.map(t => t === existing ? { ...t, payment } : t) }
    : addTransaction(db, {
      id: transactionId, date: day, description: `${serviceName(vehicle)} — ${vehicle.client.model}${vehicle.client.plate ? ` (${vehicle.client.plate})` : ''}`,
      type: 'entrada', amount: vehicle.amount, createdAt: now, vehicleId: id, payment,
    });
  return { ...next, vehicles: db.vehicles.filter(v => v.id !== id), completed: [...(db.completed ?? []), { ...vehicle, completedAt: now }] };
}
export function serviceHistory(db: Database) {
  const known = new Set([...db.vehicles, ...(db.completed ?? [])].map(v => v.id));
  // Older releases kept only the linked ledger entry after checkout.
  return [
    ...(db.completed ?? []).map(v => ({ id: v.id, plate: v.client.plate, phone: v.client.phone, model: v.client.model, description: serviceName(v), amount: v.amount, date: localDate(new Date(v.finalizedAt ?? v.completedAt)) })),
    ...db.vehicles.filter(v => v.status === 'Finalizado').map(v => ({ id: v.id, plate: v.client.plate, phone: v.client.phone, model: v.client.model, description: serviceName(v), amount: v.amount, date: localDate(new Date(v.finalizedAt ?? v.arrivedAt)) })),
    ...db.transactions.flatMap(t => {
      const match = / \(([A-Z]{3}\d[A-Z\d]\d{2})\)$/.exec(t.description);
      return t.type === 'entrada' && t.vehicleId && !known.has(t.vehicleId) && match
        ? [{ id: t.vehicleId, plate: match[1], phone: undefined, model: undefined, description: t.description, amount: t.amount, date: t.date }]
        : [];
    }),
  ].sort((a, b) => b.date.localeCompare(a.date));
}
export function hasVehicleIncome(db: Database, vehicleId: string) {
  return db.transactions.some(transaction => transaction.vehicleId === vehicleId);
}

export function clientsByPlate(db: Database) {
  const clients = new Map<string, Client>();
  for (const { client } of db.completed ?? []) clients.set(client.plate || `${client.phone}:${client.model.trim().toLowerCase()}`, client);
  for (const { client } of db.vehicles) clients.set(client.plate || `${client.phone}:${client.model.trim().toLowerCase()}`, client);
  for (const client of db.clientVehicles ?? []) clients.set(client.plate || `${client.phone}:${client.model.trim().toLowerCase()}`, client);
  for (const client of db.clients) clients.set(client.plate || `${client.phone}:${client.model.trim().toLowerCase()}`, client);
  return clients;
}

export function registerClient(db: Database, input: Pick<Client, 'name' | 'phone' | 'model' | 'plate'>): Database {
  const name = input.name.trim(), model = input.model.trim();
  const phone = digits(input.phone);
  const plate = input.plate.replace(/[^a-z0-9]/gi, '').toUpperCase();
  if (!name || !model) throw new Error('Informe o nome e o modelo do veículo.');
  if (!/^\d{10,11}$/.test(phone)) throw new Error('Informe um telefone válido com DDD.');
  if (plate && !/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(plate)) throw new Error('Informe uma placa válida.');
  if (plate && (clientsByPlate(db).has(plate) || serviceHistory(db).some(service => service.plate === plate))) throw new Error('Esta placa já está cadastrada no sistema');
  if (!plate && [...clientsByPlate(db).values()].some(client => !client.plate && client.phone === phone && client.model.toLowerCase() === model.toLowerCase())) {
    throw new Error('Este modelo sem placa já está vinculado ao cliente.');
  }
  const previous = db.clients.find(client => client.phone === phone);
  const client = { name, phone, model, plate, visits: previous?.visits ?? 0 };
  return { ...db, clientVehicles: [...clientsByPlate(db).values(), client],
    clients: [...db.clients.filter(entry => entry.phone !== phone), client] };
}


export function deleteService(db: Database, id: string): Database {
  const vehicle = db.vehicles.find(entry => entry.id === id) ?? db.completed?.find(entry => entry.id === id);
  const legacy = vehicle ? undefined : serviceHistory(db).find(entry => entry.id === id);
  if (!vehicle && !legacy) throw new Error('Este serviço já foi removido.');
  const registry = clientsByPlate(db);
  const phone = vehicle?.client.phone ?? (legacy?.plate ? registry.get(legacy.plate)?.phone : undefined);
  const decrement = (client: Client) => client.phone === phone
    ? { ...client, visits: Math.max(0, client.visits - 1) }
    : client;
  return {
    ...db,
    clients: db.clients.map(decrement),
    clientVehicles: [...registry.values()].map(decrement),
    vehicles: db.vehicles.filter(entry => entry.id !== id),
    completed: db.completed?.filter(entry => entry.id !== id),
    transactions: db.transactions.filter(entry => entry.type !== 'entrada' || entry.vehicleId !== id),
  };
}
