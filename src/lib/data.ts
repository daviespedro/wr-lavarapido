import type { Database } from './types';
export const services = [
  { id: 'lavagem', name: 'Lavagem Completa' },
  { id: 'lavagem-simples', name: 'Lavagem Simples' },
  { id: 'polimento', name: 'Polimento Técnico' },
  { id: 'higienizacao', name: 'Higienização Interna' },
  { id: 'vitrificacao', name: 'Vitrificação' },
  { id: 'outros', name: 'Outros' },
];
export function createEmptyDatabase(): Database {
  return { version: 2, clients: [], vehicles: [], transactions: [] };
}
