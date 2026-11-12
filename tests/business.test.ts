import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyDatabase } from '../src/lib/data';
import { registerVehicle, addTransaction, dailyLedger, finishVehicle } from '../src/lib/business';
import { localDate, parseMoney } from '../src/lib/format';
const now = '2026-11-08T16:00:00.000Z';
const day = '2026-11-08';
const input = { phone: '(11) 98765-4321', name: 'Cliente', model: 'Veículo', plate: 'bra-2e19', serviceId: 'lavagem', amount: 12345 };

test('first use starts with no clients, vehicles or transactions and zero balances', () => {
  const db = createEmptyDatabase();
  assert.deepEqual(db, { version: 2, clients: [], vehicles: [], transactions: [] });
  assert.deepEqual(dailyLedger(db.transactions, day), { rows: [], income: 0, expenses: 0, balance: 0 });
});

test('customer history normalizes data, increments visits and rejects duplicate vehicles', () => {
  const db = createEmptyDatabase();
  db.clients.push({ phone: '11987654321', name: 'Nome anterior', model: 'Anterior', plate: 'ABC1234', visits: 2 });
  const next = registerVehicle(db, input, 'vehicle-1', now);
  assert.equal(next.clients[0].visits, 3);
  assert.equal(next.clients[0].name, input.name);
  assert.equal(next.clients.length, 1);
  assert.equal(next.vehicles[0].client.plate, 'BRA2E19');
  assert.equal(next.vehicles[0].status, 'Aguardando');
  assert.equal(next.vehicles[0].amount, 12345);
  assert.equal(next.transactions.length, 1);
  assert.equal(next.transactions[0].description, 'Lavagem Completa — Veículo (BRA2E19)');
  assert.equal(next.transactions[0].vehicleId, 'vehicle-1');
  assert.equal(next.transactions[0].type, 'entrada');
  assert.equal(dailyLedger(next.transactions, localDate(new Date(now))).income, 12345);
  assert.equal(db.vehicles.length, 0);
  assert.throws(() => registerVehicle(next, input, 'v2', now), /já está/);
});

test('vehicle registration rejects missing, nonpositive, fractional and unsafe amounts', () => {
  for (const amount of [undefined, NaN, Infinity, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => registerVehicle(createEmptyDatabase(), { ...input, amount: amount as number }, 'v', now), /valor válido/);
  }
});

test('financial values accept Brazilian formatting and reject invalid values and dates', () => {
  assert.equal(parseMoney('R$ 1.234,56'), 123456);
  assert.equal(parseMoney('210,50'), 21050);
  assert.equal(parseMoney('80.25'), 8025);
  assert.ok(Number.isNaN(parseMoney('1,2,3')));
  assert.equal(parseMoney('1.234'), 123400);
  const transaction = { id: 'x', date: day, description: 'Compra', type: 'saida' as const, amount: -1, createdAt: now };
  assert.throws(() => addTransaction(createEmptyDatabase(), transaction), /valor válido/);
  assert.throws(() => addTransaction(createEmptyDatabase(), { ...transaction, date: '2026-02-31', amount: 1 }), /data válida/);
});

test('daily ledger orders movements and isolates each date', () => {
  let db = createEmptyDatabase();
  for (const [index, amount] of [8000, 35000, -12000, 90000, -21050].entries()) {
    db = addTransaction(db, { id: String(index), date: day, description: 'Lançamento', type: amount > 0 ? 'entrada' : 'saida', amount: Math.abs(amount), createdAt: `2026-11-08T${String(9 + index).padStart(2, '0')}:00:00.000Z` });
  }
  db = addTransaction(db, { id: 'later', date: '2030-01-01', description: 'Despesa', type: 'saida', amount: 123, createdAt: now });
  const ledger = dailyLedger([...db.transactions].reverse(), day);
  assert.deepEqual(ledger.rows.map(t => t.balance), [8000, 43000, 31000, 121000, 99950]);
  assert.equal(ledger.income, 133000);
  assert.equal(ledger.expenses, 33050);
  assert.equal(ledger.balance, 99950);
  assert.equal(dailyLedger(db.transactions, '2030-01-01').balance, -123);
});

