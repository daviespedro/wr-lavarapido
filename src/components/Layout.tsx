import { Car, Users, Wallet, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { pages, type Page } from '../lib/navigation';

const icons = { reception: Car, clients: Users, cash: Wallet };

export function Layout({ page, onNavigate, children }: { page: Page; onNavigate: (page: Page) => void; children: ReactNode }) {
  return <div className="app-shell">
    <a href="#main" className="skip-link">Pular para o conteúdo</a>
    <aside className="sidebar flex flex-col">
      <div className="brand" role="img" aria-label="WR Lava Rápido — Estética Automotiva"><img src="/brand-reference.png" alt="" /></div>
      <nav aria-label="Navegação principal" className="flex flex-col gap-2">
        {(Object.keys(pages) as Page[]).map(key => {
          const { label, path } = pages[key];
          const Icon = icons[key];
          return <a key={key} href={path} onClick={event => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            onNavigate(key);
          }} className={`nav-link flex items-center gap-2.5 ${page === key ? 'active' : ''}`} aria-current={page === key ? 'page' : undefined}><Icon size={17}/>{label}</a>;
        })}
      </nav>
      <div className="shift mt-auto"><strong>Turno aberto</strong><p>Desde 08:00 · Operador Paulo</p></div>
    </aside>
    <main id="main" className={`main ${page === 'cash' ? 'cash-page' : ''}`}><div className="content">{children}</div></main>
  </div>;
}
export function PageHeading({ section, title, children }: { section: string; title: string; children: ReactNode }) {
  return <header className="page-heading"><p className="eyebrow">{section}</p><h1>{title}</h1><p className="subtitle">{children}</p></header>;
}
export function Notice({ message, error, onClose }: { message: string; error?: boolean; onClose: () => void }) {
  return <div role={error ? 'alert' : 'status'} className={`notice flex items-center justify-between gap-4 ${error ? 'error' : ''}`}><span>{message}</span><button type="button" aria-label="Fechar mensagem" onClick={onClose}><X size={18}/></button></div>;
}
