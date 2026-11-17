import type { Client } from './types';
import { digits } from './format';

export function whatsappUrl(phone: string, message?: string) {
  return `https://wa.me/55${digits(phone)}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

export function completionUrl(client: Client) {
  return whatsappUrl(client.phone, `Olá ${client.name}, o serviço no seu ${client.model}${client.plate ? ` (Placa: ${client.plate})` : ''} foi finalizado e já está pronto para retirada no WR Lava Rápido!`);
}
