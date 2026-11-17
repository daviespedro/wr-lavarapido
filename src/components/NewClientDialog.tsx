import { useEffect, useRef, useState } from 'react';
import { registerClient } from '../lib/business';
import { digits, phoneLabel } from '../lib/format';
import { commitDatabase } from '../lib/store';

export function NewClientDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [phone, setPhone] = useState('');
  const [plate, setPlate] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      commitDatabase(db => registerClient(db, { name: String(data.get('name')), model: String(data.get('model')), phone, plate }));
      onSaved();
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  return <dialog ref={dialog} className="vehicle-dialog panel" aria-labelledby="new-client-title" onCancel={onClose}>
    <h2 id="new-client-title">Cadastrar Novo Cliente</h2>
    <form className="flex flex-col gap-4 mt-4" onSubmit={submit}>
      <div className="field"><label htmlFor="new-client-name">Nome do Cliente</label><input id="new-client-name" name="name" required/></div>
      <div className="field"><label htmlFor="new-client-phone">Telefone</label><input id="new-client-phone" type="tel" placeholder="(XX) XXXXX-XXXX" value={phoneLabel(phone)} onChange={event => setPhone(digits(event.target.value).slice(0, 11))} required/></div>
      <div className="field"><label htmlFor="new-client-model">Modelo do Veículo</label><input id="new-client-model" name="model" placeholder="VW Saveiro G1" required/></div>
      <div className="field"><label htmlFor="new-client-plate">Placa</label><input id="new-client-plate" placeholder="ABC1D23" value={plate} onChange={event => setPlate(event.target.value.toUpperCase())} maxLength={8} required/></div>
      {error && <p className="notice error" role="alert">{error}</p>}
      <button className="primary w-full" type="submit">Salvar Cliente</button>
      <button className="secondary w-full" type="button" onClick={onClose}>Cancelar</button>
    </form>
  </dialog>;
}
