import { useState } from 'react';
import { Yard } from '../components/Yard';
import { Phone, UserRound, Car, Hash, Sparkles, Plus, Settings, Wallet } from 'lucide-react';
import { PageHeading, Notice } from '../components/Layout';
import { ServiceCatalogDialog } from '../components/ServiceCatalogDialog';
import { digits, normalizePlate, phoneLabel } from '../lib/format';
import { commitDatabase, readCatalog, useDatabase } from '../lib/store';
import { clientsByPlate, registerVehicle } from '../lib/business';
import type { ReceptionInput } from '../lib/types';
const emptyForm: ReceptionForm = { phone: '', name: '', model: '', plate: '', serviceId: 'lavagem' };
type ReceptionForm = Omit<ReceptionInput, 'amount'>;
export function Reception() {
  const { db, catalog, error: storageError } = useDatabase();
  const [form, setForm] = useState<ReceptionForm>(emptyForm);
  const [managing, setManaging] = useState(false);
  const serviceId = catalog.some(service => service.id === form.serviceId) ? form.serviceId : catalog[0]?.id ?? '';
  const [amount, setAmount] = useState('');
  const [notice, setNotice] = useState<{ message: string; error?: boolean } | null>(null);
  const knownVehicles = [...clientsByPlate(db).values()].filter(vehicle => vehicle.phone === form.phone);
  function changePlate(value: string) {
    const plate = normalizePlate(value);
    const client = clientsByPlate(db).get(plate);
    setForm(current => ({ ...current, ...(client ? { phone: client.phone, name: db.clients.find(entry => entry.phone === client.phone)?.name ?? client.name, model: client.model } : {}), plate }));
  }
  function changePhone(value: string) {
    const phone = digits(value).slice(0, 11);
    const client = db.clients.find(c => c.phone === phone);
    const vehicles = [...clientsByPlate(db).values()].filter(vehicle => vehicle.phone === phone);
    setForm(current => ({ ...current, phone, ...(client ? {
      name: client.name,
      model: vehicles.length === 1 ? vehicles[0].model : '',
      plate: vehicles.length === 1 ? vehicles[0].plate : '',
    } : {}) }));
  }
  const update = (key: keyof ReceptionForm, value: string) => setForm(current => ({ ...current, [key]: value }));
  function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      commitDatabase(current => registerVehicle(current, { ...form, serviceId, amount: /^\d+(?:[.,]\d{1,2})?$/.test(amount) ? Math.round(Number(amount.replace(',', '.')) * 100) : NaN }, crypto.randomUUID(), new Date().toISOString(), readCatalog()));
      setForm(emptyForm); setAmount(''); setNotice({ message: 'Entrada registrada no pátio. O pagamento será lançado no fechamento.' });
    } catch (error) { setNotice({ message: (error as Error).message, error: true }); }
  }
  return <>
    <PageHeading section="RECEPÇÃO" title="Entrada de veículos">Registre um veículo para iniciar um atendimento.</PageHeading>
    {notice && <Notice {...notice} onClose={() => setNotice(null)}/>}
    <form className="reception-form panel grid grid-cols-1 md:grid-cols-2" onSubmit={submit}>
      <div className="field"><label htmlFor="phone"><Phone size={15}/> TELEFONE</label><input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="(11) 98765-4321" value={phoneLabel(form.phone)} onChange={e => changePhone(e.target.value)} required/></div>
      <div className="field"><label htmlFor="name"><UserRound size={15}/> NOME DO CLIENTE</label><input id="name" name="name" autoComplete="name" placeholder="Nome do cliente" maxLength={100} value={form.name} onChange={e => update('name', e.target.value)} required/></div>
      <div className="field"><label htmlFor="model"><Car size={15}/> MODELO DO VEÍCULO</label><input id="model" placeholder="Ex.: VW Saveiro G1" maxLength={80} value={form.model} onChange={e => update('model', e.target.value)} required/>
        {knownVehicles.length > 1 && <div className="flex flex-wrap gap-2 mt-2" role="group" aria-label="Veículos cadastrados">
          {knownVehicles.map(vehicle => <button key={vehicle.plate || vehicle.model} className="secondary" type="button"
            onClick={() => setForm(current => ({ ...current, model: vehicle.model, plate: vehicle.plate }))}>
            {vehicle.model} ({vehicle.plate || 'Sem placa'})
          </button>)}
        </div>}
      </div>
      <div className="field"><label htmlFor="plate"><Hash size={15}/> PLACA (OPCIONAL)</label><input id="plate" className="plate-input" placeholder="ABC1D23" maxLength={8} value={form.plate} onChange={e => changePlate(e.target.value)}/></div>
      <div className="field">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <label htmlFor="service"><Sparkles size={15}/> SERVIÇO REALIZADO</label>
          <button className="secondary" type="button" disabled={!!storageError} onClick={() => setManaging(true)}><Settings size={15}/> Gerenciar</button>
        </div>
        <select id="service" value={serviceId} onChange={event => {
          update('serviceId', event.target.value);
          const suggested = catalog.find(service => service.id === event.target.value)?.suggestedAmount;
          if (suggested !== undefined) setAmount((suggested / 100).toFixed(2));
        }}>
          {!catalog.length && <option value="">Nenhum serviço cadastrado</option>}
          {catalog.map(service => <option value={service.id} key={service.id}>{service.name}</option>)}
        </select>
      </div>
      <div className="field"><label htmlFor="amount"><Wallet size={15}/> VALOR (R$)</label><input id="amount" name="amount" type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0,00" value={amount} onChange={e => setAmount(e.target.value)} required/></div>
      <div className="flex items-end md:col-span-2"><button className="primary w-full" disabled={!!storageError || !serviceId}><Plus size={19}/> REGISTRAR ENTRADA</button></div>
    </form>
    {managing && <ServiceCatalogDialog onClose={() => setManaging(false)}/> }
    <Yard/>
  </>;
}
