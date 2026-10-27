// "Now playing" lookups for Icecast, SHOUTcast v1/v2 and custom JSON endpoints.
// Every reader resolves to a track ({ artist, title, text, art, station? }) or throws.
// All of these are cross-origin requests, so they only work when the server sends
// Access-Control-Allow-Origin (Icecast 2.4+ does by default; SHOUTcast usually doesn't).
import { fetchText, track } from './util.js';

async function get(url, as = 'json') {
  const text = await fetchText(url);
  return as === 'json' ? JSON.parse(text) : text;
}

// Icecast /status-json.xsl. With several mounts, pick the one matching the stream URL.
export function parseIcestats(data, streamUrl) {
  const sources = [].concat((data && data.icestats && data.icestats.source) || []);
  const path = streamUrl ? new URL(streamUrl).pathname : '';
  const pathOf = (s) => {
    try {
      return new URL(s.listenurl).pathname;
    } catch (e) {
      return '';
    }
  };
  const src = sources.find((s) => path && pathOf(s) === path) || (sources.length === 1 && sources[0]);
  if (!src) throw new Error('Icecast mount not found in status-json.xsl');
  return { ...track(src.artist, src.title || src.yp_currently_playing), station: src.server_name || '' };
}

async function icecast(stream) {
  const u = new URL(stream);
  // Behind a reverse proxy the stats page often lives next to the mount, e.g. /radio/status-json.xsl.
  const dir = u.pathname.replace(/\/[^/]*$/, '');
  const urls = [...(dir ? [`${u.origin}${dir}/status-json.xsl`] : []), `${u.origin}/status-json.xsl`];
  let err;
  for (const url of urls) {
    try {
      return parseIcestats(await get(url), stream);
    } catch (e) {
      err = e;
    }
  }
  throw err;
}

const sid = (stream) => {
  const u = new URL(stream);
  const m = u.pathname.match(/\/stream\/(\d+)/);
  return u.searchParams.get('sid') || (m && m[1]) || '1';
};

async function shoutcast2(stream) {
  const u = new URL(stream);
  const d = await get(`${u.origin}/stats?sid=${sid(stream)}&json=1`);
  if (!d || typeof d.songtitle !== 'string') throw new Error('Not SHOUTcast v2 stats');
  return { ...track('', d.songtitle), station: d.servertitle || '' };
}

async function shoutcast2Text(stream) {
  const u = new URL(stream);
  const text = await get(`${u.origin}/currentsong?sid=${sid(stream)}`, 'text');
  if (/<html/i.test(text)) throw new Error('Not SHOUTcast v2 currentsong');
  return track('', text);
}

// SHOUTcast v1 /7.html: "listeners,status,peak,max,unique,bitrate,song title (may contain commas)".
export function parse7html(html) {
  const parts = html.replace(/<[^>]*>/g, '').trim().split(',');
  if (parts.length < 7 || !/^\d+$/.test(parts[0])) throw new Error('Not SHOUTcast v1 7.html');
  return track('', parts.slice(6).join(','));
}

async function shoutcast1(stream) {
  return parse7html(await get(`${new URL(stream).origin}/7.html`, 'text'));
}

const AUTO = { icecast, shoutcast2, shoutcast2Text, shoutcast1 };

// Custom endpoints: accept the common shapes (AzuraCast, Radio.co, Icecast, flat
// { artist, title }, { song }, or plain "Artist - Title" text).
export function parseCustom(d) {
  if (Array.isArray(d)) d = d[0];
  if (d == null) throw new Error('Empty metadata response');
  if (typeof d === 'string') return track('', d);
  if (d.icestats) return parseIcestats(d);
  const np = d.now_playing;
  if (np && typeof np === 'object') {
    const s = np.song || np;
    return track(s.artist, s.title || s.text, s.art || s.artwork);
  }
  if (d.current_track) return track('', d.current_track.title, d.current_track.artwork_url_large);
  const s = d.song || d.now_playing || d.nowplaying || d.current || d.track || d.songtitle || d.title;
  const art = d.art || d.artwork || d.image || d.cover || '';
  if (s && typeof s === 'object') return track(s.artist, s.title, s.art || s.artwork || art);
  if (d.artist || s) return track(d.artist, d.artist ? d.title : s, art);
  throw new Error('Unrecognised metadata JSON');
}

async function custom(url) {
  const text = await fetchText(url);
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }
  return parseCustom(data);
}

// Remembers which reader worked so later polls make one request, not four.
export class MetadataSource {
  constructor(stream, mode) {
    this.stream = stream;
    this.mode = mode;
    this.reader = null;
  }

  async fetch() {
    if (this.mode !== 'auto') return custom(new URL(this.mode, location.href).href);
    if (this.reader) return AUTO[this.reader](this.stream);
    // Try every server type at once; the first success in priority order wins.
    const names = Object.keys(AUTO);
    const results = await Promise.allSettled(names.map((n) => AUTO[n](this.stream)));
    const i = results.findIndex((r) => r.status === 'fulfilled');
    if (i < 0) throw new Error('No metadata endpoint found (or the server does not send CORS headers)');
    this.reader = names[i];
    return results[i].value;
  }
}
