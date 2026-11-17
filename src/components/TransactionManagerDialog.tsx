import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cardFee } from '../lib/business';
import { currency } from '../lib/format';
import type { Transaction } from '../lib/types';
import { DeleteTransactionButton } from './DeleteTransactionButton';

export function TransactionManagerDialog({ kind, period, transactions, onClose }: {
  kind: 'day' | 'month';
  period: string;
  transactions: Transaction[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  const monthly = kind === 'month';
  const periodLabel = monthly ? period.split('-').reverse().join('/') : formatDate(period);
  const rows = transactions.filter(row => monthly ? row.date.slice(0, 7) === period : row.date === period)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));

  return <dialog ref={ref} className="vehicle-dialog panel no-print" aria-labelledby="transaction-manager-title" onCancel={onClose}>
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 id="transaction-manager-title">Gerenciar Lançamentos</h2>
        <button type="button" aria-label="Fechar gestão de lançamentos" onClick={onClose}><X size={20}/></button>
      </div>
      <p className="muted">{monthly ? 'Mês' : 'Dia'} · {periodLabel}</p>
      {rows.length ? <ul className="record-list">
        {rows.map(row => {
          const income = row.type === 'entrada';
          return <li className="managed-transaction" key={row.id}>
            <time className="muted" dateTime={row.date}>{formatDate(row.date)}</time>
            <span className="managed-description">{row.description}</span>
            <span className={`movement-tag ${income ? 'income' : 'expenses'}`}>{income ? 'Entrada' : 'Saída'}</span>
            <strong className="numeric">{currency(row.amount - (income ? cardFee(row.amount, row.payment) : 0))}</strong>
            <DeleteTransactionButton id={row.id} description={row.description}/>
          </li>;
        })}
      </ul> : <p className="muted mt-4">Nenhum lançamento neste período.</p>}
    </div>
  </dialog>;
}

const formatDate = (date: string) => date.split('-').reverse().join('/');
