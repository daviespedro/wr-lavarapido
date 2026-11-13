import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { serviceHistory } from '../lib/business';
import { currency } from '../lib/format';
import type { Client, Database } from '../lib/types';
import { WhatsAppLink } from './WhatsAppLink';

export function ClientProfile({ client, db, onClose }: { client: Client; db: Database; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  const history = serviceHistory(db).filter(service => service.plate === client.plate);
  const visits = db.clients.find(c => c.phone === client.phone)?.visits ?? client.visits;
  return <dialog ref={ref} className="vehicle-dialog panel" onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }} aria-labelledby="profile-title"><div>
    <div className="flex items-center justify-between"><h2 id="profile-title">Perfil do Cliente</h2><button aria-label="Fechar perfil" onClick={onClose}><X size={21}/></button></div>
    <dl><div><dt>Cliente</dt><dd>{client.name}</dd></div><div><dt>WhatsApp</dt><dd><WhatsAppLink phone={client.phone}/></dd></div><div><dt>Veículo</dt><dd>{client.model} · {client.plate}</dd></div><div><dt>Visitas do cliente</dt><dd>{visits}</dd></div></dl>
    <h3>Histórico de serviços da placa {client.plate}</h3>
    {history.length ? <ul className="record-list">{history.map(service => <li key={service.id}><span>{service.description} · {service.date.split('-').reverse().join('/')}</span><strong>{currency(service.amount)}</strong></li>)}</ul> : <p className="muted">Ainda não há serviços concluídos para esta placa.</p>}
  </div></dialog>;
}
