import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { currency, parseMoney } from '../lib/format';
import { updateCatalog, useDatabase } from '../lib/store';

export function ServiceCatalogDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { catalog } = useDatabase();
  const [error, setError] = useState('');
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name')).trim();
    const amount = String(data.get('amount')).trim();
    try {
      if (!name) throw new Error('Informe o nome do serviço.');
      const suggestedAmount = amount ? parseMoney(amount) : undefined;
      updateCatalog(current => {
        if (current.some(service => service.name.toLowerCase() === name.toLowerCase())) throw new Error('Este serviço já está no catálogo.');
        return [...current, { id: crypto.randomUUID(), name, suggestedAmount }];
      });
      form.reset();
      setError('');
    } catch (cause) { setError((cause as Error).message); }
  }
  return <dialog ref={ref} className="vehicle-dialog panel" aria-labelledby="catalog-title" onCancel={onClose}>
    <h2 id="catalog-title">Gerenciar tipos de serviços</h2>
    <ul className="record-list">{catalog.map(service => <li key={service.id}>
      <span>{service.name}{service.suggestedAmount && ` · ${currency(service.suggestedAmount)}`}</span>
      <button type="button" className="secondary danger-outline" aria-label={`Remover ${service.name}`} onClick={() => {
        try { updateCatalog(current => current.filter(entry => entry.id !== service.id)); setError(''); }
        catch (cause) { setError((cause as Error).message); }
      }}><Trash2 size={16}/> Remover</button>
    </li>)}</ul>
    {error && <p className="notice error" role="alert">{error}</p>}
    <form className="flex flex-col gap-3" onSubmit={submit}>
      <div className="field"><label htmlFor="catalog-name">Nome do serviço</label><input id="catalog-name" name="name" maxLength={100} required/></div>
      <div className="field"><label htmlFor="catalog-price">Valor sugerido (opcional)</label><input id="catalog-price" name="amount" inputMode="decimal"/></div>
      <button className="primary">Adicionar serviço</button>
    </form>
    <button className="secondary w-full mt-3" type="button" onClick={onClose}>Fechar catálogo</button>
  </dialog>;
}
