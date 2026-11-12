import { useEffect, useRef } from 'react';
import { X, Check, ArrowRight, Wallet } from 'lucide-react';
import type { Vehicle, VehicleStatus } from '../lib/types';
import { services } from '../lib/data';
import { currency, phoneLabel } from '../lib/format';
export function VehicleDialog({ vehicle, incomeRecorded, onClose, onStatus, onFinish }: { vehicle: Vehicle; incomeRecorded: boolean; onClose: () => void; onStatus: (status: VehicleStatus) => void; onFinish: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  const service = services.find(s => s.id === vehicle.serviceId)!;
  return <dialog ref={ref} className="vehicle-dialog panel" onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }} aria-labelledby="dialog-title"><div>
    <div className="flex items-center justify-between"><p className="eyebrow">ATENDIMENTO</p><button aria-label="Fechar atendimento" onClick={onClose}><X size={21}/></button></div>
    <h2 id="dialog-title">{vehicle.client.model}</h2><p className="dialog-plate">{vehicle.client.plate}</p>
    <dl><div><dt>Cliente</dt><dd>{vehicle.client.name}</dd></div><div><dt>Telefone</dt><dd>{phoneLabel(vehicle.client.phone)}</dd></div><div><dt>Serviço</dt><dd>{service.name}</dd></div><div><dt>Valor</dt><dd>{currency(vehicle.amount)}</dd></div></dl>
    <p className="muted mb-4">Status atual: {vehicle.status}</p>
    {vehicle.status !== 'Pronto' ? <button className="primary w-full" onClick={() => onStatus(vehicle.status === 'Aguardando' ? 'Em lavagem' : 'Pronto')}>{vehicle.status === 'Aguardando' ? <ArrowRight size={18}/> : <Check size={18}/>} {vehicle.status === 'Aguardando' ? 'Iniciar lavagem' : 'Marcar como pronto'}</button> : <><p className="muted mb-4">{incomeRecorded ? 'O valor já está no caixa. Finalizar retira o veículo do pátio.' : 'Este veículo entrou antes do lançamento automático. Ao receber, o valor será lançado no caixa de hoje.'}</p><button className="primary w-full" onClick={onFinish}>{incomeRecorded ? <><Check size={18}/> Finalizar atendimento</> : <><Wallet size={18}/> Finalizar e receber {currency(vehicle.amount)}</>}</button></>}
  </div></dialog>;
}
