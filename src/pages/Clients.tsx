import { useState } from 'react';
import { ClientProfile } from '../components/ClientProfile';
import { PageHeading } from '../components/Layout';
import { WhatsAppLink } from '../components/WhatsAppLink';
import { clientsByPlate, serviceHistory } from '../lib/business';
import { useDatabase } from '../lib/store';
import type { Client } from '../lib/types';

export function Clients() {
  const { db } = useDatabase();
  const [profile, setProfile] = useState<Client | null>(null);
  const vehiclesByPhone = new Map<string, Client[]>();
  for (const vehicle of clientsByPlate(db).values()) {
    const vehicles = vehiclesByPhone.get(vehicle.phone) ?? [];
    vehicles.push(vehicle);
    vehiclesByPhone.set(vehicle.phone, vehicles);
  }

  return <>
    <PageHeading section="CRM" title="Clientes">Consulte os dados dos clientes e o histórico de serviços por placa.</PageHeading>
    <section className="summary-grid grid grid-cols-1 sm:grid-cols-2" aria-label="Indicadores de clientes e serviços">
      <div className="summary-card panel"><h2>Total de Clientes</h2><p className="summary-value">{db.clients.length}</p></div>
      <div className="summary-card panel"><h2>Total de Serviços Realizados</h2><p className="summary-value">{serviceHistory(db).length}</p></div>
    </section>
    <div className="ledger-panel panel"><div className="table-scroll">
      <table>
        <caption className="sr-only">Clientes cadastrados</caption>
        <thead><tr><th scope="col">Nome</th><th scope="col">Telefone</th><th scope="col">Placa</th><th scope="col">Histórico</th></tr></thead>
        <tbody>
          {db.clients.map(client => {
            const vehicles = vehiclesByPhone.get(client.phone) ?? [client];
            return <tr key={client.phone}>
              <th scope="row">{client.name}</th>
              <td><WhatsAppLink phone={client.phone}/></td>
              <td>{vehicles.map(vehicle => vehicle.plate).join(', ')}</td>
              <td><div className="flex flex-wrap gap-2">
                {vehicles.map(vehicle => <button key={vehicle.plate} className="secondary" type="button" onClick={() => setProfile({ ...vehicle, name: client.name })}>
                  Ver Perfil/Histórico{vehicles.length > 1 ? ` · ${vehicle.plate}` : ''}
                </button>)}
              </div></td>
            </tr>;
          })}
          {!db.clients.length && <tr><td colSpan={4} className="empty-ledger">Nenhum cliente cadastrado.</td></tr>}
        </tbody>
      </table>
    </div></div>
    {profile && <ClientProfile client={profile} db={db} onClose={() => setProfile(null)}/>}
  </>;
}
