import { DeleteServiceButton } from './DeleteServiceButton';
import { useEffect, useRef, useState } from 'react';
import { X, Check, ArrowRight, Wallet } from 'lucide-react';
import { paymentMethods, type PaymentMethod, type Vehicle, type VehicleStatus } from '../lib/types';
import { cardFee } from '../lib/business';
import { WhatsAppLink } from './WhatsAppLink';
import { completionUrl } from '../lib/whatsapp';
import { serviceName } from '../lib/data';
import { currency } from '../lib/format';
export function VehicleDialog({ vehicle, incomeRecorded, onClose, onStatus, onFinish }: { vehicle: Vehicle; incomeRecorded: boolean; onClose: () => void; onStatus: (status: VehicleStatus) => void; onFinish: (payment: PaymentMethod) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  const [payment, setPayment] = useState<PaymentMethod | ''>('');
  const fee = cardFee(vehicle.amount, payment || undefined);
  const service = serviceName(vehicle);
  return <dialog ref={ref} className="vehicle-dialog panel" onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }} aria-labelledby="dialog-title"><div>
    <div className="flex items-center justify-between"><p className="eyebrow">ATENDIMENTO</p><button aria-label="Fechar janela do atendimento" onClick={onClose}><X size={21}/></button></div>
    <h2 id="dialog-title">{vehicle.client.model}</h2><p className="dialog-plate">{vehicle.client.plate || 'Sem placa'}</p>
    <dl><div><dt>Cliente</dt><dd>{vehicle.client.name}</dd></div><div><dt>Telefone</dt><dd><WhatsAppLink phone={vehicle.client.phone}/></dd></div><div><dt>Serviço</dt><dd>{service}</dd></div><div><dt>Valor</dt><dd>{currency(vehicle.amount)}</dd></div></dl>
    <p className="muted mb-4">Status atual: {vehicle.status}</p>
    {vehicle.status !== 'Finalizado' ? <button className="primary w-full" onClick={() => onStatus(vehicle.status === 'Aguardando' ? 'Em lavagem' : 'Finalizado')}>{vehicle.status === 'Aguardando' ? <ArrowRight size={18}/> : <Check size={18}/>} {vehicle.status === 'Aguardando' ? 'Iniciar lavagem' : 'Marcar como finalizado'}</button> : <form className="checkout-form flex flex-col gap-4 w-full" onSubmit={event => { event.preventDefault(); if (payment) onFinish(payment); }}>
      {incomeRecorded && <p className="muted">O valor já está no caixa. A forma de pagamento será aplicada ao lançamento original.</p>}
      <label className="field payment-field">Forma de pagamento
        <select className="w-full" required value={payment} onChange={event => setPayment(event.target.value as PaymentMethod | '')}>
          <option value="">Selecione</option>{paymentMethods.map(method => <option key={method}>{method}</option>)}
        </select>
      </label>
      {(payment === 'Crédito' || payment === 'Débito') && <p className="cash-fees">Taxa de Maquininha: -{currency(fee)} · Líquido: {currency(vehicle.amount - fee)}</p>}
      <a className="secondary whatsapp-link w-full" href={completionUrl(vehicle.client)} target="_blank" rel="noopener noreferrer">Abrir aviso de retirada no WhatsApp</a>
      <button className="primary w-full" disabled={!payment}><Wallet size={18}/> Fechar atendimento</button>
    </form>}
    <DeleteServiceButton id={vehicle.id}/>
  </div></dialog>;
}
