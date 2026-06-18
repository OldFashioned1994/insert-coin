/* ============================================================================
   INSERT COIN — audio.js
   Música y efectos estilo arcade/chiptune, generados por código con la Web
   Audio API (no usa archivos: livianos y sin problemas de derechos).
   Incluye botón de silenciar (se recuerda en el navegador).

   Nota: en los celulares el audio recién puede arrancar tras el primer toque
   del usuario (política anti-autoplay). Por eso lo "desbloqueamos" con el
   primer gesto (el botón Press Start).
   ============================================================================ */

IC.audio = {
  ctx: null, master: null, musicGain: null, sfxGain: null,
  muted: false, _musicOn: false, _timer: null, _step: 0, _next: 0,

  /* --- Música: homenaje arcade al tema de "Halloween" (Carpenter) ---------
     Compás de 5/4 (10 corcheas por compás, 2 compases = 20 pasos), ostinato
     hipnótico en Fa# menor. Acento en el agrupamiento 3+2 (pasos 0 y 6). */
  _BPM: 158,
  // Pulso del 5/4 (agrupado 3+2): acentos en los pasos 0 y 6 de cada compás.
  _ACC: [0, 6, 10, 16, 20, 26, 30, 36],
  // 4 compases en Fa# menor: 1-2 ostinato hipnótico (Fa#5/Do#5), 3 sube la
  // tensión (La5/Mi5), 4 desciende para resolver y volver al loop.
  _melody: [739.99, 554.37, 739.99, 554.37, 739.99, 554.37, 739.99, 554.37, 739.99, 554.37,
            739.99, 554.37, 739.99, 554.37, 739.99, 554.37, 739.99, 554.37, 739.99, 554.37,
            880.00, 659.25, 880.00, 659.25, 880.00, 659.25, 880.00, 659.25, 880.00, 659.25,
            587.33, 493.88, 587.33, 493.88, 587.33, 493.88, 554.37, 440.00, 554.37, 440.00],
  // Bajo grave marcando el pulso de cada compás (raíz que va bajando al final).
  _bass:   [92.50, 0, 0, 0, 0, 0, 92.50, 0, 0, 0,
            92.50, 0, 0, 0, 0, 0, 92.50, 0, 0, 0,
            110.00, 0, 0, 0, 0, 0, 110.00, 0, 0, 0,
            73.42, 0, 0, 0, 0, 0, 82.41, 0, 0, 0],

  /** Se llama una vez al cargar: lee el mute guardado y engancha el botón
      y los clics. NO crea el audio todavía (eso necesita un gesto). */
  init() {
    this.muted = localStorage.getItem("ic_muted") === "1";
    const btn = document.getElementById("audio-btn");
    if (btn) {
      this._pintarBoton();
      btn.addEventListener("click", () => this.toggleMute());
    }
    // Clic suave en cualquier botón (y un blip distinto al elegir opciones).
    document.addEventListener("pointerdown", (e) => {
      const el = e.target.closest && e.target.closest("button");
      if (!el || el.id === "audio-btn") return;
      if (el.classList.contains("tr-cat") || el.classList.contains("tr-op")) this.select();
      else this.click();
    });
  },

  /** Crea el contexto de audio (en el primer gesto). Devuelve true si está ok. */
  _ensure() {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.05; this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();   this.sfxGain.gain.value = 0.35;  this.sfxGain.connect(this.master);
      return true;
    } catch (_) { return false; }
  },

  /** Reactiva el audio tras el primer gesto (móviles lo suspenden). */
  unlock() { if (this._ensure() && this.ctx.state === "suspended") this.ctx.resume(); },

  /** Crea una nota: oscilador + envolvente. dest = sfxGain o musicGain. */
  _tone(freq, t, dur, type, gain, dest, glideTo) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(t); o.stop(t + dur + 0.03);
  },

  /* --- Efectos de sonido -------------------------------------------------- */
  click()   { if (!this._ensure()) return; const t = this.ctx.currentTime; this._tone(420, t, 0.05, "square", 0.22); },
  select()  { if (!this._ensure()) return; const t = this.ctx.currentTime; this._tone(520, t, 0.07, "square", 0.25, null, 760); },
  coin()    { if (!this._ensure()) return; const t = this.ctx.currentTime; this._tone(988, t, 0.08, "square", 0.3); this._tone(1319, t + 0.09, 0.2, "square", 0.3); },
  correct() { if (!this._ensure()) return; const t = this.ctx.currentTime; [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this._tone(f, t + i * 0.08, 0.13, "square", 0.28)); },
  wrong()   { if (!this._ensure()) return; const t = this.ctx.currentTime; this._tone(196, t, 0.32, "sawtooth", 0.3, null, 90); },
  tick()    { if (!this._ensure()) return; const t = this.ctx.currentTime; this._tone(900, t, 0.04, "square", 0.16); },
  timeout() { if (!this._ensure()) return; const t = this.ctx.currentTime; this._tone(160, t, 0.5, "sawtooth", 0.3, null, 70); },
  win()     { if (!this._ensure()) return; const t = this.ctx.currentTime; [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this._tone(f, t + i * 0.1, 0.2, "square", 0.3)); },
  lose()    { if (!this._ensure()) return; const t = this.ctx.currentTime; [392, 329.63, 261.63, 196].forEach((f, i) => this._tone(f, t + i * 0.15, 0.24, "triangle", 0.3)); },
  join()    { if (!this._ensure()) return; const t = this.ctx.currentTime; this._tone(523.25, t, 0.1, "square", 0.28); this._tone(783.99, t + 0.1, 0.16, "square", 0.28); },
  chat()    { if (!this._ensure()) return; const t = this.ctx.currentTime; this._tone(680, t, 0.06, "sine", 0.22); },

  /* --- Música de fondo (loop) --------------------------------------------- */
  startMusic() {
    if (!this._ensure() || this._musicOn) return;
    this._musicOn = true; this._step = 0;
    this._next = this.ctx.currentTime + 0.1;
    this._timer = setInterval(() => this._sched(), 25);
  },
  stopMusic() { this._musicOn = false; if (this._timer) { clearInterval(this._timer); this._timer = null; } },

  _sched() {
    if (!this._musicOn) return;
    const stepDur = 60 / this._BPM / 2;   // corcheas
    while (this._next < this.ctx.currentTime + 0.13) {
      const s = this._step % 40;
      const lead = this._melody[s], bass = this._bass[s];
      const acc = this._ACC.indexOf(s) >= 0;        // paso acentuado
      if (lead) this._tone(lead, this._next, stepDur * 1.25, "triangle", acc ? 0.62 : 0.4, this.musicGain);
      if (bass) this._tone(bass, this._next, stepDur * 1.7, "square", 0.55, this.musicGain);
      this._next += stepDur; this._step++;
    }
  },

  /* --- Silenciar ---------------------------------------------------------- */
  toggleMute() { this.setMuted(!this.muted); },
  setMuted(m) {
    this.muted = m;
    localStorage.setItem("ic_muted", m ? "1" : "0");
    if (this._ensure()) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      this.master.gain.value = m ? 0 : 1;
    }
    this._pintarBoton();
  },
  _pintarBoton() {
    const btn = document.getElementById("audio-btn");
    if (btn) btn.textContent = this.muted ? "🔇" : "🔊";
  }
};
