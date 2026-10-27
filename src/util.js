// Small shared helpers.

const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

// iPadOS 13+ reports itself as a Mac, so also check for touch support.
export const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);

export const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// "Artist - Title" -> { artist, title }. Leaves strings without a separator as the title.
export function splitTitle(raw) {
  const text = String(raw || '').replace(/\s+/g, ' ').trim();
  const i = text.indexOf(' - ');
  if (i > 0) return { artist: text.slice(0, i).trim(), title: text.slice(i + 3).trim(), text };
  return { artist: '', title: text, text };
}

export function track(artist, title, art) {
  artist = (artist || '').trim();
  title = (title || '').trim();
  if (!artist && title.includes(' - ')) return { ...splitTitle(title), art: art || '' };
  return { artist, title, text: artist && title ? `${artist} - ${title}` : artist || title, art: art || '' };
}

export function storage(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch (e) {
    // Private mode / blocked storage: preferences just won't persist.
  }
  return null;
}

// fetch() with a timeout, always without credentials so CORS "*" works.
export async function fetchWithTimeout(url, ms = 8000, init = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { cache: 'no-store', credentials: 'omit', ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}