test('checkout preserves income already recorded at registration', () => {
  const registered = registerVehicle(createEmptyDatabase(), input, 'vehicle-1', now);
  const db = JSON.parse(JSON.stringify(registered));
  assert.equal(db.vehicles[0].amount, 12345);
  assert.throws(() => finishVehicle(db, 'vehicle-1', 'payment', now, day), /pronto/);
  db.vehicles[0].status = 'Pronto';
  const next = finishVehicle(db, 'vehicle-1', 'payment-1', now, day);
  assert.equal(next.vehicles.length, 0);
  assert.equal(next.transactions.length, 1);
  assert.equal(next.transactions[0].amount, 12345);
  assert.deepEqual(next.transactions, registered.transactions);
  assert.throws(() => finishVehicle(next, 'vehicle-1', 'payment-2', now, day), /concluído/);
});

test('checkout records income for an older vehicle without a linked transaction', () => {
  const registered = registerVehicle(createEmptyDatabase(), input, 'old-vehicle', now);
  const db = { ...registered, transactions: [] };
  db.vehicles[0].status = 'Pronto';
  const next = finishVehicle(db, 'old-vehicle', 'payment', now, day);
  assert.equal(next.vehicles.length, 0);
  assert.equal(dailyLedger(next.transactions, day).income, 12345);
});

test('backup validation accepts saved custom values and rejects damaged financial data', async () => {
  const { validateDatabase } = await import('../src/lib/database');
  const db = registerVehicle(createEmptyDatabase(), input, 'backup-vehicle', now);
  assert.deepEqual(validateDatabase(JSON.parse(JSON.stringify(db))), db);
  const invalid = [null, {}, { ...db, version: 1 }, { ...db, vehicles: [{ ...db.vehicles[0], amount: -100 }] }, { ...db, clients: [{ ...db.clients[0], phone: 11987654321 }] }, { ...db, vehicles: [...db.vehicles, ...db.vehicles] }];
  for (const value of invalid) assert.throws(() => validateDatabase(value));
  const transaction = { id: 'backup-transaction', date: day, description: 'Entrada', type: 'entrada', amount: 12345, createdAt: now };
  assert.throws(() => validateDatabase({ ...db, transactions: [{ ...transaction, date: '2026-02-31' }] }));
  assert.throws(() => validateDatabase({ ...db, transactions: [transaction, transaction] }));
  assert.equal(validateDatabase({ ...db, transactions: [transaction] }).transactions[0].amount, 12345);
});

test('monthly closing isolates month and year, includes boundary days and orders by transaction date', async () => {
  const { monthlyLedger } = await import('../src/lib/business');
  const movement = (id: string, date: string, amount: number, createdAt = now) => ({ id, date, description: id, type: amount > 0 ? 'entrada' as const : 'saida' as const, amount: Math.abs(amount), createdAt });
  const transactions = [
    movement('end', '2026-11-30', 10000),
    movement('previous', '2026-10-31', 99999),
    movement('middle', '2026-11-15', -2500, '2026-11-07T10:00:00Z'),
    movement('start', '2026-11-01', 12345, '2026-12-01T10:00:00Z'),
    movement('next', '2026-12-01', 99999),
    movement('other-year', '2025-11-01', 99999),
  ];
  const originalOrder = transactions.map(t => t.id);
  const ledger = monthlyLedger(transactions, '2026-11');
  assert.deepEqual(ledger.rows.map(t => t.id), ['start', 'middle', 'end']);
  assert.deepEqual(ledger.rows.map(t => t.balance), [12345, 9845, 19845]);
  assert.equal(ledger.income, 22345);
  assert.equal(ledger.expenses, 2500);
  assert.equal(ledger.balance, 19845);
  assert.deepEqual(transactions.map(t => t.id), originalOrder);
  assert.deepEqual(monthlyLedger(transactions, '2027-01'), { rows: [], income: 0, expenses: 0, balance: 0 });
  assert.equal(monthlyLedger([movement('leap', '2024-02-29', -123)], '2024-02').balance, -123);
  assert.equal(monthlyLedger([movement('year-end', '2026-12-31', 123), movement('new-year', '2027-01-01', 999)], '2026-12').balance, 123);
  for (const month of ['', '2026', '2026-00', '2026-13', '2026-1', '2026-11-01']) assert.throws(() => monthlyLedger(transactions, month), /mês e ano válidos/);
});
