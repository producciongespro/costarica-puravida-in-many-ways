/**
 * Resolves any asset relative path from src/data/*.json
 * (e.g. "sprites/fondo.png", "audio/Tema del juego.m4a", "/assets/sprites/...")
 * into a properly URL-encoded path under "./assets/..."
 */
export function assetUrl(rawPath) {
  if (!rawPath) return '';
  let clean = String(rawPath).trim().replace(/^\/+/, '');
  if (clean.startsWith('assets/')) {
    clean = clean.slice('assets/'.length);
  }
  const segments = clean.split('/').map((seg) => encodeURIComponent(seg));
  const base = import.meta.env.BASE_URL || './';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}assets/${segments.join('/')}`;
}
