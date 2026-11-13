import { useState } from 'react';
import { useDatabase, updateRecurring } from '../lib/store';
import { currency, parseMoney } from '../lib/format';
import { Notice } from './Layout';

export function RecurringExpenses({ onRegistered }: { onRegistered: () => void }) {
  const { expenses, error } = useDatabase();
  const [notice, setNotice] = useState<{ message: string; error?: boolean } | null>(null);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget, data = new FormData(form);
    try {
      updateRecurring(current => [...current, {
        id: crypto.randomUUID(), descricao: String(data.get('description')).trim(),
        valor: parseMoney(String(data.get('amount'))), diaVencimento: Number(data.get('day')),
      }]);
      onRegistered();
      form.reset();
      setNotice({ message: 'Despesa recorrente cadastrada.' });
    } catch (error) { setNotice({ message: (error as Error).message, error: true }); }
  }
  function remove(id: string | number) {
    try { updateRecurring(current => current.filter(expense => expense.id !== id)); setNotice(null); }
    catch (error) { setNotice({ message: (error as Error).message, error: true }); }
  }
  return <section className="transaction-panel panel no-print" aria-labelledby="recurring-title">
    <h2 id="recurring-title">Despesas recorrentes</h2>
    <p className="muted">Ao consultar um mês, as despesas são lançadas na data do vencimento, uma vez por mês.</p>
    {notice && <Notice {...notice} onClose={() => setNotice(null)}/>}
    <form className="recurring-form" onSubmit={submit}>
      <label className="field">Descrição<input name="description" maxLength={180} required/></label>
      <label className="field">Valor (R$)<input name="amount" inputMode="decimal" required/></label>
      <label className="field">Dia do vencimento<input name="day" type="number" min="1" max="31" step="1" required/></label>
      <button className="primary" disabled={!!error}>Cadastrar despesa</button>
    </form>
    {expenses.length > 0 && <ul className="record-list">{expenses.map(expense => <li key={expense.id}>
      <span>{expense.descricao} · dia {expense.diaVencimento} · {currency(expense.valor)}</span>
      <button type="button" className="secondary" disabled={!!error} aria-label={`Remover ${expense.descricao} dos lançamentos automáticos`} onClick={() => remove(expense.id)}>Remover</button>
    </li>)}</ul>}
  </section>;
}
