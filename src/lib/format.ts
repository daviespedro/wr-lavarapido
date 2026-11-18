export const digits = (value: string) => value.replace(/\D/g, '');
export function phoneLabel(value: string) {
  const n = digits(value).slice(0, 11);
  if (n.length <= 2) return n ? `(${n}` : '';
  const split = n.length > 10 ? 7 : 6;
  return `(${n.slice(0, 2)}) ${n.slice(2, split)}${n.length > split ? '-' + n.slice(split) : ''}`;
}
export const numberLabel = (cents: number) => (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const currency = (cents: number) => `R$ ${numberLabel(cents)}`;
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export const dateLabel = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
export function parseMoney(value: string): number {
  const normalized = value.replace(/R\$|\s/g, '');
  if (!/^\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?$|^\d+(?:[,.]\d{1,2})?$/.test(normalized)) return NaN;
  const grouped = /^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(normalized);
  const numeric = normalized.includes(',') || grouped ? normalized.replace(/\./g, '').replace(',', '.') : normalized;
  return Math.round(Number(numeric) * 100);
}

export function normalizePlate(value: string) {
  const plate = value.replace(/[^a-z0-9]/gi, '').toUpperCase();
  return plate === 'SEMPLACA' ? '' : plate;
}
