/** 598969 → "585.0 Ko", 3605337 → "3.4 Mo". */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${kilobytes.toFixed(1)} Ko`;
  return `${(kilobytes / 1024).toFixed(1)} Mo`;
}

/** "2026-09-24T09:44:48.000Z" → "24 sept. 2026". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
