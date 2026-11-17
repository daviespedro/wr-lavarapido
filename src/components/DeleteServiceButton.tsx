import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteService } from '../lib/business';
import { commitDatabase } from '../lib/store';

export function DeleteServiceButton({ id, compact = false }: { id: string; compact?: boolean }) {
  const [error, setError] = useState('');
  function remove() {
    if (!window.confirm('Tem certeza que deseja excluir este serviço? Caso já tenha sido finalizado, o lançamento também será removido do Caixa.')) return;
    try { commitDatabase(db => deleteService(db, id)); }
    catch (cause) { setError((cause as Error).message); }
  }
  return <div className={compact ? undefined : 'mt-4'}>
    <button type="button" className="secondary danger-outline" aria-label="Excluir Serviço" title="Excluir Serviço" onClick={remove}>
      <Trash2 size={16} aria-hidden="true"/>{!compact && 'Excluir Serviço'}
    </button>
    {error && <p role="alert">{error}</p>}
  </div>;
}
