import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { NewClientDialog } from './NewClientDialog';
import { clientsByPlate, serviceHistory } from '../lib/business';
import { currency } from '../lib/format';
import type { Client, Database } from '../lib/types';
import { WhatsAppLink } from './WhatsAppLink';

export function ClientProfile({ client, db, onClose }: { client: Client; db: Database; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  const [adding, setAdding] = useState(false);
  const vehicles = [...clientsByPlate(db).values()].filter(vehicle => vehicle.phone === client.phone);
  const plates = new Set(vehicles.map(vehicle => vehicle.plate).filter(Boolean));
  const history = serviceHistory(db).filter(service => service.phone
    ? service.phone === client.phone
    : plates.has(service.plate));
  const visits = Math.max(history.length, db.clients.find(c => c.phone === client.phone)?.visits ?? client.visits);
  return <dialog ref={ref} className="vehicle-dialog panel" onCancel={event => { if (event.target === event.currentTarget) onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }} aria-labelledby="profile-title"><div>
    <div className="flex items-center justify-between"><h2 id="profile-title">Perfil do Cliente</h2><button aria-label="Fechar perfil" onClick={onClose}><X size={21}/></button></div>
    <dl><div><dt>Cliente</dt><dd>{client.name}</dd></div><div><dt>WhatsApp</dt><dd><WhatsAppLink phone={client.phone}/></dd></div><div><dt>Visitas do cliente</dt><dd>{visits}</dd></div></dl>
    <h3>Veículos cadastrados</h3>
    <ul className="record-list">{vehicles.map(vehicle => <li key={vehicle.plate || vehicle.model}>{vehicle.model} ({vehicle.plate || 'Sem placa'})</li>)}</ul>
    <button className="secondary mb-4" type="button" onClick={() => setAdding(true)}>+ Adicionar Veículo</button>
    <h3>Histórico de serviços</h3>
    {history.length ? <ul className="record-list">{history.map(service => <li key={service.id}><span>{service.description}{service.model && ` — ${service.model} (${service.plate || 'Sem placa'})`} · {service.date.split('-').reverse().join('/')}</span><strong>{currency(service.amount)}</strong></li>)}</ul> : <p className="muted">Ainda não há serviços concluídos para este cliente.</p>}
  </div>{adding && <NewClientDialog client={client} onClose={() => setAdding(false)} onSaved={() => setAdding(false)}/>}</dialog>;
}
