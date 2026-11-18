import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { Client } from '../lib/types';
import { registerClient } from '../lib/business';
import { digits, phoneLabel } from '../lib/format';
import { commitDatabase } from '../lib/store';

export function NewClientDialog({ client, onClose, onSaved }: { client?: Client; onClose: () => void; onSaved: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [phone, setPhone] = useState(client?.phone ?? '');
  const [vehicles, setVehicles] = useState([0]);
  const nextVehicle = useRef(1);
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
      commitDatabase(db => vehicles.reduce((current, id) => registerClient(current, {
        name: client?.name ?? String(data.get('name')),
        phone,
        model: String(data.get(`model-${id}`)),
        plate: String(data.get(`plate-${id}`)),
      }, !!client), db));
      onSaved();
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  return <dialog ref={dialog} className="vehicle-dialog panel" aria-labelledby="new-client-title" onCancel={onClose}>
    <h2 id="new-client-title">{client ? 'Vincular veículo' : 'Cadastrar Novo Cliente'}</h2>
    <form className="flex flex-col gap-4 mt-4" onSubmit={submit}>
      {client ? <p>{client.name} · {phoneLabel(client.phone)}</p> : <>
      <div className="field"><label htmlFor="new-client-name">Nome do Cliente</label><input id="new-client-name" name="name" required/></div>
      <div className="field"><label htmlFor="new-client-phone">Telefone</label><input id="new-client-phone" type="tel" placeholder="(XX) XXXXX-XXXX" value={phoneLabel(phone)} onChange={event => setPhone(digits(event.target.value).slice(0, 11))} required/></div>
      </>}
      {vehicles.map((id, index) => <fieldset key={id} className="flex flex-col gap-2">
        <legend>Veículo {index + 1}</legend>
        <div className="field"><label htmlFor={`model-${id}`}>Modelo do Veículo</label><input id={`model-${id}`} name={`model-${id}`} placeholder="VW Saveiro G1" required/></div>
        <div className="field"><label htmlFor={`plate-${id}`}>Placa (opcional)</label><input id={`plate-${id}`} name={`plate-${id}`} maxLength={8} placeholder="ABC1D23" onChange={event => { event.currentTarget.value = event.currentTarget.value.toUpperCase(); }}/></div>
        {index > 0 && <button className="secondary" type="button" onClick={() => setVehicles(current => current.filter(vehicle => vehicle !== id))}><Trash2 size={16}/> Remover veículo {index + 1}</button>}
      </fieldset>)}
      <button className="secondary" type="button" onClick={() => { const id = nextVehicle.current++; setVehicles(current => [...current, id]); }}>+ Adicionar outro veículo</button>
      {client && <p className="muted">Se já houver um veículo deste modelo sem placa, a nova placa será vinculada ao cadastro existente.</p>}
      {error && <p className="notice error" role="alert">{error}</p>}
      <button className="primary w-full" type="submit">{client ? 'Salvar veículo' : 'Salvar Cliente'}</button>
      <button className="secondary w-full" type="button" onClick={onClose}>Cancelar</button>
    </form>
  </dialog>;
}
