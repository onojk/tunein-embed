// Canvas visualizer drawn behind the player. Uses a Web Audio AnalyserNode when the
// stream is CORS-enabled; otherwise (or before playback) it animates synthetic
// "idle" energy so it never depends on, or interferes with, the audio itself.
import { reducedMotion } from './util.js';

const BANDS = 5; // flowing lines
const BARS = 48;

export class Visualizer {
  constructor(canvas, host) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.host = host;
    this.mode = 'lines';
    this.playing = false;
    this.analyser = null;
    this.visible = true;
    this.level = new Float32Array(BARS); // smoothed energies 0..1
    this._n = 0;
    this._frame = this._frame.bind(this);
    this.resize();
    if (window.IntersectionObserver) {
      this._io = new IntersectionObserver(([e]) => {
        this.visible = e.isIntersecting;
        this._kick();
      });
      this._io.observe(canvas);
    }
    this._onVis = () => this._kick(true);
    document.addEventListener('visibilitychange', this._onVis);
    // theme="auto" changes colours with the OS setting.
    this._mq = window.matchMedia && matchMedia('(prefers-color-scheme: light)');
    if (this._mq && this._mq.addEventListener) this._mq.addEventListener('change', this._onVis);
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    if (this._io) this._io.disconnect();
    document.removeEventListener('visibilitychange', this._onVis);
    if (this._mq && this._mq.removeEventListener) this._mq.removeEventListener('change', this._onVis);
    this.detach();
    if (this.audioCtx) this.audioCtx.close();
  }

  setMode(mode) {
    this.mode = mode;
    this.canvas.hidden = mode === 'off';
    this._kick(true);
  }

  setPlaying(playing) {
    this.playing = playing;
    if (playing && this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();
    this._kick(true);
  }

  // Route an <audio> element through an AnalyserNode. Only call this for elements
  // with crossOrigin set AND a server that sends CORS headers: otherwise the
  // browser feeds the graph silence and the stream goes quiet.
  attach(audio) {
    if (this.source && this.source.mediaElement === audio) return true;
    this.detach();
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      this.audioCtx = this.audioCtx || new AC();
      this.audioCtx.resume(); // we're inside the click handler, so this is allowed
      this.source = this.audioCtx.createMediaElementSource(audio);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.75;
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);
      this.freq = new Uint8Array(this.analyser.frequencyBinCount);
      this.wave = new Uint8Array(this.analyser.fftSize);
      return true;
    } catch (e) {
      this.detach();
      return false;
    }
  }

  detach() {
    if (this.source) this.source.disconnect();
    if (this.analyser) this.analyser.disconnect();
    this.source = this.analyser = null;
  }

  // True when the analyser sees pure digital silence (all samples at the midpoint).
  isSilent() {
    if (!this.analyser) return false;
    this.analyser.getByteTimeDomainData(this.wave);
    return this.wave.every((v) => v === 128);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { clientWidth: w, clientHeight: h } = this.canvas;
    if (!w || !h) return;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w;
    this.h = h;
    this._readColor();
    this._kick(true);
  }

  _readColor() {
    const cs = getComputedStyle(this.host);
    this.color = cs.getPropertyValue('--_accent').trim() || '#ff4f6d';
  }

  // Start the animation loop if it should run, or draw a single still frame.
  _kick(redraw) {
    const animate = this.mode !== 'off' && this.playing && this.visible && !document.hidden && !reducedMotion();
    if (animate && !this._raf) this._raf = requestAnimationFrame(this._frame);
    else if (!animate && (redraw || this._raf)) {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
      this._draw(performance.now() / 1000, false);
    }
  }

  _frame(now) {
    if (++this._n % 60 === 0) this._readColor(); // pick up live --rp-accent changes
    this._raf = 0;
    this._draw(now / 1000, true);
    this._kick();
  }

  // Fill this.level with target energies, from the analyser or a synthetic pattern.
  _sample(t, animated) {
    const n = this.mode === 'bars' ? BARS : BANDS;
    const live = this.analyser && this.playing;
    if (live) this.analyser.getByteFrequencyData(this.freq);
    let sum = 0;
    for (let i = 0; i < n; i++) {
      let target;
      if (live) {
        // Log-spaced bins so bass doesn't swallow everything; the top quarter is mostly empty.
        const bins = this.freq.length * 0.75;
        const a = Math.floor(Math.pow(bins, i / n));
        const b = Math.max(a + 1, Math.floor(Math.pow(bins, (i + 1) / n)));
        let s = 0;
        for (let k = a; k < b; k++) s += this.freq[k];
        target = s / (b - a) / 255;
      } else if (this.playing && animated) {
        target = 0.35 + 0.22 * Math.sin(t * 1.3 + i * 1.9) + 0.13 * Math.sin(t * 3.1 + i * 0.7);
      } else {
        target = 0.12 + 0.06 * Math.sin(i * 1.7);
      }
      this.level[i] += (target - this.level[i]) * (animated ? 0.18 : 1);
      sum += this.level[i];
    }
    return sum / n;
  }

  _draw(t, animated) {
    const { ctx, w, h } = this;
    if (!w) return;
    ctx.clearRect(0, 0, w, h);
    if (this.mode === 'off') return;
    if (!animated) this._readColor();
    const avg = this._sample(t, animated);
    this.host.ui.rp.style.setProperty('--lvl', this.playing ? avg.toFixed(3) : 0);
    ctx.strokeStyle = ctx.fillStyle = this.color;
    if (this.mode === 'bars') this._bars(h);
    else this._lines(t, w, h);
    ctx.globalAlpha = 1;
  }

  // Overlapping sine "ribbons"; each band's energy drives its amplitude and brightness.
  _lines(t, w, h) {
    const { ctx } = this;
    const seg = Math.max(12, Math.round(w / 24));
    for (let i = 0; i < BANDS; i++) {
      const e = this.level[i];
      const amp = h * (0.06 + 0.3 * e);
      const base = h * (0.55 + (i - (BANDS - 1) / 2) * 0.05);
      const f1 = 1.1 + i * 0.37;
      const sp = 0.35 + i * 0.13;
      const pts = [];
      for (let k = 0; k <= seg; k++) {
        const x = (k / seg) * w;
        const u = k / seg;
        const env = Math.sin(Math.PI * (0.15 + u * 0.85)); // calmer at the right edge
        const y =
          base +
          amp * env * (0.7 * Math.sin(u * Math.PI * 2 * f1 + t * sp * 2 + i) + 0.3 * Math.sin(u * Math.PI * 7 - t * 1.7 + i * 2));
        pts.push(x, y);
      }
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      for (let k = 2; k < pts.length - 2; k += 2) {
        ctx.quadraticCurveTo(pts[k], pts[k + 1], (pts[k] + pts[k + 2]) / 2, (pts[k + 1] + pts[k + 3]) / 2);
      }
      ctx.lineTo(pts[pts.length - 2], pts[pts.length - 1]);
      ctx.globalAlpha = 0.12 + 0.45 * e;
      ctx.lineWidth = 1 + e * 2.5;
      ctx.stroke();
    }
  }

  _bars(h) {
    const { ctx, w } = this;
    const bw = w / BARS;
    for (let i = 0; i < BARS; i++) {
      const e = this.level[i];
      const bh = Math.max(2, e * h * 0.7);
      ctx.globalAlpha = 0.1 + 0.3 * e;
      ctx.fillRect(i * bw + bw * 0.2, h - bh, bw * 0.6, bh);
    }
  }
}
