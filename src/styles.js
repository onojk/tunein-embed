// Shadow DOM stylesheet. Public knobs are the --rp-* custom properties, which
// inherit through the shadow boundary; everything internal uses --_* copies.
export const css = `
:host{
  --_accent:var(--rp-accent,#ff4f6d);
  --_bg:var(--rp-bg,#14151c);
  --_fg:var(--rp-fg,#f3f3f7);
  --_font:var(--rp-font,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif);
  --_radius:var(--rp-radius,18px);
  --_art:96px;
  display:block;
  container-type:inline-size;
  min-width:260px;
  font-family:var(--_font);
  color:var(--_fg);
  line-height:1.3;
}
:host([theme=light]){--_accent:var(--rp-accent,#e3264b);--_bg:var(--rp-bg,#ffffff);--_fg:var(--rp-fg,#17181f)}
@media (prefers-color-scheme:light){
  :host([theme=auto]){--_accent:var(--rp-accent,#e3264b);--_bg:var(--rp-bg,#ffffff);--_fg:var(--rp-fg,#17181f)}
}
:host([hidden]){display:none}
*{box-sizing:border-box}
[hidden]{display:none!important}
.rp{position:relative;overflow:hidden;background:var(--_bg);border-radius:var(--_radius);
  border:1px solid rgba(127,127,127,.18)}
.viz{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.main{position:relative;display:flex;align-items:center;gap:16px;padding:16px}
.art-wrap{position:relative;flex:none;width:var(--_art);height:var(--_art);border-radius:50%;
  box-shadow:0 0 0 calc(2px + var(--lvl,0) * 7px) rgba(127,127,127,.18);transition:box-shadow .12s}
.art,.art-fallback{position:absolute;inset:0;width:100%;height:100%;border-radius:50%;object-fit:cover}
.art-fallback{display:grid;place-items:center;color:#fff;font-weight:700;font-size:calc(var(--_art) * .26);
  letter-spacing:.03em;background:repeating-radial-gradient(circle,rgba(255,255,255,.07) 0 1px,transparent 1px 4px),
  radial-gradient(circle at 30% 30%,var(--_accent),#24203a 78%)}
.spin .art,.spin .art-fallback{animation:rp-spin 24s linear infinite}
.body{position:relative;flex:1;min-width:0}
.top{display:flex;align-items:center;gap:8px;min-width:0}
.badge{flex:none;display:inline-flex;align-items:center;gap:6px;padding:3px 8px;border-radius:999px;
  font-size:10.5px;font-weight:700;letter-spacing:.09em;background:rgba(127,127,127,.18)}
.badge i{width:7px;height:7px;border-radius:50%;background:currentColor;opacity:.6}
[data-state=playing] .badge{background:var(--_accent);color:#fff}
[data-state=playing] .badge i{opacity:1;animation:rp-pulse 1.6s ease-in-out infinite}
[data-state=error] .badge{background:rgba(127,127,127,.3)}
.no-track .station{display:none}
.station{font-size:13px;opacity:.75;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.marquee{margin-top:6px;overflow:hidden;white-space:nowrap;font-size:17px;font-weight:650}
.marquee .track{display:inline-flex;gap:48px}
.marquee:not(.scroll) .track{display:block;overflow:hidden;text-overflow:ellipsis}
.marquee:not(.scroll) .track span+span{display:none}
.marquee.scroll{-webkit-mask-image:linear-gradient(90deg,transparent,#000 4%,#000 92%,transparent);
  mask-image:linear-gradient(90deg,transparent,#000 4%,#000 92%,transparent)}
.marquee.scroll .track{animation:rp-marquee var(--dur,12s) linear infinite}
.controls{display:flex;align-items:center;gap:8px;margin-top:10px}
button{all:unset;cursor:pointer;display:grid;place-items:center;border-radius:50%;color:inherit;
  -webkit-tap-highlight-color:transparent}
button:focus-visible,input:focus-visible,summary:focus-visible{outline:2px solid var(--_accent);outline-offset:2px}
svg{width:22px;height:22px;fill:currentColor}
.play{width:44px;height:44px;background:var(--_accent);color:#fff;flex:none;transition:transform .15s}
.play:active{transform:scale(.94)}
.play[data-loading] svg{display:none}
.play[data-loading]::after{content:"";width:18px;height:18px;border-radius:50%;border:2.5px solid rgba(255,255,255,.35);
  border-top-color:#fff;animation:rp-spin .8s linear infinite}
.mute{width:34px;height:34px;flex:none;opacity:.8}
.mute:hover{opacity:1}
.mute svg{width:20px;height:20px}
.vol{flex:1;min-width:50px;max-width:160px;accent-color:var(--_accent);height:20px;margin:0;cursor:pointer;background:none}
.history{position:relative;border-top:1px solid rgba(127,127,127,.18);padding:0 16px;font-size:13px}
.history summary{cursor:pointer;padding:10px 0;opacity:.75;font-weight:600;list-style-position:inside}
.history summary:hover{opacity:1}
.history ol{list-style:none;margin:0 0 12px;padding:0;display:grid;gap:6px}
.history li{display:flex;gap:10px;min-width:0}
.history time{flex:none;opacity:.55;font-variant-numeric:tabular-nums;min-width:4.5em}
.history span{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.msg{margin-top:8px;font-size:12.5px;line-height:1.4;opacity:.9}
.msg a{color:var(--_accent)}
/* Responsive: sized by the player's own width, not the viewport (works in sidebars too). */
@container (max-width:400px){
  .rp{--_art:72px}
  .main{gap:12px;padding:12px}
  .marquee{font-size:15.5px}
  .controls{margin-top:8px}
  .history{padding:0 12px}
}
@container (min-width:640px){
  .rp{--_art:124px}
  .main{gap:22px;padding:20px 24px}
  .marquee{font-size:21px}
  .station{font-size:14px}
}
@keyframes rp-spin{to{transform:rotate(360deg)}}
@keyframes rp-pulse{50%{opacity:.35}}
@keyframes rp-marquee{to{transform:translateX(calc(-1 * var(--dist,0px)))}}
@media (prefers-reduced-motion:reduce){
  .spin .art,.spin .art-fallback,.marquee.scroll .track,[data-state=playing] .badge i{animation:none}
  .marquee.scroll{-webkit-mask-image:none;mask-image:none}
  .marquee.scroll .track{display:block;overflow:hidden;text-overflow:ellipsis}
  .marquee.scroll .track span+span{display:none}
}
`;
