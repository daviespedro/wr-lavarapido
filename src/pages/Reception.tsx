import { useState } from 'react';
import { Phone, UserRound, Car, Hash, Sparkles, Plus, CircleCheck, Wallet } from 'lucide-react';
import { PageHeading, Notice } from '../components/Layout';
import { VehicleCard } from '../components/VehicleCard';
import { VehicleDialog } from '../components/VehicleDialog';
import { services } from '../lib/data';
import { digits, phoneLabel, localDate } from '../lib/format';
import { commitDatabase, useDatabase } from '../lib/store';
import { finishVehicle, registerVehicle } from '../lib/business';
import type { ReceptionInput, VehicleStatus } from '../lib/types';
const emptyForm: ReceptionForm = { phone: '', name: '', model: '', plate: '', serviceId: 'lavagem' };
type ReceptionForm = Omit<ReceptionInput, 'amount'>;
export function Reception() {
  const { db, error: storageError } = useDatabase();
  const [form, setForm] = useState<ReceptionForm>(emptyForm);
  const [amount, setAmount] = useState('');
  const [notice, setNotice] = useState<{ message: string; error?: boolean } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const found = db.clients.find(c => c.phone === digits(form.phone));
  const selectedVehicle = db.vehicles.find(v => v.id === selected);
  function changePhone(value: string) {
    const phone = digits(value).slice(0, 11);
    const client = db.clients.find(c => c.phone === phone);
    setForm(current => ({ ...current, phone, name: client?.name ?? '', model: client?.model ?? '', plate: client?.plate ?? '' }));
  }
  const update = (key: keyof ReceptionForm, value: string) => setForm(current => ({ ...current, [key]: value }));
  function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      commitDatabase(current => registerVehicle(current, { ...form, amount: /^\d+(?:[.,]\d{1,2})?$/.test(amount) ? Math.round(Number(amount.replace(',', '.')) * 100) : NaN }, crypto.randomUUID(), new Date().toISOString()));
      setForm(emptyForm); setAmount(''); setNotice({ message: 'Entrada registrada. O veículo já está no pátio.' });
    } catch (error) { setNotice({ message: (error as Error).message, error: true }); }
  }
  function updateStatus(status: VehicleStatus) {
    try { commitDatabase(current => ({ ...current, vehicles: current.vehicles.map(v => v.id === selected ? { ...v, status } : v) })); }
    catch (error) { setSelected(null); setNotice({ message: (error as Error).message, error: true }); }
  }
  function finish() {
    try {
      commitDatabase(current => finishVehicle(current, selected!, crypto.randomUUID(), new Date().toISOString(), localDate()));
      setSelected(null); setNotice({ message: 'Atendimento concluído e recebimento lançado no caixa.' });
    } catch (error) { setSelected(null); setNotice({ message: (error as Error).message, error: true }); }
  }
  return <>
    <PageHeading section="RECEPÇÃO" title="Entrada de veículos">Cadastre o carro em segundos. Clientes recorrentes são reconhecidos pelo telefone.</PageHeading>
    {notice && <Notice {...notice} onClose={() => setNotice(null)}/>}
    <form className="reception-form panel grid grid-cols-1 md:grid-cols-2" onSubmit={submit}>
      <div className="field phone-field"><label htmlFor="phone"><Phone size={15}/> TELEFONE</label><div className="relative"><input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="(11) 98765-4321" className={found ? 'autofilled' : ''} value={phoneLabel(form.phone)} onChange={e => changePhone(e.target.value)} required aria-describedby={found ? 'client-found' : undefined}/>{found && <CircleCheck size={20} className="input-check"/>}</div>{found && <p id="client-found" className="found-message" role="status">Cliente encontrado · {found.visits} visitas</p>}</div>
      <div className="field"><label htmlFor="name"><UserRound size={15}/> NOME DO CLIENTE {found && <span>autopreenchido</span>}</label><input id="name" name="name" autoComplete="name" className={found ? 'autofilled' : ''} placeholder="Nome do cliente" maxLength={100} value={form.name} onChange={e => update('name', e.target.value)} required/></div>
      <div className="field"><label htmlFor="model"><Car size={15}/> MODELO DO VEÍCULO {found && <span>autopreenchido</span>}</label><input id="model" className={found ? 'autofilled' : ''} placeholder="Ex.: VW Saveiro G1" maxLength={80} value={form.model} onChange={e => update('model', e.target.value)} required/></div>
      <div className="field"><label htmlFor="plate"><Hash size={15}/> PLACA {found && <span>autopreenchido</span>}</label><input id="plate" className={found ? 'autofilled plate-input' : 'plate-input'} placeholder="ABC1D23" maxLength={8} value={form.plate} onChange={e => update('plate', e.target.value.toUpperCase())} required/></div>
      <div className="field"><label htmlFor="service"><Sparkles size={15}/> SERVIÇO REALIZADO</label><select id="service" value={form.serviceId} onChange={e => update('serviceId', e.target.value)}>{services.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></div>
      <div className="field"><label htmlFor="amount"><Wallet size={15}/> VALOR (R$)</label><input id="amount" name="amount" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0,00" value={amount} onChange={e => setAmount(e.target.value)} required/></div>
      <div className="flex items-end md:col-span-2"><button className="primary w-full" disabled={!!storageError}><Plus size={19}/> REGISTRAR ENTRADA</button></div>
    </form>
    <section className="yard" aria-labelledby="yard-title"><h2 id="yard-title">Veículos no pátio</h2><p className="muted yard-count">{db.vehicles.length} {db.vehicles.length === 1 ? 'carro em atendimento' : 'carros em atendimento'}</p>
      {db.vehicles.length ? <div className="vehicle-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">{db.vehicles.map(vehicle => <VehicleCard key={vehicle.id} vehicle={vehicle} onSelect={() => setSelected(vehicle.id)}/>)}</div> : <div className="empty-state panel"><Car size={30}/><p>Nenhum veículo no pátio.</p><span>Registre uma entrada para iniciar um atendimento.</span></div>}
    </section>
    {selectedVehicle && <VehicleDialog vehicle={selectedVehicle} onClose={() => setSelected(null)} onStatus={updateStatus} onFinish={finish}/>}
  </>;
}
