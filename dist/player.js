(()=>{var c=`
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
.art-fallback{display:grid;place-items:center;background:radial-gradient(circle at 30% 30%,var(--_accent),#2a2140 75%);
  color:#fff;font-weight:700;font-size:calc(var(--_art) * .3);letter-spacing:.02em}
.art-fallback::after{content:"";position:absolute;width:16%;height:16%;border-radius:50%;background:var(--_bg);
  box-shadow:0 0 0 3px rgba(255,255,255,.25)}
.spin .art,.spin .art-fallback{animation:rp-spin 24s linear infinite}
.body{position:relative;flex:1;min-width:0}
.top{display:flex;align-items:center;gap:8px;min-width:0}
.badge{flex:none;display:inline-flex;align-items:center;gap:6px;padding:3px 8px;border-radius:999px;
  font-size:10.5px;font-weight:700;letter-spacing:.09em;background:rgba(127,127,127,.18)}
.badge i{width:7px;height:7px;border-radius:50%;background:currentColor;opacity:.6}
[data-state=playing] .badge{background:var(--_accent);color:#fff}
[data-state=playing] .badge i{opacity:1;animation:rp-pulse 1.6s ease-in-out infinite}
[data-state=error] .badge{background:rgba(127,127,127,.3)}
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
.msg{margin-top:8px;font-size:12.5px;line-height:1.4;opacity:.9}
.msg a{color:var(--_accent)}
@keyframes rp-spin{to{transform:rotate(360deg)}}
@keyframes rp-pulse{50%{opacity:.35}}
@keyframes rp-marquee{to{transform:translateX(calc(-1 * var(--dist,0px)))}}
@media (prefers-reduced-motion:reduce){
  .spin .art,.spin .art-fallback,.marquee.scroll .track,[data-state=playing] .badge i{animation:none}
  .marquee.scroll{-webkit-mask-image:none;mask-image:none}
  .marquee.scroll .track{display:block;overflow:hidden;text-overflow:ellipsis}
  .marquee.scroll .track span+span{display:none}
}
`;var u=typeof navigator!="undefined"?navigator.userAgent:"",p=/iPad|iPhone|iPod/.test(u)||/Macintosh/.test(u)&&navigator.maxTouchPoints>1;function o(n,t){try{if(t===void 0)return localStorage.getItem(n);localStorage.setItem(n,t)}catch(e){}return null}var l=n=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${n}"/></svg>`,r={play:l("M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z"),pause:l("M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"),vol:l("M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"),mute:l("M4 9v6h4l5 4V5L8 9H4zm12.6 3 2.7-2.7-1.4-1.4-2.7 2.7-2.7-2.7-1.4 1.4 2.7 2.7-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.4z")},g=`
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
        <button class="play" part="play-button" type="button" aria-label="Play">${r.play}</button>
        <button class="mute" type="button" aria-label="Mute">${r.vol}</button>
        <input class="vol" part="volume" type="range" min="0" max="1" step="0.01" aria-label="Volume">
      </div>
      <div class="msg" part="message" role="status" hidden></div>
    </div>
  </div>
</div>`,f={idle:"LIVE",loading:"CONNECTING",playing:"LIVE",reconnecting:"RECONNECTING",error:"OFFLINE"},v=15e3,b=5,a=null,d=class extends HTMLElement{static get observedAttributes(){return["src","title","volume"]}constructor(){super();let t=this.attachShadow({mode:"open"});t.innerHTML=`<style>${c}</style>${g}`;let e=s=>t.querySelector(s);this.ui={rp:e(".rp"),canvas:e(".viz"),artWrap:e(".art-wrap"),art:e(".art"),fallback:e(".art-fallback"),badge:e(".badge b"),station:e(".station"),marquee:e(".marquee"),track:e(".track"),spans:t.querySelectorAll(".track span"),play:e(".play"),mute:e(".mute"),vol:e(".vol"),msg:e(".msg")},this.state="idle",this.wantPlay=!1,this.retries=0,this.everPlayed=!1,this.audio=null,this.now=null;let i=parseFloat(o("tunein-embed:volume"));this._volume=Number.isFinite(i)?i:.8,this._muted=!1,this._onAudio=this._onAudio.bind(this),this._onOnline=()=>this.state==="reconnecting"&&this._retryNow(),this.ui.play.addEventListener("click",()=>this.toggle()),this.ui.mute.addEventListener("click",()=>this._setMuted(!this._muted)),this.ui.vol.addEventListener("input",()=>this._setVolume(parseFloat(this.ui.vol.value))),p&&(this.ui.vol.hidden=!0)}connectedCallback(){if(this.hasAttribute("volume")&&o("tunein-embed:volume")==null&&(this._volume=Math.min(1,Math.max(0,parseFloat(this.getAttribute("volume"))||0))),this.ui.vol.value=this._volume,this._renderStation(),this._renderTrack(),window.addEventListener("online",this._onOnline),window.ResizeObserver){let t=0;this._ro=new ResizeObserver(([e])=>{let i=Math.round(e.contentRect.width);i!==t&&(t=i,this._fitMarquee())}),this._ro.observe(this.ui.rp)}}disconnectedCallback(){this.pause(),window.removeEventListener("online",this._onOnline),this._ro&&this._ro.disconnect()}attributeChangedCallback(t,e,i){e===i||!this.isConnected||(t==="title"?(this._renderStation(),this._renderTrack()):t==="src"&&this.wantPlay?(this.pause(),this.play()):t==="volume"&&this._setVolume(parseFloat(i)))}get stationName(){return this.getAttribute("title")||"Live Radio"}get playing(){return this.wantPlay}toggle(){this.wantPlay?this.pause():this.play()}play(){let t=this._streamUrl();if(!t)return this._fail('No stream URL set (add a src="..." attribute).');a&&a!==this&&a.pause(),a=this,this.wantPlay=!0,this.retries=0,this.everPlayed=!1,this._setMsg(""),this.audio||this._createAudio(),this._load(t),this._setupMediaSession(),this._watchdog=this._watchdog||setInterval(()=>this._tick(),2e3)}pause(){this.wantPlay=!1,clearTimeout(this._retryTimer),clearInterval(this._watchdog),this._retryTimer=this._watchdog=null;let t=this.audio;t&&(t.pause(),t.removeAttribute("src"),t.load()),a===this&&(a=null),this.state!=="error"&&this._setState("idle"),this._setPlaybackState("paused")}_streamUrl(){let t=(this.getAttribute("src")||"").trim();if(!t)return"";let e;try{e=new URL(t,location.href)}catch(i){return""}return this._mixed=location.protocol==="https:"&&e.protocol==="http:",this._mixed&&(e.protocol="https:"),e.href}_createAudio(){let t=new Audio;t.preload="none",t.volume=this._volume,t.muted=this._muted;for(let e of["playing","waiting","pause","ended","error"])t.addEventListener(e,this._onAudio);this.audio=t}_load(t){let e=this.audio;this._setState(this.retries?"reconnecting":"loading"),this._lastTime=-1,this._lastProgress=Date.now(),this._reloading=!0,e.src=t;let i=e.play();i&&i.catch&&i.catch(s=>{s&&s.name==="NotAllowedError"&&(this.pause(),this._setMsg("Tap play to start listening."))})}_onAudio(t){let e=this.audio;if(!(!e||t.target!==e))switch(t.type){case"playing":if(this._reloading=!1,!this.wantPlay)return;this.everPlayed=!0,this._playingSince=Date.now(),this._setMsg(""),this._setState("playing"),this._setPlaybackState("playing");break;case"waiting":this.wantPlay&&this.state==="playing"&&this._setState("loading");break;case"pause":this.wantPlay&&!this._reloading&&!e.ended&&!e.error&&this.pause();break;case"ended":case"error":this.wantPlay&&this._onError(t.type);break}}_onError(t){if(this._reloading=!1,!this.everPlayed&&this._mixed)return this._fail('This page is served over HTTPS but the stream URL is http://, so the browser blocks it. Use an https:// stream URL (see the README section "Mixed content").');if(!this.everPlayed&&this.retries>=b)return this._fail("Could not connect to the stream. It may be offline or the URL may be wrong.");this._scheduleRetry(t)}_scheduleRetry(){if(!this.wantPlay||this._retryTimer)return;let t=Math.min(3e4,1e3*2**this.retries);this.retries++,this._setState("reconnecting"),this._setMsg(`Stream interrupted. Reconnecting in ${Math.round(t/1e3)}s\u2026`),this._retryTimer=setTimeout(()=>this._retryNow(),t)}_retryNow(){clearTimeout(this._retryTimer),this._retryTimer=null,this.wantPlay&&this._load(this._streamUrl())}_tick(){let t=this.audio;if(!this.wantPlay||!t||this._retryTimer)return;let e=Date.now();t.currentTime!==this._lastTime?(this._lastTime=t.currentTime,this._lastProgress=e,this.state!=="playing"&&!t.paused&&this._lastTime>0&&this._setState("playing"),this.retries&&e-this._playingSince>3e4&&(this.retries=0)):e-this._lastProgress>v&&this._scheduleRetry("stalled")}_fail(t){this.pause(),this._setState("error"),this._setMsg(t),this.dispatchEvent(new CustomEvent("rp-error",{detail:{message:t},bubbles:!0,composed:!0}))}_setVolume(t){Number.isFinite(t)&&(this._volume=Math.min(1,Math.max(0,t)),this.ui.vol.value=this._volume,this.audio&&(this.audio.volume=this._volume),o("tunein-embed:volume",String(this._volume)),this._volume>0&&this._muted&&this._setMuted(!1))}_setMuted(t){this._muted=t,this.audio&&(this.audio.muted=t),this.ui.mute.innerHTML=t?r.mute:r.vol,this.ui.mute.setAttribute("aria-label",t?"Unmute":"Mute")}_setupMediaSession(){if(!("mediaSession"in navigator))return;let t=navigator.mediaSession,e={play:()=>this.play(),pause:()=>this.pause(),stop:()=>this.pause()};for(let i in e)try{t.setActionHandler(i,e[i])}catch(s){}this._updateMediaMetadata()}_updateMediaMetadata(){if(!("mediaSession"in navigator)||a!==this||typeof MediaMetadata=="undefined")return;let t=this.now,e=t&&t.art||this._logo();navigator.mediaSession.metadata=new MediaMetadata({title:t&&t.title||this.stationName,artist:t&&t.artist||(t?this.stationName:""),album:this.stationName,artwork:e?[{src:new URL(e,location.href).href,sizes:"512x512"}]:[]})}_setPlaybackState(t){"mediaSession"in navigator&&(a===this||t==="paused")&&(navigator.mediaSession.playbackState=t)}_logo(){return this.getAttribute("logo")||""}_setState(t){if(this.state===t)return;this.state=t;let{rp:e,play:i,badge:s,artWrap:m}=this.ui;e.dataset.state=t,s.textContent=f[t];let h=t==="playing"||t==="loading"||t==="reconnecting";i.innerHTML=h?r.pause:r.play,i.setAttribute("aria-label",h?"Pause":"Play"),i.toggleAttribute("data-loading",t==="loading"||t==="reconnecting"),m.classList.toggle("spin",t==="playing"),this.dispatchEvent(new CustomEvent("rp-state",{detail:{state:t},bubbles:!0,composed:!0}))}_setMsg(t){this.ui.msg.textContent=t,this.ui.msg.hidden=!t}_renderStation(){let t=this.stationName;this.ui.station.textContent=t,this.ui.fallback.textContent=t.split(/\s+/).map(e=>e[0]).join("").slice(0,2).toUpperCase(),this._renderArt()}_renderArt(){let t=this.now&&this.now.art||this._logo(),e=this.ui.art;if(!t){e.hidden=!0,e.removeAttribute("src");return}e.getAttribute("src")!==t&&(e.onload=()=>e.hidden=!1,e.onerror=()=>e.hidden=!0,e.src=t)}_renderTrack(){let t=this.now&&this.now.text||this.stationName,{marquee:e,spans:i}=this.ui;i[0].textContent!==t&&(i[0].textContent=i[1].textContent=t,e.title=t,this._fitMarquee())}_fitMarquee(){let{marquee:t,track:e}=this.ui;t.classList.remove("scroll");let i=e.scrollWidth;i>t.clientWidth+2&&(t.style.setProperty("--dist",`${i+48}px`),t.style.setProperty("--dur",`${Math.max(8,(i+48)/40)}s`),t.classList.add("scroll"))}};/*! tunein-embed | MIT License | (c) 2026 Jonathan Kendall | github.com/onojk/tunein-embed */customElements.get("radio-player")||customElements.define("radio-player",d);})();
