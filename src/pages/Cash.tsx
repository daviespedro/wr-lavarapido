import { TransactionManagerDialog } from '../components/TransactionManagerDialog';
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { ArrowUpRight, ArrowDownRight, Landmark, ListFilter, Plus, Printer } from 'lucide-react';
import { RecurringExpenses } from '../components/RecurringExpenses';
import { ClosingReport } from '../components/ClosingReport';
import { PageHeading, Notice } from '../components/Layout';
import { processRecurring, useDatabase, commitDatabase, exportBackup, exportDatabase, readInitialBalance, saveInitialBalance } from '../lib/store';
import { downloadBackup } from '../lib/backup';
import type { Transaction } from '../lib/types';
import { addTransaction, dailyLedger, cardFee } from '../lib/business';
import { currency, localDate, numberLabel, dateLabel, parseMoney } from '../lib/format';
export function Cash({ month, setMonth }: { month: string; setMonth: (month: string) => void }) {
  const { db, initialBalance, error: storageError } = useDatabase();
  const [managing, setManaging] = useState<'day' | 'month' | null>(null);
  const [recurringError, setRecurringError] = useState('');
  function syncRecurring(period: string) {
    try {
      processRecurring(period);
      setRecurringError('');
    } catch (error) {
      setRecurringError((error as Error).message);
    }
  }
  useEffect(() => { syncRecurring(month); }, [month]);
  const [date, setDate] = useState(localDate());
  const [reportDay, setReportDay] = useState<string | null>(null);
  const [reportKind, setReportKind] = useState<'day' | 'month'>('day');
  const [reportData, setReportData] = useState<{ transactions: Transaction[]; initialBalance: number } | null>(null);
  useEffect(() => {
    const reset = () => { setReportKind('day'); setReportDay(null); setReportData(null); };
    window.addEventListener('afterprint', reset);
    return () => { window.removeEventListener('afterprint', reset); };
  }, []);
  function printReport(kind: 'day' | 'month') {
    try {
      // Read once so the backup and the printed report share the latest saved data.
      const current = exportDatabase();
      const opening = readInitialBalance();
      if (kind === 'day') downloadBackup(exportBackup());
      flushSync(() => {
        setReportDay(date); setReportKind(kind); setReportData({ transactions: current.transactions, initialBalance: opening });
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
  const ledger = dailyLedger(db.transactions, date, initialBalance);
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
    {recurringError && <div role="alert" className="notice error">{recurringError}</div>}
    {notice && <Notice {...notice} onClose={() => setNotice(null)}/>}
    <div className="summary-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
      {[{ label: 'Saldo Anterior', value: ledger.previousBalance, className: 'balance', Icon: Landmark }, { label: 'Total Bruto de Entradas', value: ledger.income, className: 'income', Icon: ArrowUpRight }, { label: 'Total de Saídas', value: ledger.expenses, className: 'expenses', Icon: ArrowDownRight }, { label: 'Saldo Final Acumulado', value: ledger.balance, className: 'balance', Icon: Landmark }].map(({ label, value, className, Icon }) => <section className={`summary-card panel ${className}`} key={label}><div className="flex items-center justify-between"><h2>{label}</h2><span className="summary-icon"><Icon size={22}/></span></div><p className="summary-value"><span>R$</span>{numberLabel(value)}</p></section>)}
    </div>
    <p className="cash-fees"><span>Taxa de Maquininha: <strong>-{currency(ledger.fees)}</strong></span><span>Total Líquido de Entradas: <strong>{currency(ledger.netIncome)}</strong></span></p>
    <section className="transaction-panel panel" aria-labelledby="transaction-title"><h2 id="transaction-title">Nova transação</h2><form className="transaction-form" onSubmit={submit}>
      <div className="date-input-wrap"><label className="sr-only" htmlFor="transaction-date">Dia do caixa</label><input id="transaction-date" type="date" value={date} onChange={e => { if (e.target.value && /^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) setDate(e.target.value); }} required/></div>
      <div><label className="sr-only" htmlFor="description">Descrição</label><input id="description" placeholder="Descrição" maxLength={180} value={description} onChange={e => setDescription(e.target.value)} required/></div>
      <div className="type-switch flex" role="group" aria-label="Tipo de transação"><button type="button" aria-pressed={type === 'entrada'} className={type === 'entrada' ? 'selected income' : ''} onClick={() => setType('entrada')}>Entrada</button><button type="button" aria-pressed={type === 'saida'} className={type === 'saida' ? 'selected expenses' : ''} onClick={() => setType('saida')}>Saída</button></div>
      <div><label className="sr-only" htmlFor="amount">Valor em reais</label><input id="amount" className="money-input" inputMode="decimal" placeholder="R$ 0,00" value={amount} onChange={e => setAmount(e.target.value)} required/></div>
      <button className="primary" disabled={!!storageError}><Plus size={18}/> LANÇAR</button>
    </form></section>
    <div className="flex justify-end mb-3 no-print">
      <button type="button" className="secondary" disabled={!!storageError} onClick={() => setManaging('day')}>
        <ListFilter size={16}/> Gerenciar Lançamentos
      </button>
    </div>
    <div className="ledger-panel panel"><div className="table-scroll"><table><caption className="sr-only">Movimentações de {dateLabel(date)} com saldo acumulado em ordem cronológica</caption><thead><tr><th scope="col">DIA</th><th scope="col">DESCRIÇÃO</th><th scope="col" className="numeric">ENTRADAS LÍQUIDAS (R$)</th><th scope="col" className="numeric">SAÍDAS (R$)</th><th scope="col" className="numeric">SALDO (R$)</th></tr></thead><tbody><tr className="opening-balance"><th scope="row" colSpan={4}>Saldo Anterior</th><td className="numeric">{numberLabel(ledger.previousBalance)}</td></tr>{ledger.rows.map(row => <tr key={row.id}><td className="muted">{dateLabel(row.date)}</td><td>{row.description}</td><td className="numeric income">{row.type === 'entrada' ? numberLabel(row.amount - cardFee(row.amount, row.payment)) : '–'}</td><td className="numeric expenses">{row.type === 'saida' ? numberLabel(row.amount) : '–'}</td><td className="numeric row-balance">{numberLabel(row.balance)}</td></tr>)}{!ledger.rows.length && <tr><td colSpan={5} className="empty-ledger">Nenhuma transação neste dia. Faça o primeiro lançamento acima.</td></tr>}</tbody><tfoot><tr><th scope="row" colSpan={2}>Saldo Final Acumulado</th><td className="numeric income">{numberLabel(ledger.netIncome)}</td><td className="numeric expenses">{numberLabel(ledger.expenses)}</td><td className={`numeric ${ledger.balance < 0 ? 'expenses' : ''}`}>{numberLabel(ledger.balance)}</td></tr></tfoot></table></div></div>
    <section className="transaction-panel panel no-print">
      <form key={initialBalance} className="flex flex-wrap items-end gap-3" onSubmit={event => {
        event.preventDefault();
        const raw = String(new FormData(event.currentTarget).get('initialBalance')).trim();
        const negative = raw.startsWith('-');
        try {
          saveInitialBalance(parseMoney(negative ? raw.slice(1) : raw) * (negative ? -1 : 1));
          setNotice({ message: 'Saldo inicial salvo.' });
        } catch (error) { setNotice({ message: (error as Error).message, error: true }); }
      }}>
        <div className="field"><label htmlFor="initial-balance">Saldo Inicial em Conta (R$)</label>
          <input id="initial-balance" name="initialBalance" inputMode="decimal" defaultValue={numberLabel(initialBalance)} required/>
        </div>
        <button className="primary" disabled={!!storageError}>Salvar Saldo Inicial</button>
      </form>
    </section>
    <RecurringExpenses onRegistered={() => syncRecurring(month)}/>
    <section className="monthly-section no-print" aria-label="Relatório mensal">
      <div className="closing-actions"><div className="field"><label htmlFor="report-month">MÊS / ANO DO RELATÓRIO</label><input id="report-month" type="month" value={month} onChange={e => { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)) setMonth(e.target.value); }}/></div><div className="flex flex-wrap items-center gap-3">
        <button type="button" className="secondary" disabled={!!storageError} onClick={() => setManaging('month')}><ListFilter size={16}/> Gerenciar Lançamentos do Mês</button>
        <button type="button" className="primary" onClick={() => printReport('month')} disabled={!!storageError}><Printer size={18}/> Imprimir Fechamento do Mês</button></div></div>
      <ClosingReport initialBalance={initialBalance} transactions={db.transactions} period={month} kind="month"/>
    </section>
    {managing && <TransactionManagerDialog kind={managing} period={managing === 'day' ? date : month} transactions={db.transactions} onClose={() => setManaging(null)}/>}
    <ClosingReport initialBalance={reportData?.initialBalance ?? initialBalance} transactions={reportData?.transactions ?? db.transactions} period={reportKind === 'month' ? month : reportDay ?? date} kind={reportKind} printable/>
  </>;
}
