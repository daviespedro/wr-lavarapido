import { useState } from 'react';
import { Yard } from '../components/Yard';
import { Phone, UserRound, Car, Hash, Sparkles, Plus, Wallet } from 'lucide-react';
import { PageHeading, Notice } from '../components/Layout';
import { services } from '../lib/data';
import { digits, phoneLabel } from '../lib/format';
import { commitDatabase, useDatabase } from '../lib/store';
import { clientsByPlate, registerVehicle } from '../lib/business';
import type { ReceptionInput } from '../lib/types';
const emptyForm: ReceptionForm = { phone: '', name: '', model: '', plate: '', serviceId: 'lavagem' };
type ReceptionForm = Omit<ReceptionInput, 'amount'>;
export function Reception() {
  const { db, error: storageError } = useDatabase();
  const [form, setForm] = useState<ReceptionForm>(emptyForm);
  const [amount, setAmount] = useState('');
  const [notice, setNotice] = useState<{ message: string; error?: boolean } | null>(null);
  function changePlate(value: string) {
    const plate = value.replace(/[^a-z0-9]/gi, '').toUpperCase();
    const client = clientsByPlate(db).get(plate);
    setForm(current => ({ ...current, ...(client ? { phone: client.phone, name: client.name, model: client.model } : {}), plate }));
  }
  function changePhone(value: string) {
    const phone = digits(value).slice(0, 11);
    const client = db.clients.find(c => c.phone === phone);
    setForm(current => ({ ...current, phone, ...(client ? { name: client.name, model: client.model, plate: client.plate } : {}) }));
  }
  const update = (key: keyof ReceptionForm, value: string) => setForm(current => ({ ...current, [key]: value }));
  function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      commitDatabase(current => registerVehicle(current, { ...form, amount: /^\d+(?:[.,]\d{1,2})?$/.test(amount) ? Math.round(Number(amount.replace(',', '.')) * 100) : NaN }, crypto.randomUUID(), new Date().toISOString()));
      setForm(emptyForm); setAmount(''); setNotice({ message: 'Entrada registrada no pátio. O pagamento será lançado no fechamento.' });
    } catch (error) { setNotice({ message: (error as Error).message, error: true }); }
  }
  return <>
    <PageHeading section="RECEPÇÃO" title="Entrada de veículos">Registre um veículo para iniciar um atendimento.</PageHeading>
    {notice && <Notice {...notice} onClose={() => setNotice(null)}/>}
    <form className="reception-form panel grid grid-cols-1 md:grid-cols-2" onSubmit={submit}>
      <div className="field"><label htmlFor="phone"><Phone size={15}/> TELEFONE</label><input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="(11) 98765-4321" value={phoneLabel(form.phone)} onChange={e => changePhone(e.target.value)} required/></div>
      <div className="field"><label htmlFor="name"><UserRound size={15}/> NOME DO CLIENTE</label><input id="name" name="name" autoComplete="name" placeholder="Nome do cliente" maxLength={100} value={form.name} onChange={e => update('name', e.target.value)} required/></div>
      <div className="field"><label htmlFor="model"><Car size={15}/> MODELO DO VEÍCULO</label><input id="model" placeholder="Ex.: VW Saveiro G1" maxLength={80} value={form.model} onChange={e => update('model', e.target.value)} required/></div>
      <div className="field"><label htmlFor="plate"><Hash size={15}/> PLACA</label><input id="plate" className="plate-input" placeholder="ABC1D23" maxLength={8} value={form.plate} onChange={e => changePlate(e.target.value)} required/></div>
      <div className="field"><label htmlFor="service"><Sparkles size={15}/> SERVIÇO REALIZADO</label><select id="service" value={form.serviceId} onChange={e => update('serviceId', e.target.value)}>{services.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></div>
      <div className="field"><label htmlFor="amount"><Wallet size={15}/> VALOR (R$)</label><input id="amount" name="amount" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0,00" value={amount} onChange={e => setAmount(e.target.value)} required/></div>
      <div className="flex items-end md:col-span-2"><button className="primary w-full" disabled={!!storageError}><Plus size={19}/> REGISTRAR ENTRADA</button></div>
    </form>
    <Yard/>
  </>;
}
