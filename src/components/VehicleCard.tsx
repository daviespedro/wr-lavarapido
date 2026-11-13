import { Clock3, Sparkles } from 'lucide-react';
import type { Vehicle } from '../lib/types';
import { services } from '../lib/data';
export function VehicleCard({ vehicle, onSelect }: { vehicle: Vehicle; onSelect: () => void }) {
  const service = services.find(s => s.id === vehicle.serviceId)!;
  return <button className="vehicle-card text-left" onClick={onSelect} aria-label={`Abrir atendimento ${vehicle.client.plate}, ${vehicle.client.model}`}>
    <div className="flex items-center justify-between gap-2"><span className={`status-badge ${vehicle.status === 'Finalizado' ? 'ready' : vehicle.status === 'Em lavagem' ? 'washing' : ''}`}>{vehicle.status}</span><span className="arrival flex items-center gap-1"><Clock3 size={12}/>{new Date(vehicle.arrivedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></div>
    <div className="plate"><div className="plate-band flex justify-between"><span>BR</span><span>BRASIL</span><span aria-hidden="true"> </span></div><div className="plate-number">{vehicle.client.plate}</div></div>
    <h3>{vehicle.client.model}</h3><p className="client-name">{vehicle.client.name}</p>
    <div className="service-chip flex items-center gap-2"><Sparkles size={17}/><span>{service.name}</span></div>
  </button>;
}
