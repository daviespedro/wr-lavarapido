import { MessageCircle } from 'lucide-react';
import { phoneLabel } from '../lib/format';
import { whatsappUrl } from '../lib/whatsapp';

export function WhatsAppLink({ phone }: { phone: string }) {
  return <a className="secondary whatsapp-link" href={whatsappUrl(phone)} target="_blank" rel="noopener noreferrer" aria-label={`Abrir WhatsApp para ${phoneLabel(phone)}`}><span>{phoneLabel(phone)}</span><MessageCircle size={18} aria-hidden="true"/><span>WhatsApp</span></a>;
}
