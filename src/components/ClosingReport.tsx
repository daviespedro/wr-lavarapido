import type { Transaction } from '../lib/types';
import { dailyLedger, monthlyLedger, cardFee } from '../lib/business';
import { currency, numberLabel } from '../lib/format';

export function ClosingReport({ transactions, period, kind, printable = false }: {
  transactions: Transaction[];
  period: string;
  kind: 'day' | 'month';
  printable?: boolean;
}) {
  const monthly = kind === 'month';
  const ledger = monthly ? monthlyLedger(transactions, period) : dailyLedger(transactions, period);
  const date = new Date(`${monthly ? `${period}-01` : period}T12:00:00`).toLocaleDateString('pt-BR', monthly ? { month: 'long', year: 'numeric' } : undefined);
  const title = monthly ? 'Fechamento do Mês' : 'Fechamento do Dia';
  const Heading = printable ? 'h1' : 'h2';
  return <article className={`report-document ${printable ? 'print-report' : 'monthly-report panel'}`} aria-label={title}>
    <header>{printable && <p>WR Lava Rápido — Estética Automotiva</p>}<Heading>{title}</Heading><p>{monthly ? 'Período' : 'Data'}: {date}</p></header>
    <dl className="report-totals"><div><dt>Total Bruto de Entradas</dt><dd className="income">{currency(ledger.income)}</dd></div><div><dt>Taxa de Maquininha</dt><dd className="expenses">-{currency(ledger.fees)}</dd></div><div><dt>Total Líquido de Entradas</dt><dd>{currency(ledger.netIncome)}</dd></div><div><dt>Total de Saídas</dt><dd className="expenses">{currency(ledger.expenses)}</dd></div><div><dt>{monthly ? 'Saldo Líquido Mensal' : 'Saldo do Dia'}</dt><dd>{currency(ledger.balance)}</dd></div></dl>
    <div className="table-scroll"><table><caption>Movimentações de {date} — valores em reais (R$)</caption><thead><tr><th scope="col">Data</th><th scope="col">Descrição</th><th scope="col" className="numeric">Entradas líquidas</th><th scope="col" className="numeric">Saídas</th><th scope="col" className="numeric">Saldo</th></tr></thead><tbody>
      {ledger.rows.map(row => <tr key={row.id}><td>{row.date.split('-').reverse().join('/')}</td><td>{row.description}</td><td className="numeric income">{row.type === 'entrada' ? numberLabel(row.amount - cardFee(row.amount, row.payment)) : '–'}</td><td className="numeric expenses">{row.type === 'saida' ? numberLabel(row.amount) : '–'}</td><td className="numeric">{numberLabel(row.balance)}</td></tr>)}
      {!ledger.rows.length && <tr><td colSpan={5} className="empty-ledger">Nenhuma transação neste {monthly ? 'mês' : 'dia'}.</td></tr>}
    </tbody><tfoot><tr><th scope="row" colSpan={2}>Total do {monthly ? 'mês' : 'dia'}</th><td className="numeric income">{numberLabel(ledger.netIncome)}</td><td className="numeric expenses">{numberLabel(ledger.expenses)}</td><td className="numeric">{numberLabel(ledger.balance)}</td></tr></tfoot></table></div>
    <p className="report-note">{monthly ? 'Saldo acumulado das movimentações deste mês, começando em zero.' : 'Resumo das movimentações registradas no sistema.'}</p>
  </article>;
}
