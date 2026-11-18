import type { Client, Database, PaymentMethod, ReceptionInput, Transaction, Vehicle } from './types';
import { digits, localDate, normalizePlate } from './format';
import { paymentMethods } from './types';
import { services, serviceName } from './data';
export function registerVehicle(db: Database, input: ReceptionInput, id: string, now: string, catalog = services): Database {
  const phone = digits(input.phone);
  const plate = normalizePlate(input.plate);
  if (!/^\d{10,11}$/.test(phone)) throw new Error('Informe um telefone válido com DDD.');
  if (!input.name.trim() || !input.model.trim()) throw new Error('Preencha o nome e o modelo do veículo.');
  if (plate && !/^[A-Z]{3}\d[A-Z\d]\d{2}$/.test(plate)) throw new Error('Informe uma placa válida (ABC1D23 ou ABC1234).');
  const service = catalog.find(s => s.id === input.serviceId);
  if (!service) throw new Error('Selecione um serviço.');
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) throw new Error('Informe um valor válido maior que zero.');
  if (plate && db.vehicles.some(v => normalizePlate(v.client.plate) === plate)) throw new Error('Este veículo já está no pátio.');
  const owner = plate ? clientsByPlate(db).get(plate)
    ?? [...db.vehicles, ...(db.completed ?? [])].find(vehicle => normalizePlate(vehicle.client.plate) === plate)?.client : undefined;
  if (owner && owner.phone !== phone) throw new Error('Esta placa está vinculada a outro cliente.');
  const previous = db.clients.find(c => c.phone === phone);
  const client = { phone, name: input.name.trim(), model: input.model.trim(), plate, visits: (previous?.visits ?? 0) + 1 };
  const vehicle: Vehicle = { id, client, serviceId: input.serviceId, serviceName: service.name, amount: input.amount, status: 'Aguardando', arrivedAt: now };
  return { ...db, ...(db.removedClientVehicles && { removedClientVehicles: db.removedClientVehicles.filter(key => key !== registryKey(client)) }), clients: [...db.clients.filter(c => c.phone !== phone), client], vehicles: [...db.vehicles, vehicle] };
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
      return t.type === 'entrada' && t.vehicleId && !known.has(t.vehicleId) && (match || t.serviceClient)
        ? [{ id: t.vehicleId, plate: t.serviceClient?.plate ?? match?.[1] ?? '', phone: t.serviceClient?.phone, model: undefined, description: t.description, amount: t.amount, date: t.date }]
        : [];
    }),
  ].sort((a, b) => b.date.localeCompare(a.date));
}
export function hasVehicleIncome(db: Database, vehicleId: string) {
  return db.transactions.some(transaction => transaction.vehicleId === vehicleId);
}

export const clientVehicleKey = (client: Client) =>
  normalizePlate(client.plate) || `${client.phone}:${client.model.trim().toLowerCase()}`;
const registryKey = (client: Client) => `${client.phone}|${clientVehicleKey(client)}`;

export function clientsByPlate(db: Database) {
  const clients = new Map<string, Client>();
  const removed = new Set(db.removedClientVehicles);
  const candidates = [...(db.completed ?? []).map(v => v.client), ...db.vehicles.map(v => v.client),
    ...(db.clientVehicles ?? []), ...db.clients];
  for (const client of candidates) {
    if (!removed.has(registryKey(client))) clients.set(clientVehicleKey(client), { ...client, plate: normalizePlate(client.plate) });
  }
  return clients;
}

export function registerClient(db: Database, input: Pick<Client, 'name' | 'phone' | 'model' | 'plate'>, completeMissingPlate = false): Database {
  const name = input.name.trim(), model = input.model.trim();
  const phone = digits(input.phone);
  const plate = normalizePlate(input.plate);
  if (!name || !model) throw new Error('Informe o nome e o modelo do veículo.');
  if (!/^\d{10,11}$/.test(phone)) throw new Error('Informe um telefone válido com DDD.');
  if (plate && !/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(plate)) throw new Error('Informe uma placa válida.');
  if (plate && (clientsByPlate(db).has(plate) || db.vehicles.some(vehicle => normalizePlate(vehicle.client.plate) === plate) || serviceHistory(db).some(service => service.plate === plate))) throw new Error('Esta placa já está cadastrada no sistema');
  if (completeMissingPlate && plate) {
    const existing = clientsByPlate(db).get(clientVehicleKey({ name, phone, model, plate: '', visits: 0 }));
    if (existing) return updateClientVehicle(db, existing, model, plate);
  }
  if (!plate && [...clientsByPlate(db).values()].some(client => !client.plate && client.phone === phone && client.model.toLowerCase() === model.toLowerCase())) {
    throw new Error('Este modelo sem placa já está vinculado ao cliente.');
  }
  const previous = db.clients.find(client => client.phone === phone);
  const client = { name, phone, model, plate, visits: previous?.visits ?? 0 };
  return { ...db, ...(db.removedClientVehicles && { removedClientVehicles: db.removedClientVehicles.filter(key => key !== registryKey(client)) }), clientVehicles: [...clientsByPlate(db).values(), client],
    clients: [...db.clients.filter(entry => entry.phone !== phone), client] };
}


