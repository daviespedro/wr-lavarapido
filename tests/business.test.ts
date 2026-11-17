import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyDatabase } from '../src/lib/data';
import { registerVehicle, addTransaction, dailyLedger, finishVehicle } from '../src/lib/business';
import { parseMoney } from '../src/lib/format';
const now = '2026-11-08T16:00:00.000Z';
const day = '2026-11-08';
const input = { phone: '(11) 98765-4321', name: 'Cliente', model: 'Veículo', plate: 'bra-2e19', serviceId: 'lavagem', amount: 12345 };

test('first use starts with no clients, vehicles or transactions and zero balances', () => {
  const db = createEmptyDatabase();
  assert.deepEqual(db, { version: 2, clients: [], vehicles: [], transactions: [] });
  assert.deepEqual(dailyLedger(db.transactions, day), { rows: [], income: 0, expenses: 0, fees: 0, netIncome: 0, balance: 0, previousBalance: 0 });
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
  assert.equal(next.transactions.length, 0);
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
  assert.equal(dailyLedger(db.transactions, '2030-01-01').balance, 99827);
});

test('checkout records all four payment methods and deducts 3% only for cards', () => {
  const db = registerVehicle(createEmptyDatabase(), input, 'vehicle-1', now);
  assert.throws(() => finishVehicle(db, 'vehicle-1', 'payment', now, day, 'PIX'), /finalizado/);
  db.vehicles[0].status = 'Finalizado';
  for (const method of ['Dinheiro', 'PIX', 'Crédito', 'Débito'] as const) {
    const next = finishVehicle(db, 'vehicle-1', 'payment', now, day, method);
    const fees = method === 'Crédito' || method === 'Débito' ? 370 : 0;
    const ledger = dailyLedger(next.transactions, day);
    assert.equal(ledger.income, 12345);
    assert.equal(ledger.fees, fees);
    assert.equal(ledger.netIncome, 12345 - fees);
    assert.equal(ledger.rows[0].balance, 12345 - fees);
    assert.equal(next.transactions[0].payment, method);
    assert.equal(next.completed?.[0].client.plate, 'BRA2E19');
    assert.equal(next.vehicles.length, 0);
    assert.throws(() => finishVehicle(next, 'vehicle-1', 'payment-2', now, day, method), /concluído/);
  }
});

test('legacy checkout reuses the original transaction and preserves its date', () => {
  const db = registerVehicle(createEmptyDatabase(), input, 'old-vehicle', now);
  db.vehicles[0].status = 'Finalizado';
  db.transactions.push({ id: 'legacy', date: '2026-11-07', description: 'Lavagem Completa — Veículo (BRA2E19)', type: 'entrada', amount: 12345, createdAt: now, vehicleId: 'old-vehicle' });
  const next = finishVehicle(db, 'old-vehicle', 'payment', now, day, 'Débito');
  assert.equal(next.transactions.length, 1);
  assert.equal(next.transactions[0].id, 'legacy');
  assert.equal(dailyLedger(next.transactions, '2026-11-07').balance, 11975);
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
  assert.deepEqual(ledger.rows.map(t => t.balance), [212343, 209843, 219843]);
  assert.equal(ledger.income, 22345);
  assert.equal(ledger.expenses, 2500);
  assert.equal(ledger.previousBalance, 199998);
  assert.equal(ledger.balance, 219843);
  assert.deepEqual(transactions.map(t => t.id), originalOrder);
  assert.deepEqual(monthlyLedger(transactions, '2027-01'), { rows: [], income: 0, expenses: 0, fees: 0, netIncome: 0, balance: 319842, previousBalance: 319842 });
  assert.equal(monthlyLedger([movement('leap', '2024-02-29', -123)], '2024-02').balance, -123);
  assert.equal(monthlyLedger([movement('year-end', '2026-12-31', 123), movement('new-year', '2027-01-01', 999)], '2026-12').balance, 123);
  for (const month of ['', '2026', '2026-00', '2026-13', '2026-1', '2026-11-01']) assert.throws(() => monthlyLedger(transactions, month), /mês e ano válidos/);
});

