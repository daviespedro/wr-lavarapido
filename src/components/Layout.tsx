import { Car, Wallet, X } from 'lucide-react';
import type { ReactNode } from 'react';
export function Layout({ page, onNavigate, children }: { page: string; onNavigate: (page: 'reception' | 'cash') => void; children: ReactNode }) {
  return <div className="app-shell">
    <a href="#main" className="skip-link">Pular para o conteúdo</a>
    <aside className="sidebar flex flex-col">
      <div className="brand" role="img" aria-label="WR Lava Rápido — Estética Automotiva"><img src="/brand-reference.png" alt="" /></div>
      <nav aria-label="Navegação principal" className="flex flex-col gap-2">
        <a href="/" onClick={e => { e.preventDefault(); onNavigate('reception'); }} className={`nav-link flex items-center gap-2.5 ${page === 'reception' ? 'active' : ''}`} aria-current={page === 'reception' ? 'page' : undefined}><Car size={17}/>Recepção</a>
        <a href="/caixa" onClick={e => { e.preventDefault(); onNavigate('cash'); }} className={`nav-link flex items-center gap-2.5 ${page === 'cash' ? 'active' : ''}`} aria-current={page === 'cash' ? 'page' : undefined}><Wallet size={17}/>Caixa</a>
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