export function deleteService(db: Database, id: string): Database {
  const vehicle = db.vehicles.find(entry => entry.id === id) ?? db.completed?.find(entry => entry.id === id);
  const legacy = vehicle ? undefined : serviceHistory(db).find(entry => entry.id === id);
  if (!vehicle && !legacy) throw new Error('Este serviço já foi removido.');
  const registry = clientsByPlate(db);
  const phone = vehicle?.client.phone ?? (legacy?.phone ?? (legacy?.plate ? registry.get(legacy.plate)?.phone : undefined));
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

export function deleteTransaction(db: Database, id: string): Database {
  const transaction = db.transactions.find(entry => entry.id === id);
  if (!transaction) throw new Error('Este lançamento já foi removido.');
  const serviceId = transaction.type === 'entrada' ? transaction.vehicleId : undefined;
  if (serviceId && serviceHistory(db).some(service => service.id === serviceId)) {
    return deleteService(db, serviceId);
  }
  return { ...db, transactions: db.transactions.filter(entry => entry.id !== id) };
}


export function updateClientDetails(db: Database, originalPhone: string, name: string, rawPhone: string): Database {
  const phone = digits(rawPhone);
  if (!name.trim() || !/^\d{10,11}$/.test(phone)) throw new Error('Informe um nome e um telefone válido com DDD.');
  if (phone !== originalPhone && db.clients.some(client => client.phone === phone)) throw new Error('Este telefone já está cadastrado.');
  const update = (client: Client) => client.phone === originalPhone ? { ...client, phone, name: name.trim() } : client;
  return {
    ...updateServiceClients(db, update),
    removedClientVehicles: db.removedClientVehicles?.map(key => {
      if (!key.startsWith(`${originalPhone}|`)) return key;
      const vehicleKey = key.slice(originalPhone.length + 1);
      return `${phone}|${vehicleKey.startsWith(`${originalPhone}:`) ? phone + vehicleKey.slice(originalPhone.length) : vehicleKey}`;
    }),
  };
}

export function updateClientVehicle(db: Database, original: Client, rawModel: string, rawPlate: string): Database {
  const model = rawModel.trim(), plate = normalizePlate(rawPlate);
  if (!model) throw new Error('Informe o modelo do veículo.');
  if (plate && !/^[A-Z]{3}\d[A-Z\d]\d{2}$/.test(plate)) throw new Error('Informe uma placa válida.');
  const matches = (client: Client) => registryKey(client) === registryKey(original);
  const updated = { ...original, model, plate };
  if ([...clientsByPlate(db).values()].some(client => !matches(client) && clientVehicleKey(client) === clientVehicleKey(updated))
    || (plate && plate !== normalizePlate(original.plate) && (
      db.vehicles.some(vehicle => normalizePlate(vehicle.client.plate) === plate)
      || serviceHistory(db).some(entry => entry.plate === plate)
    ))) {
    throw new Error('Este veículo já está cadastrado.');
  }
  return updateServiceClients(db, client => matches(client) ? { ...client, model, plate } : client);
}

function updateServiceClients(db: Database, update: (client: Client) => Client): Database {
  const vehicles = [...db.vehicles, ...(db.completed ?? [])];
  const byId = new Map(vehicles.map(vehicle => [vehicle.id, vehicle]));
  const registry = clientsByPlate(db);
  const mapVehicle = <T extends Vehicle>(vehicle: T): T => ({ ...vehicle, client: update(vehicle.client) });
  return {
    ...db,
    clients: db.clients.map(update),
    clientVehicles: [...clientsByPlate(db).values()].map(update),
    vehicles: db.vehicles.map(mapVehicle),
    completed: db.completed?.map(mapVehicle),
    transactions: db.transactions.map(entry => {
      if (entry.type !== 'entrada' || !entry.vehicleId) return entry;
      const vehicle = byId.get(entry.vehicleId);
      if (vehicle) {
        const client = update(vehicle.client);
        if (client.model === vehicle.client.model && client.plate === vehicle.client.plate) return entry;
        return { ...entry, description: `${serviceName(vehicle)} — ${client.model}${client.plate ? ` (${client.plate})` : ''}` };
      }
      const plate = / \(([A-Z]{3}\d[A-Z\d]\d{2})\)$/.exec(entry.description)?.[1];
      const previous = entry.serviceClient ?? (plate ? registry.get(plate) : undefined);
      if (!previous) return entry;
      const client = update(previous);
      if (client === previous) return entry;
      if (client.model === previous.model && client.plate === previous.plate) return { ...entry, serviceClient: client };
      const separator = entry.description.indexOf(' — ');
      if (separator < 0) return entry;
      return { ...entry, serviceClient: client, description: `${entry.description.slice(0, separator)} — ${client.model}${client.plate ? ` (${client.plate})` : ''}` };
    }),
  };
}

export function removeClientVehicle(db: Database, vehicle: Client): Database {
  const key = registryKey(vehicle);
  const transactions = db.transactions.map(entry => vehicle.plate && entry.type === 'entrada' && entry.vehicleId
    && !entry.serviceClient && entry.description.endsWith(` (${vehicle.plate})`) ? { ...entry, serviceClient: vehicle } : entry);
  return { ...db, transactions, removedClientVehicles: [...new Set([...(db.removedClientVehicles ?? []), key])],
    clientVehicles: [...clientsByPlate(db).values()].filter(client => registryKey(client) !== key) };
}


export function deleteClient(db: Database, phone: string): Database {
  const registered = [...clientsByPlate(db).values()].filter(client => client.phone === phone);
  const detached = registered.reduce((current, vehicle) => removeClientVehicle(current, vehicle), db);
  return { ...detached, clients: detached.clients.filter(client => client.phone !== phone) };
}
