import { exportDatabase } from './store';
import { localDate } from './format';
import type { Database } from './types';

export function downloadBackup(db: Database = exportDatabase()) {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  try {
    link.href = url;
    link.download = `wr-backup-${localDate()}-${Date.now()}.json`;
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
