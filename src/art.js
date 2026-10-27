// Album art lookup via the iTunes Search API (art="itunes"). Uses fetch, falling
// back to JSONP for environments where the CORS request is refused.
const cache = new Map();
let jsonpId = 0;

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cb = `__tuneinEmbedArt${++jsonpId}`;
    const s = document.createElement('script');
    const done = (fn, v) => {
      clearTimeout(timer);
      delete window[cb];
      s.remove();
      fn(v);
    };
    const timer = setTimeout(() => done(reject, new Error('JSONP timeout')), 8000);
    window[cb] = (data) => done(resolve, data);
    s.onerror = () => done(reject, new Error('JSONP failed'));
    s.src = `${url}&callback=${cb}`;
    document.head.appendChild(s);
  });
}

// Strip "(Radio Edit)", "[Live]", "feat. X" etc. so the search matches the album version.
const clean = (s) => s.replace(/\s*[([].*?[)\]]/g, '').replace(/\s+(feat\.?|ft\.?|featuring)\s.*$/i, '').trim();

export async function lookupArt(t) {
  if (!t || !t.artist || !t.title) return '';
  const term = `${clean(t.artist)} ${clean(t.title)}`.toLowerCase();
  if (cache.has(term)) return cache.get(term);
  const url = `https://itunes.apple.com/search?media=music&entity=song&limit=1&term=${encodeURIComponent(term)}`;
  let data;
  try {
    const res = await fetch(url, { credentials: 'omit' });
    data = await res.json();
  } catch (e) {
    try {
      data = await jsonp(url);
    } catch (e2) {
      data = null;
    }
  }
  const hit = data && data.results && data.results[0];
  const art = hit && hit.artworkUrl100 ? hit.artworkUrl100.replace(/100x100(bb)?/, '600x600bb') : '';
  if (data) cache.set(term, art); // don't cache network failures
  return art;
}
