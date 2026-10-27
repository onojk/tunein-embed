/*! tunein-embed | MIT License | (c) 2026 Jonathan Kendall | github.com/onojk/tunein-embed */
import { RadioPlayer } from './player.js';

if (!customElements.get('radio-player')) {
  customElements.define('radio-player', RadioPlayer);
}
