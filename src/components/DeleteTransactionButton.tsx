import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { deleteTransaction } from '../lib/business';
import { commitDatabase } from '../lib/store';

export function DeleteTransactionButton({ id, description }: { id: string; description: string }) {
  const [error, setError] = useState('');
  function remove() {
    if (!window.confirm('Tem certeza que deseja excluir este lançamento?')) return;
    try { commitDatabase(db => deleteTransaction(db, id)); }
    catch (cause) { setError((cause as Error).message); }
  }
  return <div className="inline-flex flex-col items-end gap-1">
    <button type="button" className="secondary danger-outline no-print" onClick={remove}
      aria-label={`Excluir lançamento: ${description}`} title="Excluir lançamento">
      <Trash2 size={16} aria-hidden="true"/>
    </button>
    {error && <small role="alert">{error}</small>}
  </div>;
}