test('recurring expenses use the selected period, exact description and due date', async () => {
  const { applyRecurring } = await import('../src/lib/recurring');
  const expenses = [
    { id: 123, descricao: 'água', valor: 40000, diaVencimento: 8 },
    { id: 'power', descricao: 'luz', valor: 2000, diaVencimento: 15 },
    { id: 'end', descricao: 'Internet', valor: 1000, diaVencimento: 31 },
  ];
  const today = new Date(2026, 10, 13, 12);
  const empty = createEmptyDatabase();
  const current = applyRecurring(empty, expenses, [], '2026-11', today);
  assert.deepEqual(current.logs, ['123-11-2026', 'power-11-2026']);
  assert.deepEqual(current.db.transactions[0], {
    id: 'recurring:2026-11:123', date: '2026-11-08', description: 'água', type: 'saida', amount: 40000, createdAt: today.toISOString(),
  });
  assert.deepEqual(applyRecurring(current.db, expenses, current.logs, '2026-11', today), { ...current, hasChanges: false });
  assert.deepEqual(applyRecurring(current.db, expenses, [], '2026-11', today), current);

  const past = applyRecurring(current.db, expenses, current.logs, '2025-11', today);
  assert.deepEqual(past.db.transactions.map(t => t.date), ['2026-11-08', '2026-11-15', '2025-11-08', '2025-11-15']);
  assert.equal(applyRecurring(past.db, expenses, past.logs, '2026-12', today).db.transactions.at(-1)?.date, '2026-12-31');
  const october = applyRecurring(past.db, expenses, past.logs, '2026-10', today);
  assert.equal(dailyLedger(october.db.transactions, '2026-10-31').balance, -85000);
});

test('legacy expense fields and flags are migrated without charging a paid month again', async () => {
  const { applyRecurring, validateExpenses, validateLogs } = await import('../src/lib/recurring');
  const expenses = validateExpenses([{ id: 'rent', description: 'Aluguel', amount: 40000, diaVencimento: 8 }]);
  const logs = validateLogs([{ expenseId: 'rent', month: 11, year: 2026 }]);
  assert.deepEqual(expenses, [{ id: 'rent', descricao: 'Aluguel', valor: 40000, diaVencimento: 8 }]);
  assert.deepEqual(logs, ['rent-11-2026']);
  const db = createEmptyDatabase();
  assert.deepEqual(applyRecurring(db, expenses, logs, '2026-11', new Date(2026, 10, 13)), { db, logs, hasChanges: false });
});

test('vehicles without plates can coexist and keep separate service histories', async () => {
  const { registerClient, registerVehicle, finishVehicle, serviceHistory } = await import('../src/lib/business');
  const { createEmptyDatabase } = await import('../src/lib/data');
  const { validateDatabase } = await import('../src/lib/database');
  const first = { name: 'Ana', phone: '11999999999', model: 'Saveiro', plate: '' };
  const second = { ...first, name: 'Bia', phone: '11888888888' };
  let db = registerClient(createEmptyDatabase(), first);
  const now = '2026-11-17T12:00:00.000Z';
  db = registerVehicle(db, { ...first, serviceId: 'lavagem', amount: 5000 }, 'one', now);
  db = registerVehicle(db, { ...second, serviceId: 'lavagem', amount: 5000 }, 'two', now);
  db = validateDatabase(db);
  db.vehicles[0].status = 'Finalizado';
  db = finishVehicle(db, 'one', 'transaction-one', now, '2026-11-17', 'PIX');
  assert.equal(serviceHistory(db)[0].phone, first.phone);
  assert.equal(db.vehicles[0].client.phone, second.phone);
  assert.equal(db.transactions[0].description.endsWith('()'), false);
});

test('bank balance carries historical net card income into daily closing', () => {
  const transactions = [
    { id: 'card', date: '2026-11-07', description: 'Lavagem', type: 'entrada' as const, amount: 10000, payment: 'Crédito' as const, createdAt: now },
    { id: 'expense', date: day, description: 'Despesa', type: 'saida' as const, amount: 2500, createdAt: now },
  ];
  const ledger = dailyLedger(transactions, day, 20000);
  assert.equal(ledger.previousBalance, 29700);
  assert.equal(ledger.rows[0].balance, 27200);
  assert.equal(ledger.balance, 27200);
});
