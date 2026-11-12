import type { Database } from './types';
export const services = [
  { id: 'lavagem', name: 'Lavagem Completa' },
  { id: 'polimento', name: 'Polimento Técnico' },
  { id: 'higienizacao', name: 'Higienização Interna' },
  { id: 'vitrificacao', name: 'Vitrificação' },
];
export function createEmptyDatabase(): Database {
  return { version: 2, clients: [], vehicles: [], transactions: [] };
}
