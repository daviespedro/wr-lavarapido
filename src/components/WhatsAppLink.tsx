import { phoneLabel } from '../lib/format';
import { whatsappUrl } from '../lib/whatsapp';

export function WhatsAppLink({ phone }: { phone: string }) {
  return <a className="secondary whatsapp-link" href={whatsappUrl(phone)} target="_blank" rel="noopener noreferrer" aria-label={`Abrir WhatsApp para ${phoneLabel(phone)}`}>{phoneLabel(phone)}</a>;
}
