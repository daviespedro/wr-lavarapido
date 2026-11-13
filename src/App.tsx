import { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { Reception } from './pages/Reception';
import { Cash } from './pages/Cash';
import { useDatabase } from './lib/store';
import { BackupControls } from './components/BackupControls';
import { Clients } from './pages/Clients';
import { localDate } from './lib/format';
import { pageFromPath, pages, type Page } from './lib/navigation';

const currentPage = () => pageFromPath(window.location.pathname);
const views = { reception: Reception, clients: Clients };
export default function App() {
  const [page, setPage] = useState<Page>(currentPage);
  const { error } = useDatabase();
  const [month, setMonth] = useState(() => localDate().slice(0, 7));
  useEffect(() => { const onPop = () => setPage(currentPage()); window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop); }, []);
  useEffect(() => { document.title = `${pages[page].label} — WR Lava Rápido`; }, [page]);
  function navigate(next: Page) { if (next === page) return; history.pushState(null, '', pages[next].path); setPage(next); window.scrollTo(0, 0); }
  const View = page === 'cash' ? null : views[page];
  return <Layout page={page} onNavigate={navigate}>{error && <div role="alert" className="notice error mb-6 no-print">{error} As alterações estão bloqueadas para preservar seus registros.</div>}{page === 'cash' ? <Cash month={month} setMonth={setMonth}/> : View && <View/>}{page === 'cash' && <BackupControls/>}</Layout>;
}
