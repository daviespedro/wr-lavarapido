import { useState } from 'react';
import { useDatabase, updateRecurring, processRecurring } from '../lib/store';
import { currency, parseMoney } from '../lib/format';
import { Notice } from './Layout';

export function RecurringExpenses() {
  const { expenses, error } = useDatabase();
  const [notice, setNotice] = useState<{ message: string; error?: boolean } | null>(null);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget, data = new FormData(form);
    try {
      updateRecurring(current => [...current, {
        id: crypto.randomUUID(), description: String(data.get('description')).trim(),
        amount: parseMoney(String(data.get('amount'))), dia_vencimento: Number(data.get('day')),
      }]);
      form.reset();
    } catch (error) { setNotice({ message: (error as Error).message, error: true }); return; }
    try {
      processRecurring();
      setNotice({ message: 'Despesa recorrente cadastrada.' });
    } catch (error) { setNotice({ message: `Despesa cadastrada. Falha ao verificar os lançamentos: ${(error as Error).message}`, error: true }); }
  }
  function remove(id: string) {
    try { updateRecurring(current => current.filter(expense => expense.id !== id)); setNotice(null); }
    catch (error) { setNotice({ message: (error as Error).message, error: true }); }
  }
  return <section className="transaction-panel panel no-print" aria-labelledby="recurring-title">
    <h2 id="recurring-title">Despesas recorrentes</h2>
    <p className="muted">A despesa é lançada uma vez por mês, a partir do dia do vencimento, quando o sistema é aberto.</p>
    {notice && <Notice {...notice} onClose={() => setNotice(null)}/>}
    <form className="recurring-form" onSubmit={submit}>
      <label className="field">Descrição<input name="description" maxLength={180} required/></label>
      <label className="field">Valor (R$)<input name="amount" inputMode="decimal" required/></label>
      <label className="field">Dia do vencimento<input name="day" type="number" min="1" max="31" step="1" required/></label>
      <button className="primary" disabled={!!error}>Cadastrar despesa</button>
    </form>
    {expenses.length > 0 && <ul className="record-list">{expenses.map(expense => <li key={expense.id}>
      <span>{expense.description} · dia {expense.dia_vencimento} · {currency(expense.amount)}</span>
      <button type="button" className="secondary" disabled={!!error} aria-label={`Remover ${expense.description} dos próximos meses`} onClick={() => remove(expense.id)}>Remover</button>
    </li>)}</ul>}
  </section>;
}
