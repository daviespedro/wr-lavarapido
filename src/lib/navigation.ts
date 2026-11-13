export const pages = {
  reception: { label: 'Recepção', path: '/' },
  clients: { label: 'Clientes', path: '/clientes' },
  cash: { label: 'Caixa', path: '/caixa' },
} as const;

export type Page = keyof typeof pages;

export function pageFromPath(path: string): Page {
  const normalized = path.replace(/\/$/, '') || '/';
  return (Object.keys(pages) as Page[]).find(page => pages[page].path === normalized) ?? 'reception';
}
