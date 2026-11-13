import { useState } from 'react';
import { Notice } from './Layout';
import { VehicleCard } from './VehicleCard';
import { VehicleDialog } from './VehicleDialog';
import { completionUrl } from '../lib/whatsapp';
import { localDate } from '../lib/format';
import { commitDatabase, useDatabase } from '../lib/store';
import { finishVehicle, hasVehicleIncome } from '../lib/business';
import type { PaymentMethod, VehicleStatus } from '../lib/types';

const groups: { status: VehicleStatus; label: string }[] = [
  { status: 'Aguardando', label: 'Em espera' },
  { status: 'Em lavagem', label: 'Em lavagem' },
  { status: 'Finalizado', label: 'Finalizados' },
];

export function Yard() {
  const { db } = useDatabase();
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ message: string; error?: boolean } | null>(null);
  const selectedVehicle = db.vehicles.find(vehicle => vehicle.id === selected);
  function updateStatus(status: VehicleStatus) {
    if (!selectedVehicle) return;
    let changed = false;
    try {
      commitDatabase(current => ({ ...current, vehicles: current.vehicles.map(vehicle => {
        if (vehicle.id !== selectedVehicle.id || vehicle.status === status) return vehicle;
        changed = true;
        return { ...vehicle, status, finalizedAt: status === 'Finalizado' ? new Date().toISOString() : undefined };
      }) }));
      if (changed && status === 'Finalizado') window.open(completionUrl(selectedVehicle.client), '_blank', 'noopener,noreferrer');
    } catch (error) { setSelected(null); setNotice({ message: (error as Error).message, error: true }); }
  }
  function finish(payment: PaymentMethod) {
    try {
      commitDatabase(current => finishVehicle(current, selected!, crypto.randomUUID(), new Date().toISOString(), localDate(), payment));
      setSelected(null); setNotice({ message: 'Atendimento concluído. O veículo saiu do pátio.' });
    } catch (error) { setSelected(null); setNotice({ message: (error as Error).message, error: true }); }
  }
  return <>
    {notice && <Notice {...notice} onClose={() => setNotice(null)}/>}
    <section className="yard" aria-labelledby="yard-title"><h2 id="yard-title">Veículos no pátio</h2><p className="muted yard-count">{db.vehicles.length} {db.vehicles.length === 1 ? 'carro em atendimento' : 'carros em atendimento'}</p>
      {groups.map(({ status, label }, index) => {
        const vehicles = db.vehicles.filter(vehicle => vehicle.status === status);
        const headingId = `yard-group-${index}`;
        return <section className="yard-group" key={status} aria-labelledby={headingId}>
          <h3 id={headingId}>{label} <span className="muted">({vehicles.length})</span></h3>
          {vehicles.length > 0
            ? <div className="vehicle-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                {vehicles.map(vehicle => <VehicleCard key={vehicle.id} vehicle={vehicle} onSelect={() => setSelected(vehicle.id)}/>)}
              </div>
            : <p className="muted">Nenhum veículo nesta etapa.</p>}
        </section>;
      })}
    </section>
    {selectedVehicle && <VehicleDialog vehicle={selectedVehicle} incomeRecorded={hasVehicleIncome(db, selectedVehicle.id)} onClose={() => setSelected(null)} onStatus={updateStatus} onFinish={finish}/>}
  </>;
}
