import { css } from './styles.js';
import { isIOS, storage, reducedMotion, fetchWithTimeout } from './util.js';
import { MetadataSource } from './metadata.js';
import { lookupArt } from './art.js';
import { Visualizer } from './visualizer.js';

const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const ICON = {
  play: svg('M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z'),
  pause: svg('M7 5h3.5v14H7zM13.5 5H17v14h-3.5z'),
  vol: svg('M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z'),
  mute: svg('M4 9v6h4l5 4V5L8 9H4zm12.6 3 2.7-2.7-1.4-1.4-2.7 2.7-2.7-2.7-1.4 1.4 2.7 2.7-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.4z'),
};

const TEMPLATE = `
<div class="rp" part="player" data-state="idle">
  <canvas class="viz" aria-hidden="true"></canvas>
  <div class="main">
    <div class="art-wrap" part="art">
      <div class="art-fallback" aria-hidden="true"></div>
      <img class="art" alt="" hidden>
    </div>
    <div class="body">
      <div class="top"><span class="badge" part="badge"><i></i><b>LIVE</b></span><span class="station" part="station"></span></div>
      <div class="marquee" part="now-playing" aria-live="polite"><div class="track"><span></span><span aria-hidden="true"></span></div></div>
      <div class="controls">
        <button class="play" part="play-button" type="button" aria-label="Play">${ICON.play}</button>
        <button class="mute" type="button" aria-label="Mute">${ICON.vol}</button>
        <input class="vol" part="volume" type="range" min="0" max="1" step="0.01" aria-label="Volume">
      </div>
      <div class="msg" part="message" role="status" hidden></div>
    </div>
  </div>
  <details class="history" part="history" hidden><summary>Recently played</summary><ol></ol></details>
</div>`;

const BADGE = { idle: 'LIVE', loading: 'CONNECTING', playing: 'LIVE', reconnecting: 'RECONNECTING', error: 'OFFLINE' };
const STALL_MS = 15000; // no playback progress for this long => reconnect
const GIVE_UP_AFTER = 5; // failed attempts before first successful play => stop and show error
const HISTORY_SIZE = 10;

let activePlayer = null; // only one <radio-player> plays at a time per page

// Does the stream server send CORS headers? Decides whether Web Audio is safe to use.
// fetch() resolves as soon as headers arrive; we then cancel the endless body.
const corsCache = new Map();
function probeCors(url) {
  if (new URL(url).origin === location.origin) return Promise.resolve(true);
  if (!corsCache.has(url)) {
    corsCache.set(
      url,
      fetchWithTimeout(url, 6000, { mode: 'cors' }).then(
        (r) => (r.body && r.body.cancel().catch(() => {}), r.ok),
        () => false
      )
    );
  }
  return corsCache.get(url);
}

