import { useState } from 'react';
import { NewClientDialog } from '../components/NewClientDialog';
import { ClientProfile } from '../components/ClientProfile';
import { PageHeading } from '../components/Layout';
import { WhatsAppLink } from '../components/WhatsAppLink';
import { clientsByPlate, serviceHistory } from '../lib/business';
import { useDatabase } from '../lib/store';
import type { Client } from '../lib/types';

const searchText = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const searchPlate = (value: string) => value.replace(/[\s-]/g, '').toLowerCase();

export function Clients() {
  const { db, error } = useDatabase();
  const [profile, setProfile] = useState<Client | null>(null);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const vehiclesByPhone = new Map<string, Client[]>();
  for (const vehicle of clientsByPlate(db).values()) {
    const vehicles = vehiclesByPhone.get(vehicle.phone) ?? [];
    vehicles.push(vehicle);
    vehiclesByPhone.set(vehicle.phone, vehicles);
  }

  const term = searchText(query.trim());
  const plateTerm = searchPlate(term);
  const rows = db.clients.map(client => ({
    client,
    vehicles: vehiclesByPhone.get(client.phone) ?? [],
  })).filter(({ client, vehicles }) => !term || searchText(client.name).includes(term)
    || vehicles.some(vehicle => searchText(vehicle.model).includes(term)
      || (plateTerm && searchPlate(vehicle.plate).includes(plateTerm))));

  return <>
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-4">
    <PageHeading section="CRM" title="Clientes">Consulte os dados dos clientes e o histórico de serviços por placa.</PageHeading>
      <button type="button" className="primary" disabled={!!error} onClick={() => setAdding(true)}>+ Novo Cliente</button>
    </div>
    <section className="summary-grid grid grid-cols-1 sm:grid-cols-2" aria-label="Indicadores de clientes e serviços">
      <div className="summary-card panel"><h2>Total de Clientes</h2><p className="summary-value">{db.clients.length}</p></div>
      <div className="summary-card panel"><h2>Total de Serviços Realizados</h2><p className="summary-value">{serviceHistory(db).length}</p></div>
    </section>
    <div className="field mb-4">
      <label htmlFor="client-search">Buscar por placa, nome ou modelo do veículo</label>
      <input id="client-search" className="w-full" type="search" placeholder="Ex.: ABC1D23, Ana ou Fiat Uno"
        value={query} onChange={event => setQuery(event.target.value)}/>
    </div>
    <div className="ledger-panel panel"><div className="table-scroll">
      <table>
        <caption className="sr-only">Clientes cadastrados</caption>
        <thead><tr><th scope="col">Nome</th><th scope="col">Telefone</th><th scope="col">Placa</th><th scope="col">Histórico</th></tr></thead>
        <tbody>
          {rows.map(({ client, vehicles }) => (
            <tr key={client.phone}>
              <th scope="row">{client.name}</th>
              <td><WhatsAppLink phone={client.phone}/></td>
              <td><div className="flex flex-wrap gap-2">
                {vehicles.map(vehicle => <span className="client-plate-tag" key={vehicle.plate || vehicle.model}>{vehicle.plate || `Sem placa (${vehicle.model})`}</span>)}
              </div></td>
              <td><button className="secondary" type="button" onClick={() => setProfile(client)}>Gerenciar / Histórico</button></td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={4} className="empty-ledger">
            {db.clients.length ? 'Nenhum cliente encontrado para esta busca.' : 'Nenhum cliente cadastrado.'}
          </td></tr>}
        </tbody>
      </table>
    </div></div>
    {adding && <NewClientDialog onClose={() => setAdding(false)} onSaved={() => { setQuery(''); setAdding(false); }}/>}
    {profile && <ClientProfile client={db.clients.find(client => client.phone === profile.phone) ?? profile} db={db} onClientChanged={phone => setProfile({ ...profile, phone })} onClose={() => setProfile(null)}/>}
  </>;
}
