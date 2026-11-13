import { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { Reception } from './pages/Reception';
import { Cash } from './pages/Cash';
import { processRecurring, useDatabase } from './lib/store';
import { BackupControls } from './components/BackupControls';
const currentPage = () => window.location.pathname.replace(/\/$/, '') === '/caixa' ? 'cash' : 'reception';
export default function App() {
  const [page, setPage] = useState<'cash' | 'reception'>(currentPage);
  const { error } = useDatabase();
  const [recurringError, setRecurringError] = useState('');
  useEffect(() => {
    if (error) return;
    try { processRecurring(); setRecurringError(''); }
    catch (cause) { setRecurringError(`Não foi possível lançar as despesas recorrentes: ${(cause as Error).message}`); }
  }, [page, error]);
  useEffect(() => { const onPop = () => setPage(currentPage()); window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop); }, []);
  useEffect(() => { document.title = `${page === 'cash' ? 'Caixa' : 'Recepção'} — WR Lava Rápido`; }, [page]);
  function navigate(next: 'cash' | 'reception') { if (next === page) return; history.pushState(null, '', next === 'cash' ? '/caixa' : '/'); setPage(next); window.scrollTo(0, 0); }
  return <Layout page={page} onNavigate={navigate}>{error && <div role="alert" className="notice error mb-6 no-print">{error} As alterações estão bloqueadas para preservar seus registros.</div>}{recurringError && <div role="alert" className="notice error no-print">{recurringError}</div>}{page === 'cash' ? <Cash/> : <Reception/>}<BackupControls/></Layout>;
}