export class RadioPlayer extends HTMLElement {
  static get observedAttributes() {
    return ['src', 'title', 'volume', 'meta', 'poll', 'art', 'logo', 'history', 'visualizer', 'cors', 'theme'];
  }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${css}</style>${TEMPLATE}`;
    const q = (s) => root.querySelector(s);
    this.ui = {
      rp: q('.rp'), canvas: q('.viz'), artWrap: q('.art-wrap'), art: q('.art'), fallback: q('.art-fallback'),
      badge: q('.badge b'), station: q('.station'), marquee: q('.marquee'), track: q('.track'),
      spans: root.querySelectorAll('.track span'),
      play: q('.play'), mute: q('.mute'), vol: q('.vol'), msg: q('.msg'),
      history: q('.history'), historyList: q('.history ol'),
    };
    this.state = 'idle';
    this.wantPlay = false;
    this.retries = 0;
    this.everPlayed = false;
    this.audio = null;
    this.now = null; // current track { artist, title, text, art }
    this.history = []; // previous tracks, newest first: { ...track, time }

    const stored = parseFloat(storage('tunein-embed:volume'));
    this._volume = Number.isFinite(stored) ? stored : 0.8;
    this._muted = false;

    this._onAudio = this._onAudio.bind(this);
    this._onOnline = () => this.state === 'reconnecting' && this._retryNow();
    this.ui.play.addEventListener('click', () => this.toggle());
    this.ui.mute.addEventListener('click', () => this._setMuted(!this._muted));
    this.ui.vol.addEventListener('input', () => this._setVolume(parseFloat(this.ui.vol.value)));
    // iOS ignores audio.volume entirely (hardware buttons only), so hide the slider there.
    if (isIOS) this.ui.vol.hidden = true;
  }

  connectedCallback() {
    if (this.hasAttribute('volume') && storage('tunein-embed:volume') == null) {
      this._volume = Math.min(1, Math.max(0, parseFloat(this.getAttribute('volume')) || 0));
    }
    this.ui.vol.value = this._volume;
    this._renderStation();
    this._renderTrack();
    window.addEventListener('online', this._onOnline);
    if (window.ResizeObserver) {
      let lastW = 0;
      this._ro = new ResizeObserver(([entry]) => {
        const w = Math.round(entry.contentRect.width);
        if (w !== lastW) {
          lastW = w;
          this._fitMarquee();
          if (this.viz) this.viz.resize();
        }
      });
      this._ro.observe(this.ui.rp);
    }
    this._renderHistory();
    this._startMeta();
    this.viz = new Visualizer(this.ui.canvas, this);
    this._applyVisualizer();
  }

  disconnectedCallback() {
    this.pause();
    this._stopMeta();
    if (this.viz) this.viz.destroy();
    this.viz = this.audio = null; // a MediaElementSource is bound to its AudioContext forever
    window.removeEventListener('online', this._onOnline);
    if (this._ro) this._ro.disconnect();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal || !this.isConnected) return;
    if (name === 'title' || name === 'logo') {
      this._renderStation();
      this._renderTrack();
    } else if (name === 'src') {
      this.now = null;
      this.history = [];
      this._renderTrack();
      this._renderHistory();
      this._startMeta();
      this._applyVisualizer();
      if (this.wantPlay) {
        this.pause();
        this.play();
      }
    } else if (name === 'meta' || name === 'poll') {
      this._startMeta();
    } else if (name === 'visualizer' || name === 'cors') {
      this._applyVisualizer();
    } else if (name === 'theme') {
      if (this.viz) this.viz.resize(); // re-reads the accent colour
    } else if (name === 'history') {
      this._renderHistory();
    } else if (name === 'volume') {
      this._setVolume(parseFloat(newVal));
    }
  }

  // ---- public API --------------------------------------------------------

  get stationName() {
    return this.getAttribute('title') || this._metaStation || 'Live Radio';
  }

  // ---- metadata ----------------------------------------------------------

  _startMeta() {
    this._stopMeta();
    const mode = (this.getAttribute('meta') || 'auto').trim();
    const stream = this._streamUrl();
    if (mode === 'off' || !stream) return;
    this._meta = new MetadataSource(stream, mode);
    this._metaFails = 0;
    const secs = Math.max(5, parseFloat(this.getAttribute('poll')) || 15);
    this._metaTimer = setInterval(() => this._pollMeta(), secs * 1000);
    this._pollMeta();
  }

  _stopMeta() {
    clearInterval(this._metaTimer);
    this._metaTimer = this._meta = null;
  }

  async _pollMeta() {
    const source = this._meta;
    // While stopped, only poll when the page is visible (keeps the lock screen fresh while playing).
    if (!source || this._metaBusy || (document.hidden && !this.wantPlay)) return;
    this._metaBusy = true;
    try {
      const t = await source.fetch();
      if (source !== this._meta) return;
      this._metaFails = 0;
      if (t.station && t.station !== this._metaStation) {
        this._metaStation = t.station;
        this._renderStation();
      }
      this._setTrack(t);
    } catch (e) {
      // Give up quietly after repeated failures (usually missing CORS headers); the
      // station name stays as the now-playing text. A new play() retries.
      if (++this._metaFails >= 3 && source === this._meta) {
        clearInterval(this._metaTimer);
        this._metaTimer = null;
        console.info('[radio-player] now-playing metadata unavailable:', e.message);
      }
    } finally {
      this._metaBusy = false;
    }
  }

  _setTrack(t) {
    if (!t.text || t.text === this.stationName) t = null;
    if ((t && t.text) === (this.now && this.now.text)) return;
    if (this.now) {
      this.history.unshift({ ...this.now, time: new Date() });
      this.history.length = Math.min(this.history.length, HISTORY_SIZE);
      this._renderHistory();
    }
    this.now = t;
    this._renderTrack();
    this._renderArt();
    this._updateMediaMetadata();
    if (t && !t.art && this.getAttribute('art') === 'itunes') {
      lookupArt(t).then((art) => {
        if (art && this.now === t) {
          t.art = art;
          this._renderArt();
          this._updateMediaMetadata();
        }
      });
    }
    this.dispatchEvent(new CustomEvent('rp-track', { detail: t, bubbles: true, composed: true }));
  }

  _renderHistory() {
    const mode = this.getAttribute('history') || 'off';
    const { history, historyList } = this.ui;
    history.hidden = mode === 'off' || !this.history.length;
    if (mode === 'open' && !this._historyOpened) history.open = this._historyOpened = true;
    historyList.textContent = '';
    for (const t of this.history) {
      const li = document.createElement('li');
      const time = document.createElement('time');
      time.textContent = t.time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const text = document.createElement('span');
      text.textContent = t.text;
      li.append(time, text);
      historyList.appendChild(li);
    }
  }

  get playing() {
    return this.wantPlay;
  }

  toggle() {
    this.wantPlay ? this.pause() : this.play();
  }

  // Must run synchronously inside the click handler: iOS only lets audio start
  // from within a user gesture, so nothing here may await before audio.play().
  play() {
    const url = this._streamUrl();
    if (!url) return this._fail('No stream URL set (add a src="..." attribute).');
    if (activePlayer && activePlayer !== this) activePlayer.pause();
    activePlayer = this;
    this.wantPlay = true;
    this.retries = 0;
    this.everPlayed = false;
    this._setMsg('');
    const cors = !!this.viz && this._useWebAudio();
    if (!this.audio || this.audio.crossOrigin !== (cors ? 'anonymous' : null)) this._createAudio(cors);
    if (cors && !this.viz.attach(this.audio)) this._createAudio(false);
    this._load(url);
    this._setupMediaSession();
    if (this._meta && !this._metaTimer) this._startMeta(); // metadata gave up earlier: try again
    this._watchdog = this._watchdog || setInterval(() => this._tick(), 2000);
  }

  pause() {
    this.wantPlay = false;
    clearTimeout(this._retryTimer);
    clearInterval(this._watchdog);
    this._retryTimer = this._watchdog = null;
    const a = this.audio;
    if (a) {
      a.pause();
      // Drop the connection: a live stream resumed from a buffer would be stale,
      // and an idle open connection still counts as a listener on the server.
      a.removeAttribute('src');
      a.load();
    }
    if (activePlayer === this) activePlayer = null;
    if (this.state !== 'error') this._setState('idle');
    this._setPlaybackState('paused');
  }

  // ---- audio -------------------------------------------------------------

  _streamUrl() {
    const src = (this.getAttribute('src') || '').trim();
    if (!src) return '';
    let url;
    try {
      url = new URL(src, location.href);
    } catch (e) {
      return '';
    }
    // An https page can't load http:// media ("mixed content"). Try the https
    // version of the same URL; if that fails we explain the problem in _onError.
    this._mixed = location.protocol === 'https:' && url.protocol === 'http:';
    if (this._mixed) url.protocol = 'https:';
    return url.href;
  }

  _createAudio(cors) {
    if (this.audio) {
      this.audio.removeAttribute('src');
      this.audio.load();
    }
    const a = new Audio();
    a.preload = 'none';
    if (cors) a.crossOrigin = 'anonymous';
    a.volume = this._volume;
    a.muted = this._muted;
    for (const ev of ['playing', 'waiting', 'pause', 'ended', 'error']) a.addEventListener(ev, this._onAudio);
    this.audio = a;
  }

  _load(url) {
    const a = this.audio;
    this._setState(this.retries ? 'reconnecting' : 'loading');
    this._lastTime = -1;
    this._lastProgress = Date.now();
    this._reloading = true;
    a.src = url;
    const p = a.play();
    if (p && p.catch) {
      p.catch((err) => {
        // Autoplay policy refusal: the user has to press play themselves.
        if (err && err.name === 'NotAllowedError') {
          this.pause();
          this._setMsg('Tap play to start listening.');
        }
        // Other failures (network, format) also fire an "error" event; handled there.
      });
    }
  }

  _onAudio(e) {
    const a = this.audio;
    if (!a || e.target !== a) return;
    switch (e.type) {
      case 'playing':
        this._reloading = false;
        if (!this.wantPlay) return;
        this.everPlayed = true;
        this._playingSince = Date.now();
        this._setMsg('');
        this._setState('playing');
        this._setPlaybackState('playing');
        break;
      case 'waiting':
        if (this.wantPlay && this.state === 'playing') this._setState('loading');
        break;
      case 'pause':
        // Paused from outside (OS media keys, headphones unplugged, another tab).
        // Ignore pauses we cause ourselves while (re)loading or that mean the stream ended.
        if (this.wantPlay && !this._reloading && !a.ended && !a.error) this.pause();
        break;
      case 'ended': // a live stream "ending" means the source dropped
      case 'error':
        if (this.wantPlay) this._onError(e.type);
        break;
    }
  }

  _onError(reason) {
    this._reloading = false;
    // A crossOrigin request failed (server has no CORS after all): play without Web Audio.
    if (this.audio.crossOrigin && !this.everPlayed) return this._dropWebAudio();
    if (!this.everPlayed && this._mixed) {
      return this._fail(
        'This page is served over HTTPS but the stream URL is http://, so the browser blocks it. ' +
          'Use an https:// stream URL (see the README section "Mixed content").'
      );
    }
    if (!this.everPlayed && this.retries >= GIVE_UP_AFTER) {
      return this._fail('Could not connect to the stream. It may be offline or the URL may be wrong.');
    }
    this._scheduleRetry(reason);
  }

  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, then every 30s.
  _scheduleRetry() {
    if (!this.wantPlay || this._retryTimer) return;
    const delay = Math.min(30000, 1000 * 2 ** this.retries);
    this.retries++;
    this._setState('reconnecting');
    this._setMsg(`Stream interrupted. Reconnecting in ${Math.round(delay / 1000)}s…`);
    this._retryTimer = setTimeout(() => this._retryNow(), delay);
  }

  _retryNow() {
    clearTimeout(this._retryTimer);
    this._retryTimer = null;
    if (this.wantPlay) this._load(this._streamUrl());
  }

  // Runs every 2s while playing: detects silent stalls that fire no event.
  _tick() {
    const a = this.audio;
    if (!this.wantPlay || !a || this._retryTimer) return;
    const now = Date.now();
    if (a.currentTime !== this._lastTime) {
      this._lastTime = a.currentTime;
      this._lastProgress = now;
      if (this.state !== 'playing' && !a.paused && this._lastTime > 0) this._setState('playing');
      // Healthy for a while: reset the backoff.
      if (this.retries && now - this._playingSince > 30000) this.retries = 0;
      // Time is moving but the analyser hears pure silence for 6s+: the browser is
      // muting a non-CORS response. Never let the visualizer cost us the audio.
      if (this.viz && this.viz.analyser && now - this._playingSince < 30000) {
        this._silentTicks = this.viz.isSilent() ? (this._silentTicks || 0) + 1 : 0;
        if (this._silentTicks >= 3) this._dropWebAudio();
      }
    } else if (now - this._lastProgress > STALL_MS) {
      this._scheduleRetry('stalled');
    }
  }

  _dropWebAudio() {
    console.info('[radio-player] stream has no usable CORS headers; playing without the audio-reactive visualizer');
    this._corsOk = false;
    this._silentTicks = 0;
    this.viz.detach();
    this._createAudio(false);
    this._load(this._streamUrl());
  }

  // ---- visualizer --------------------------------------------------------

  _vizMode() {
    const v = (this.getAttribute('visualizer') || 'lines').toLowerCase();
    return v === 'off' || v === 'bars' ? v : 'lines';
  }

  // Web Audio only when it's safe and useful. Never on iOS: Safari suspends the
  // AudioContext when the screen locks, which would stop background playback.
  _wantsWebAudio() {
    return (
      this._vizMode() !== 'off' &&
      this.getAttribute('cors') !== 'off' &&
      !isIOS &&
      !reducedMotion() &&
      !!(window.AudioContext || window.webkitAudioContext)
    );
  }

  _useWebAudio() {
    return this._wantsWebAudio() && (this.getAttribute('cors') === 'on' || this._corsOk === true);
  }

  _applyVisualizer() {
    if (!this.viz) return;
    this.viz.setMode(this._vizMode());
    this._corsOk = undefined;
    const url = this._streamUrl();
    if (url && this._wantsWebAudio() && this.getAttribute('cors') !== 'on') {
      // Probe ahead of time: play() must not await anything (iOS gesture rules).
      probeCors(url).then((ok) => {
        if (url === this._streamUrl()) this._corsOk = ok;
      });
    }
  }

  _fail(message) {
    this.pause();
    this._setState('error');
    this._setMsg(message);
    this.dispatchEvent(new CustomEvent('rp-error', { detail: { message }, bubbles: true, composed: true }));
  }

  _setVolume(v) {
    if (!Number.isFinite(v)) return;
    this._volume = Math.min(1, Math.max(0, v));
    this.ui.vol.value = this._volume;
    if (this.audio) this.audio.volume = this._volume;
    storage('tunein-embed:volume', String(this._volume));
    if (this._volume > 0 && this._muted) this._setMuted(false);
  }

  _setMuted(m) {
    this._muted = m;
    if (this.audio) this.audio.muted = m;
    this.ui.mute.innerHTML = m ? ICON.mute : ICON.vol;
    this.ui.mute.setAttribute('aria-label', m ? 'Unmute' : 'Mute');
  }

  // ---- media session (lock screen / notification controls) ---------------

  _setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    const handlers = { play: () => this.play(), pause: () => this.pause(), stop: () => this.pause() };
    for (const action in handlers) {
      try {
        ms.setActionHandler(action, handlers[action]);
      } catch (e) {
        // Action not supported by this browser.
      }
    }
    this._updateMediaMetadata();
  }

  _updateMediaMetadata() {
    if (!('mediaSession' in navigator) || activePlayer !== this || typeof MediaMetadata === 'undefined') return;
    const t = this.now;
    const art = (t && t.art) || this._logo();
    navigator.mediaSession.metadata = new MediaMetadata({
      title: (t && t.title) || this.stationName,
      artist: (t && t.artist) || (t ? this.stationName : ''),
      album: this.stationName,
      artwork: art ? [{ src: new URL(art, location.href).href, sizes: '512x512' }] : [],
    });
  }

  _setPlaybackState(s) {
    if ('mediaSession' in navigator && (activePlayer === this || s === 'paused')) {
      navigator.mediaSession.playbackState = s;
    }
  }

  // ---- rendering ---------------------------------------------------------

  _logo() {
    return this.getAttribute('logo') || '';
  }

  _setState(state) {
    if (this.state === state) return;
    this.state = state;
    const { rp, play, badge, artWrap } = this.ui;
    rp.dataset.state = state;
    badge.textContent = BADGE[state];
    const active = state === 'playing' || state === 'loading' || state === 'reconnecting';
    play.innerHTML = active ? ICON.pause : ICON.play;
    play.setAttribute('aria-label', active ? 'Pause' : 'Play');
    play.toggleAttribute('data-loading', state === 'loading' || state === 'reconnecting');
    artWrap.classList.toggle('spin', state === 'playing');
    if (this.viz) this.viz.setPlaying(state === 'playing');
    this.dispatchEvent(new CustomEvent('rp-state', { detail: { state }, bubbles: true, composed: true }));
  }

  _setMsg(text) {
    this.ui.msg.textContent = text;
    this.ui.msg.hidden = !text;
  }

  _renderStation() {
    const name = this.stationName;
    this.ui.station.textContent = name;
    this.ui.fallback.textContent = name
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    this._renderArt();
  }

  _renderArt() {
    const trackArt = this.getAttribute('art') !== 'off' && this.now && this.now.art;
    const src = trackArt || this._logo();
    const img = this.ui.art;
    if (!src) {
      img.hidden = true;
      img.removeAttribute('src');
      return;
    }
    if (img.getAttribute('src') === src) return;
    img.onload = () => (img.hidden = false);
    img.onerror = () => (img.hidden = true);
    img.src = src;
  }

  _renderTrack() {
    const text = (this.now && this.now.text) || this.stationName;
    this.ui.rp.classList.toggle('no-track', !this.now);
    const { marquee, spans } = this.ui;
    if (spans[0].textContent === text) return;
    spans[0].textContent = spans[1].textContent = text;
    marquee.title = text;
    this._fitMarquee();
  }

  // Scroll the now-playing text only when it doesn't fit.
  _fitMarquee() {
    const { marquee, track } = this.ui;
    marquee.classList.remove('scroll');
    const w = track.scrollWidth;
    if (w > marquee.clientWidth + 2) {
      marquee.style.setProperty('--dist', `${w + 48}px`);
      marquee.style.setProperty('--dur', `${Math.max(8, (w + 48) / 40)}s`);
      marquee.classList.add('scroll');
    }
  }
}
