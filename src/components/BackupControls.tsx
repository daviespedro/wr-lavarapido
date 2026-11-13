import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { parseBackup, restoreBackup } from '../lib/store';
import { downloadBackup } from '../lib/backup';
import { Notice } from './Layout';

export function BackupControls() {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ message: string; error?: boolean } | null>(null);
  function download() {
    try {
      downloadBackup();
      setNotice({ message: 'Download do backup iniciado. Guarde o arquivo em um local seguro.' });
    } catch (error) { setNotice({ message: (error as Error).message, error: true }); }
  }
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      let value: unknown;
      try { value = JSON.parse(await file.text()); }
      catch { throw new Error('Não foi possível ler o arquivo. Selecione um backup JSON válido.'); }
      let entries;
      try { entries = parseBackup(value); }
      catch { throw new Error('Backup incompatível ou inválido. Use um arquivo exportado por esta versão do sistema. Seus dados atuais foram preservados.'); }
      if (!window.confirm('O backup substituirá todos os dados atuais desta origem, inclusive registros mais recentes. Deseja restaurar?')) return;
      restoreBackup(entries);
      setNotice({ message: 'Backup restaurado. Os dados já estão disponíveis no sistema.' });
    } catch (error) { setNotice({ message: (error as Error).message, error: true }); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  }
  return <section className="backup-footer no-print" aria-labelledby="backup-title">
    <h2 id="backup-title">Configurações / Segurança</h2>
    {notice && <Notice {...notice} onClose={() => setNotice(null)}/>}
    <div className="backup-bar"><p>Seus dados ficam neste navegador. Faça backups regularmente.</p><div className="backup-actions">
      <button className="secondary" type="button" onClick={download} disabled={busy}><Download size={16}/> Exportar Backup</button>
      <button className="secondary" type="button" onClick={() => input.current?.click()} disabled={busy}><Upload size={16}/> {busy ? 'Importando…' : 'Importar Backup'}</button>
      <input ref={input} className="hidden" type="file" accept=".json,application/json" aria-label="Arquivo de backup" onChange={event => { void upload(event.target.files?.[0]); }}/>
    </div></div>
  </section>;
}
