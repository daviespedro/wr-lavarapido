import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { ArrowUpRight, ArrowDownRight, Landmark, Plus, Printer } from 'lucide-react';
import { RecurringExpenses } from '../components/RecurringExpenses';
import { ClosingReport } from '../components/ClosingReport';
import { PageHeading, Notice } from '../components/Layout';
import { useDatabase, commitDatabase, exportBackup, exportDatabase } from '../lib/store';
import { downloadBackup } from '../lib/backup';
import type { Transaction } from '../lib/types';
import { addTransaction, dailyLedger } from '../lib/business';
import { currency, localDate, numberLabel, dateLabel, parseMoney } from '../lib/format';
export function Cash() {
  const { db, error: storageError } = useDatabase();
  const [date, setDate] = useState(localDate());
  const [reportDay, setReportDay] = useState(localDate());
  const [month, setMonth] = useState(() => localDate().slice(0, 7));
  const [reportKind, setReportKind] = useState<'day' | 'month'>('day');
  const [reportTransactions, setReportTransactions] = useState<Transaction[] | null>(null);
  useEffect(() => {
    const prepare = () => flushSync(() => setReportDay(localDate()));
    const reset = () => { setReportKind('day'); setReportTransactions(null); };
    window.addEventListener('beforeprint', prepare);
    window.addEventListener('afterprint', reset);
    return () => { window.removeEventListener('beforeprint', prepare); window.removeEventListener('afterprint', reset); };
  }, []);
  function printReport(kind: 'day' | 'month') {
    try {
      // Read once so the backup and the printed report share the latest saved data.
      const current = exportDatabase();
      if (kind === 'day') downloadBackup(exportBackup());
      flushSync(() => {
        setReportDay(localDate()); setReportKind(kind); setReportTransactions(current.transactions);
        setNotice(kind === 'day' ? { message: 'Download do backup completo iniciado. Confira o arquivo na pasta de downloads.' } : null);
      });
      window.print();
    } catch (error) {
      setNotice({ message: `Não foi possível concluir o fechamento. ${(error as Error).message}`, error: true });
    }
  }
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'entrada' | 'saida'>('entrada');
  const [amount, setAmount] = useState('');
  const [notice, setNotice] = useState<{ message: string; error?: boolean } | null>(null);
  const ledger = dailyLedger(db.transactions, date);
  const fullDate = new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      commitDatabase(current => addTransaction(current, { id: crypto.randomUUID(), date, description, type, amount: parseMoney(amount), createdAt: new Date().toISOString() }));
      setDescription(''); setAmount(''); setNotice({ message: `${type === 'entrada' ? 'Entrada' : 'Saída'} lançada e salva no caixa.` });
    } catch (error) { setNotice({ message: (error as Error).message, error: true }); }
  }
  return <>
    <PageHeading section="CAIXA" title="Fechamento diário">{fullDate.charAt(0).toUpperCase() + fullDate.slice(1)}</PageHeading>
    <div className="closing-actions no-print"><p className="muted">O fechamento diário baixa um backup completo antes de abrir a impressão.</p><button type="button" className="primary" onClick={() => printReport('day')} disabled={!!storageError}><Printer size={18}/> Imprimir Fechamento do Dia</button></div>
    {notice && <Notice {...notice} onClose={() => setNotice(null)}/>}
    <div className="summary-grid grid grid-cols-1 sm:grid-cols-3">
      {[{ label: 'Total Bruto de Entradas', value: ledger.income, className: 'income', Icon: ArrowUpRight }, { label: 'Total de Saídas', value: ledger.expenses, className: 'expenses', Icon: ArrowDownRight }, { label: 'Saldo Líquido', value: ledger.balance, className: 'balance', Icon: Landmark }].map(({ label, value, className, Icon }) => <section className={`summary-card panel ${className}`} key={label}><div className="flex items-center justify-between"><h2>{label}</h2><span className="summary-icon"><Icon size={22}/></span></div><p className="summary-value"><span>R$</span>{numberLabel(value)}</p></section>)}
    </div>
    <p className="cash-fees"><span>Taxa de Maquininha: <strong>-{currency(ledger.fees)}</strong></span><span>Total Líquido de Entradas: <strong>{currency(ledger.netIncome)}</strong></span></p>
    <section className="transaction-panel panel" aria-labelledby="transaction-title"><h2 id="transaction-title">Nova transação</h2><form className="transaction-form" onSubmit={submit}>
      <div className="date-input-wrap"><label className="sr-only" htmlFor="transaction-date">Dia do caixa</label><input id="transaction-date" type="date" value={date} onChange={e => { if (e.target.value && /^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) setDate(e.target.value); }} required/></div>
      <div><label className="sr-only" htmlFor="description">Descrição</label><input id="description" placeholder="Descrição" maxLength={180} value={description} onChange={e => setDescription(e.target.value)} required/></div>
      <div className="type-switch flex" role="group" aria-label="Tipo de transação"><button type="button" aria-pressed={type === 'entrada'} className={type === 'entrada' ? 'selected income' : ''} onClick={() => setType('entrada')}>Entrada</button><button type="button" aria-pressed={type === 'saida'} className={type === 'saida' ? 'selected expenses' : ''} onClick={() => setType('saida')}>Saída</button></div>
      <div><label className="sr-only" htmlFor="amount">Valor em reais</label><input id="amount" className="money-input" inputMode="decimal" placeholder="R$ 0,00" value={amount} onChange={e => setAmount(e.target.value)} required/></div>
      <button className="primary" disabled={!!storageError}><Plus size={18}/> LANÇAR</button>
    </form></section>
    <div className="ledger-panel panel"><div className="table-scroll"><table><caption className="sr-only">Movimentações de {dateLabel(date)} com saldo acumulado em ordem cronológica</caption><thead><tr><th scope="col">DIA</th><th scope="col">DESCRIÇÃO</th><th scope="col" className="numeric">ENTRADAS (R$)</th><th scope="col" className="numeric">SAÍDAS (R$)</th><th scope="col" className="numeric">SALDO (R$)</th></tr></thead><tbody>{ledger.rows.map(row => <tr key={row.id}><td className="muted">{dateLabel(row.date)}</td><td>{row.description}</td><td className="numeric income">{row.type === 'entrada' ? numberLabel(row.amount) : '–'}</td><td className="numeric expenses">{row.type === 'saida' ? numberLabel(row.amount) : '–'}</td><td className="numeric row-balance">{numberLabel(row.balance)}</td></tr>)}{!ledger.rows.length && <tr><td colSpan={5} className="empty-ledger">Nenhuma transação neste dia. Faça o primeiro lançamento acima.</td></tr>}</tbody><tfoot><tr><th scope="row" colSpan={2}>Total do dia</th><td className="numeric income">{numberLabel(ledger.income)}</td><td className="numeric expenses">{numberLabel(ledger.expenses)}</td><td className={`numeric ${ledger.balance < 0 ? 'expenses' : ''}`}>{numberLabel(ledger.balance)}</td></tr></tfoot></table></div></div>
    <RecurringExpenses/>
    <section className="monthly-section no-print" aria-label="Relatório mensal">
      <div className="closing-actions"><div className="field"><label htmlFor="report-month">MÊS / ANO DO RELATÓRIO</label><input id="report-month" type="month" value={month} onChange={e => { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)) setMonth(e.target.value); }}/></div><button type="button" className="primary" onClick={() => printReport('month')} disabled={!!storageError}><Printer size={18}/> Imprimir Fechamento do Mês</button></div>
      <ClosingReport transactions={db.transactions} period={month} kind="month"/>
    </section>
    <ClosingReport transactions={reportTransactions ?? db.transactions} period={reportKind === 'month' ? month : reportDay} kind={reportKind} printable/>
  </>;
}
