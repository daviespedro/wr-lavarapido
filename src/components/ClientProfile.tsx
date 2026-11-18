import { DeleteServiceButton } from './DeleteServiceButton';
import { useEffect, useRef, useState } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import { NewClientDialog } from './NewClientDialog';
import { clientVehicleKey, clientsByPlate, deleteClient, removeClientVehicle, serviceHistory, updateClientDetails, updateClientVehicle } from '../lib/business';
import { currency, digits, phoneLabel } from '../lib/format';
import type { Client, Database } from '../lib/types';
import { commitDatabase } from '../lib/store';
import { WhatsAppLink } from './WhatsAppLink';

export function ClientProfile({ client, db, onClose, onClientChanged }: { client: Client; db: Database; onClose: () => void; onClientChanged: (phone: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  const [adding, setAdding] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [phone, setPhone] = useState(client.phone);
  const [editingVehicle, setEditingVehicle] = useState<string | null>(null);
  const [error, setError] = useState('');
  function save(update: (db: Database) => Database, done: () => void) {
    try {
      commitDatabase(update);
      setError('');
      done();
    } catch (cause) {
      setError((cause as Error).message);
    }
  }
  const vehicles = [...clientsByPlate(db).values()].filter(vehicle => vehicle.phone === client.phone);
  const plates = new Set(vehicles.map(vehicle => vehicle.plate).filter(Boolean));
  const history = serviceHistory(db).filter(service => service.phone
    ? service.phone === client.phone
    : plates.has(service.plate));
  const visits = Math.max(history.length, db.clients.find(c => c.phone === client.phone)?.visits ?? client.visits);
  return <dialog ref={ref} className="vehicle-dialog panel" onCancel={event => { if (event.target === event.currentTarget) onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }} aria-labelledby="profile-title"><div>
    <div className="flex items-center justify-between"><h2 id="profile-title">Perfil do Cliente</h2><button aria-label="Fechar perfil" onClick={onClose}><X size={21}/></button></div>
    {error && <p className="notice error" role="alert">{error}</p>}
    {editingDetails ? <form className="flex flex-col gap-3 my-4" onSubmit={event => {
      event.preventDefault();
      const name = String(new FormData(event.currentTarget).get('name'));
      save(current => updateClientDetails(current, client.phone, name, phone), () => {
        setEditingDetails(false);
        setEditingVehicle(null);
        onClientChanged(phone);
      });
    }}>
      <label>Nome do Cliente<input className="w-full" name="name" defaultValue={client.name} required/></label>
      <label>Telefone<input className="w-full" type="tel" value={phoneLabel(phone)} onChange={event => setPhone(digits(event.target.value).slice(0, 11))} required/></label>
      <button className="primary">Salvar</button>
      <button className="secondary" type="button" onClick={() => { setEditingDetails(false); setError(''); }}>Cancelar</button>
    </form> : <dl><div><dt>Cliente</dt><dd className="flex flex-wrap items-center gap-2">{client.name}<button className="secondary" type="button" onClick={() => { setPhone(client.phone); setEditingDetails(true); }}><Pencil size={15}/> Editar Dados</button></dd></div><div><dt>WhatsApp</dt><dd><WhatsAppLink phone={client.phone}/></dd></div><div><dt>Visitas do cliente</dt><dd>{visits}</dd></div></dl>}
    <h3>Veículos cadastrados</h3>
    <ul className="record-list">{vehicles.map(vehicle => {
      const key = clientVehicleKey(vehicle);
      return <li key={key}>{editingVehicle === key ? <form className="flex flex-col gap-2 w-full" onSubmit={event => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        save(current => updateClientVehicle(current, vehicle, String(fields.get('model')), String(fields.get('plate'))), () => setEditingVehicle(null));
      }}>
        <label>Modelo do Veículo<input className="w-full" name="model" defaultValue={vehicle.model} required/></label>
        <label>Placa (opcional)<input className="w-full" name="plate" defaultValue={vehicle.plate} maxLength={8} onChange={event => { event.currentTarget.value = event.currentTarget.value.toUpperCase(); }}/></label>
        <button className="primary">Salvar</button>
        <button className="secondary" type="button" onClick={() => { setEditingVehicle(null); setError(''); }}>Cancelar</button>
      </form> : <>
        <span>{vehicle.model} ({vehicle.plate || 'Sem placa'})</span>
        <div className="flex gap-2">
          <button className="secondary" type="button" aria-label={`Editar veículo ${vehicle.model}`} onClick={() => { setError(''); setEditingVehicle(key); }}><Pencil size={15}/></button>
          <button className="secondary danger-outline" type="button" aria-label={`Remover veículo ${vehicle.model}`} onClick={() => {
            if (window.confirm('Deseja remover este veículo do cadastro do cliente?')) {
              save(current => removeClientVehicle(current, vehicle), () => {});
            }
          }}><Trash2 size={15}/></button>
        </div>
      </>}</li>;
    })}</ul>
    <button className="secondary mb-4" type="button" onClick={() => setAdding(true)}>+ Adicionar Veículo</button>
    <h3>Histórico de serviços</h3>
    {history.length ? <ul className="record-list">{history.map(service => <li key={service.id}><span>{service.description}{service.model && ` — ${service.model} (${service.plate || 'Sem placa'})`} · {service.date.split('-').reverse().join('/')}</span><strong>{currency(service.amount)}</strong><DeleteServiceButton id={service.id} compact/></li>)}</ul> : <p className="muted">Ainda não há serviços concluídos para este cliente.</p>}
    <footer className="flex justify-end mt-4">
      <button className="secondary danger-outline" type="button" onClick={() => {
        if (window.confirm('Deseja excluir este cliente? Os atendimentos e lançamentos do Caixa serão preservados.')) {
          save(current => deleteClient(current, client.phone), onClose);
        }
      }}><Trash2 size={16}/> Excluir Cliente</button>
    </footer>
  </div>{adding && <NewClientDialog client={client} onClose={() => setAdding(false)} onSaved={() => setAdding(false)}/>}</dialog>;
}
