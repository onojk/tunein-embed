// Strict CSP (no inline scripts/styles): styles must still apply and everything must work.
addEventListener('load', () => {
  const p = document.getElementById('p');
  setTimeout(() => p.play(), 1500);
  setTimeout(() => {
    const play = p.shadowRoot.querySelector('.play');
    fetch('/report', { method: 'POST', body: JSON.stringify({ test: 'csp', state: p.state,
      styled: getComputedStyle(play).borderRadius, analyser: !!p.viz.analyser, reader: p._meta && p._meta.reader }) });
  }, 7000);
});
