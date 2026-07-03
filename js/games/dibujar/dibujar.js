/* ============================================================================
   INSERT COIN — dibujar.js  (juego: Dibujá y Adiviná)
   Pictionary para 2. Por turnos, uno DIBUJA una palabra secreta y el otro la
   ADIVINA escribiendo. El dibujo se sincroniza en vivo por Firebase. Se juegan
   6 rondas (3 dibuja cada uno). Gana más puntos quien adivina rápido (y el que
   dibuja también suma cuando le adivinan).

   Notas técnicas:
   · El canvas se crea UNA vez y se actualiza en el lugar (no se re-renderiza el
     contenedor entero, o se borraría el dibujo).
   · Los trazos se guardan con coordenadas normalizadas (0..1) → se ven igual en
     cualquier pantalla. Cada trazo: {c:color, w:grosor, p:[x0,y0,x1,y1,...]}.
   · El anfitrión (p1) es árbitro: maneja el reloj y el avance de rondas.
   ============================================================================ */

(function () {
  const RONDAS = 6;                 // total (3 dibuja cada uno)
  const SEGS = 75;                  // segundos por ronda
  const COLORES = ["#00F0FF", "#FF2E97", "#FFD300", "#39FF14", "#FFFFFF", "#FF5A3C"];
  const BANCO = [
    // Fáciles / dibujables
    "sol", "casa", "árbol", "perro", "gato", "auto", "pizza", "guitarra", "teléfono",
    "reloj", "avión", "barco", "flor", "estrella", "corazón", "pelota", "helado",
    "mate", "asado", "escoba", "paraguas", "anteojos", "bicicleta", "cama", "silla",
    "montaña", "playa", "robot", "cohete", "dinosaurio", "araña", "pescado", "mariposa",
    "tijera", "martillo", "llave", "candado", "bandera", "semáforo", "puente",
    // Cine / terror
    "fantasma", "vampiro", "zombie", "bruja", "calavera", "murciélago", "tumba",
    "castillo", "cuchillo", "motosierra", "payaso", "momia", "hombre lobo", "ataúd",
    "telaraña", "vela", "luna llena", "sangre", "grito", "cementerio", "espantapájaros",
    // Argento / cultura
    "empanada", "colectivo", "obelisco", "gaucho", "dulce de leche", "fernet",
    "milanesa", "choripán", "termo", "bombachas de campo", "río", "cancha", "pochoclo"
  ];

  let cont, gameRef, listener, G = {}, mySlot;
  let canvas, ctx;
  let refs = {};
  let building = false, dibujando = false, curStroke = null, strokeCount = 0;
  let lastLive = 0, faseDibujo = false, endTimer = null, tickTimer = null;
  let fasePrev = null, ganadorPrev = null;
  const otro = (s) => (s === "p1" ? "p2" : "p1");

  /* --- Arranque ----------------------------------------------------------- */
  function crear(container) {
    cont = container;
    mySlot = IC.room.mySlot;
    gameRef = IC.room.gameRef();
    G = {}; fasePrev = null; ganadorPrev = null; strokeCount = 0;
    construirSkeleton();

    listener = gameRef.on("value", (snap) => {
      G = snap.val() || {};
      if (IC.room.isHost() && !G.phase) { init(); return; }
      if (IC.room.isHost()) hostTick();
      update();
    });
    if (IC.room.isHost()) {
      gameRef.child("phase").get().then(s => { if (!s.exists()) init(); }).catch(() => {});
    }
    return { destroy };
  }

  function init() {
    gameRef.set({
      phase: "elegir", round: 1, drawer: "p1",
      opciones: elegirOpciones(), word: null,
      strokes: {}, live: null, guesses: [],
      scores: { p1: 0, p2: 0 }, roundWinner: null, deadline: null, ganador: null, seq: 1
    });
  }

  function destroy() {
    if (gameRef && listener) gameRef.off("value", listener);
    clearTimeout(endTimer); clearInterval(tickTimer);
    window.removeEventListener("resize", ajustarCanvas);
    window.removeEventListener("pointerup", onUp);
    G = {}; refs = {}; canvas = null; ctx = null;
  }

  /* --- Árbitro: reloj y avance de rondas ---------------------------------- */
  function hostTick() {
    const seq = G.seq;
    // Al entrar en "dibujar", fijar deadline una sola vez y programar el corte.
    if (G.phase === "dibujar") {
      if (!G.deadline) {
        gameRef.update({ deadline: hostNow() + SEGS * 1000 });
      } else if (hostEndSeq !== seq) {
        hostEndSeq = seq;
        clearTimeout(endTimer);
        const ms = Math.max(0, G.deadline - hostNow());
        endTimer = setTimeout(() => {
          gameRef.child("phase").get().then(s => {
            if (s.val() === "dibujar") cerrarRonda(null);   // se acabó el tiempo
          });
        }, ms + 50);
      }
    }
    // Avanzar automáticamente después del resultado.
    if (G.phase === "resultado" && hostNextSeq !== seq) {
      hostNextSeq = seq;
      clearTimeout(endTimer);
      endTimer = setTimeout(() => siguienteRonda(), 3200);
    }
  }
  let hostEndSeq = null, hostNextSeq = null;

  function cerrarRonda(quienAdivino) {
    if (!IC.room.isHost()) return;
    if (G.phase !== "dibujar") return;
    const scores = Object.assign({ p1: 0, p2: 0 }, G.scores);
    let bonus = 0;
    if (quienAdivino) {
      const restante = Math.max(0, (G.deadline || 0) - hostNow());
      bonus = Math.round(restante / 1000);           // 1 punto por segundo que sobró
      scores[quienAdivino] += 50 + bonus;             // adivina
      scores[G.drawer] += 30;                          // dibuja
    }
    gameRef.update({ phase: "resultado", roundWinner: quienAdivino || "timeout", scores });
  }

  function siguienteRonda() {
    if (!IC.room.isHost()) return;
    const next = (G.round || 1) + 1;
    if (next > RONDAS) {
      const s = G.scores || { p1: 0, p2: 0 };
      const ganador = s.p1 === s.p2 ? "empate" : (s.p1 > s.p2 ? "p1" : "p2");
      gameRef.update({ phase: "fin", ganador });
      if (ganador !== "empate") IC.scoreboard.registrarVictoria(ganador);
      return;
    }
    gameRef.update({
      phase: "elegir", round: next, drawer: otro(G.drawer),
      opciones: elegirOpciones(), word: null,
      strokes: {}, live: null, guesses: [], roundWinner: null,
      deadline: null, seq: (G.seq || 0) + 1
    });
  }

  function elegirOpciones() {
    const pool = BANCO.slice(); const out = [];
    for (let i = 0; i < 3 && pool.length; i++) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return out;
  }

  /* --- El dibujante elige palabra ----------------------------------------- */
  function elegirPalabra(w) {
    if (G.drawer !== mySlot || G.phase !== "elegir") return;
    if (IC.audio) IC.audio.select();
    gameRef.update({ word: w, phase: "dibujar", deadline: null, seq: (G.seq || 0) + 1 });
  }

  /* --- Adivinar ----------------------------------------------------------- */
  function enviarGuess(texto) {
    texto = (texto || "").trim();
    if (!texto || G.phase !== "dibujar" || G.drawer === mySlot) return;
    const ok = normal(texto) === normal(G.word || "") ||
      (G.word && normal(texto).length >= 3 && normal(texto).includes(normal(G.word)));
    const nuevas = (G.guesses || []).slice(-3);
    nuevas.push({ by: mySlot, t: texto, ok });
    gameRef.child("guesses").set(nuevas);
    if (ok) { if (IC.audio) IC.audio.correct(); cerrarRondaComoAdivino(); }
    else { if (IC.audio) IC.audio.wrong(); }
  }
  // El que adivina cierra la ronda (aunque no sea host) para que sea instantáneo.
  function cerrarRondaComoAdivino() {
    gameRef.child("phase").transaction(p => (p === "dibujar" ? "resultado" : undefined)).then((res) => {
      if (res && res.committed && res.snapshot.val() === "resultado") {
        const scores = Object.assign({ p1: 0, p2: 0 }, G.scores);
        const restante = Math.max(0, (G.deadline || 0) - Date.now());
        scores[mySlot] += 50 + Math.round(restante / 1000);
        scores[G.drawer] += 30;
        gameRef.update({ roundWinner: mySlot, scores });
      }
    }).catch(() => {});
  }

  /* --- Dibujo: pointer + sincronización ----------------------------------- */
  function puntoDe(ev) {
    const r = canvas.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width);
    const y = ((ev.clientY - r.top) / r.height);
    return [clamp01(x), clamp01(y)];
  }
  function soyDibujante() { return G.phase === "dibujar" && G.drawer === mySlot; }

  function onDown(ev) {
    if (!soyDibujante()) return;
    ev.preventDefault(); dibujando = true;
    const [x, y] = puntoDe(ev);
    curStroke = { c: refs.color, w: refs.grosor, p: [x, y] };
  }
  function onMove(ev) {
    if (!dibujando || !curStroke) return;
    ev.preventDefault();
    const [x, y] = puntoDe(ev);
    curStroke.p.push(x, y);
    redraw();                                   // pintado inmediato local
    const ahora = Date.now();
    if (ahora - lastLive > 90) { lastLive = ahora; gameRef.child("live").set(curStroke); }
  }
  function onUp() {
    if (!dibujando || !curStroke) { dibujando = false; return; }
    dibujando = false;
    if (curStroke.p.length >= 2) {
      gameRef.child("strokes/" + strokeCount).set(curStroke);
      strokeCount++;
    }
    curStroke = null;
    gameRef.child("live").set(null);
  }
  function limpiar() {
    if (!soyDibujante()) return;
    strokeCount = 0;
    gameRef.update({ strokes: {}, live: null });
    if (IC.audio) IC.audio.click();
  }

  /* --- Redibujar el canvas desde el estado -------------------------------- */
  function redraw() {
    if (!ctx || !canvas) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    const pintar = (st) => {
      if (!st || !st.p || st.p.length < 2) return;
      ctx.strokeStyle = st.c || "#fff";
      ctx.lineWidth = (st.w || 4) * (W / 1000);
      ctx.beginPath();
      ctx.moveTo(st.p[0] * W, st.p[1] * H);
      for (let i = 2; i < st.p.length; i += 2) ctx.lineTo(st.p[i] * W, st.p[i + 1] * H);
      ctx.stroke();
    };
    const strokes = G.strokes || {};
    Object.keys(strokes).map(Number).sort((a, b) => a - b).forEach(k => pintar(strokes[k]));
    if (G.live) pintar(G.live);
    if (dibujando && curStroke) pintar(curStroke);
  }

  /* =========================================================================
     SKELETON (se arma una vez) + UPDATE (en el lugar)
     ========================================================================= */
  function construirSkeleton() {
    cont.innerHTML = `
      <div class="dib-head">
        <span class="dib-round" id="dib-round">Ronda 1/${RONDAS}</span>
        <span class="dib-word" id="dib-word"></span>
        <span class="dib-timer" id="dib-timer">${SEGS}</span>
      </div>
      <div class="dib-scores" id="dib-scores"></div>
      <div class="dib-stage">
        <canvas class="dib-canvas" id="dib-canvas"></canvas>
        <div class="dib-overlay hidden" id="dib-overlay"></div>
      </div>
      <div class="dib-tools hidden" id="dib-tools"></div>
      <div class="dib-guess hidden" id="dib-guess">
        <div class="dib-feed" id="dib-feed"></div>
        <form class="dib-form" id="dib-form">
          <input class="input" id="dib-input" maxlength="24" placeholder="Escribí tu adivinanza…" autocomplete="off" />
          <button class="btn btn--small" type="submit" style="min-width:54px">➤</button>
        </form>
      </div>`;
    refs = {
      round: id("dib-round"), word: id("dib-word"), timer: id("dib-timer"),
      scores: id("dib-scores"), overlay: id("dib-overlay"),
      tools: id("dib-tools"), guess: id("dib-guess"), feed: id("dib-feed"),
      color: COLORES[0], grosor: 6
    };
    canvas = id("dib-canvas");
    ctx = canvas.getContext("2d");
    ajustarCanvas();
    window.addEventListener("resize", ajustarCanvas);

    // Pointer (solo actúa si soy dibujante en fase dibujar).
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    id("dib-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const inp = id("dib-input");
      enviarGuess(inp.value); inp.value = "";
    });
  }

  function ajustarCanvas() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(280, Math.round(rect.width));
    const h = Math.round(w * 0.72);
    canvas.width = w; canvas.height = h;
    canvas.style.height = h + "px";
    redraw();
  }

  function update() {
    if (!G.phase) return;
    // reloj y resultado (sonidos una vez)
    if (G.phase !== fasePrev) {
      fasePrev = G.phase;
      if (G.phase === "dibujar") { strokeCount = Object.keys(G.strokes || {}).length; arrancarTick(); }
      else { clearInterval(tickTimer); }
    }
    if (G.ganador && G.ganador !== ganadorPrev) {
      ganadorPrev = G.ganador;
      if (IC.audio) (G.ganador === mySlot ? IC.audio.win() : (G.ganador === "empate" ? IC.audio.coin() : IC.audio.lose()));
    }

    // cabecera
    refs.round.textContent = `Ronda ${Math.min(G.round || 1, RONDAS)}/${RONDAS}`;
    pintarScores();
    pintarPalabra();
    pintarTimer();

    // paneles por fase
    const soyDib = G.drawer === mySlot;
    if (G.phase === "elegir") {
      hide(refs.tools); hide(refs.guess);
      mostrarOverlay(overlayElegir(soyDib));
    } else if (G.phase === "dibujar") {
      hideOverlay();
      if (soyDib) { show(refs.tools); hide(refs.guess); pintarTools(); }
      else { hide(refs.tools); show(refs.guess); pintarFeed(); }
    } else if (G.phase === "resultado") {
      hide(refs.tools); hide(refs.guess);
      mostrarOverlay(overlayResultado());
    } else if (G.phase === "fin") {
      hide(refs.tools); hide(refs.guess);
      mostrarOverlay(overlayFin());
    }
    redraw();
  }

  function arrancarTick() {
    clearInterval(tickTimer);
    tickTimer = setInterval(pintarTimer, 250);
  }
  function pintarTimer() {
    if (!refs.timer) return;
    if (G.phase !== "dibujar" || !G.deadline) { refs.timer.textContent = "—"; return; }
    const s = Math.max(0, Math.ceil((G.deadline - Date.now()) / 1000));
    refs.timer.textContent = s;
    refs.timer.classList.toggle("urgente", s <= 10);
  }
  function pintarScores() {
    const s = G.scores || { p1: 0, p2: 0 };
    refs.scores.innerHTML =
      `<span class="dib-sc p1">${IC.player.html(av("p1"), 20)} ${s.p1}${G.drawer === "p1" ? " ✏️" : ""}</span>
       <span class="dib-sc p2">${s.p2}${G.drawer === "p2" ? " ✏️" : ""} ${IC.player.html(av("p2"), 20)}</span>`;
  }
  function pintarPalabra() {
    if (G.phase !== "dibujar") { refs.word.textContent = ""; return; }
    if (G.drawer === mySlot) refs.word.innerHTML = `Dibujá: <b>${esc(G.word || "")}</b>`;
    else refs.word.innerHTML = blancos(G.word || "");
  }
  function blancos(w) {
    return w.split("").map(ch => ch === " " ? "&nbsp;&nbsp;" : "_").join(" ") +
      `<span class="dib-len"> (${w.replace(/\s/g, "").length})</span>`;
  }
  function pintarTools() {
    refs.tools.innerHTML =
      COLORES.map(c => `<button class="dib-color ${c === refs.color ? "sel" : ""}" data-c="${c}" style="background:${c}"></button>`).join("") +
      `<button class="dib-tool" id="dib-clear">🗑️</button>`;
    refs.tools.querySelectorAll(".dib-color").forEach(b => b.onclick = () => { refs.color = b.dataset.c; pintarTools(); });
    const cl = id("dib-clear"); if (cl) cl.onclick = limpiar;
  }
  function pintarFeed() {
    const gs = G.guesses || [];
    refs.feed.innerHTML = gs.slice(-3).map(g =>
      `<div class="dib-bub ${g.ok ? "ok" : ""} ${g.by === mySlot ? "mio" : ""}">${esc(g.t)}${g.ok ? " ✅" : ""}</div>`).join("");
  }

  function overlayElegir(soyDib) {
    if (soyDib) {
      const ops = (G.opciones || []).map(w => `<button class="btn dib-op" data-w="${esc(w)}">${esc(w)}</button>`).join("");
      return { html: `<div class="dib-ov-tit">Elegí qué dibujar ✏️</div><div class="dib-ops">${ops}</div>`, wire: (el) => {
        el.querySelectorAll(".dib-op").forEach(b => b.onclick = () => elegirPalabra(b.dataset.w));
      } };
    }
    const nom = IC.room.players[G.drawer] ? esc(IC.room.players[G.drawer].nick) : "El otro";
    return { html: `<div class="dib-ov-tit">✏️ ${nom} está eligiendo…</div><div class="dib-ov-sub">Preparate para adivinar</div>` };
  }
  function overlayResultado() {
    const rw = G.roundWinner;
    const nom = (s) => (IC.room.players[s] ? esc(IC.room.players[s].nick) : (s === "p1" ? "Jugador 1" : "Jugador 2"));
    let tit;
    if (rw === "timeout") tit = `⏱️ ¡Se acabó el tiempo!`;
    else if (rw === mySlot) tit = `✅ ¡Adivinaste!`;
    else if (rw === G.drawer) tit = `🎉 ¡Te adivinaron!`;
    else tit = `✅ Adivinó ${nom(rw)}`;
    return { html: `<div class="dib-ov-tit">${tit}</div><div class="dib-ov-word">La palabra era: <b>${esc(G.word || "")}</b></div><div class="dib-ov-sub">Siguiente ronda…</div>` };
  }
  function overlayFin() {
    const won = G.ganador === mySlot, emp = G.ganador === "empate";
    const tit = emp ? "🤝 ¡Empate!" : (won ? "🏆 ¡Ganaste!" : "💀 Perdiste");
    return { html: `<div class="dib-ov-tit">${tit}</div>
        <div class="dib-ov-fin">
          <button class="btn" id="dib-rev">🔁 Revancha</button>
          <button class="btn btn--ghost" id="dib-menu">Volver al menú</button>
        </div>`, wire: (el) => {
      el.querySelector("#dib-rev").onclick = () => { ganadorPrev = null; fasePrev = null; gameRef.remove(); };
      el.querySelector("#dib-menu").onclick = () => IC.room.backToMenu();
    } };
  }

  /* --- helpers de overlay/DOM --------------------------------------------- */
  function mostrarOverlay(o) {
    refs.overlay.innerHTML = o.html;
    refs.overlay.classList.remove("hidden");
    if (o.wire) o.wire(refs.overlay);
  }
  function hideOverlay() { refs.overlay.classList.add("hidden"); refs.overlay.innerHTML = ""; }
  function show(el) { el.classList.remove("hidden"); }
  function hide(el) { el.classList.add("hidden"); }
  function id(x) { return document.getElementById(x); }
  function av(slot) { const p = IC.room.players[slot]; return p ? p.avatar : "🎮"; }
  function hostNow() { return Date.now(); }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function normal(s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ ]/g, "").replace(/\s+/g, " ").trim(); }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  IC.games.register({
    id: "dibujar",
    nombre: "Dibujá y Adiviná",
    emoji: "✏️",
    desc: "Uno dibuja, el otro adivina · dibujo en vivo",
    disponible: true,
    crear, destroy
  });
})();
