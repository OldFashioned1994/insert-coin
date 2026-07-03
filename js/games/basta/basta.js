/* ============================================================================
   INSERT COIN — basta.js  (juego: Basta! / Tutti Frutti)
   Clásico argentino para 2. Sale una LETRA al azar y ambos corren a completar
   categorías (Nombre, Animal, País…) con palabras que empiecen con esa letra.
   El primero que termina toca "¡BASTA!" y arranca una cuenta de 5s para el otro.
   Puntos por categoría: válida y distinta = 100 · válida pero igual = 50 · vacía
   o inválida = 0. Se juegan 5 rondas; gana el que más suma.

   El anfitrión (p1) es árbitro: elige la letra, corta con el reloj y puntúa.
   Los inputs son locales (no se re-renderizan mientras el otro escribe).
   ============================================================================ */

(function () {
  const RONDAS = 5;
  const ESPERA = 5;                 // segundos tras el "¡Basta!"
  const CATS = ["Nombre", "Animal", "País o ciudad", "Comida", "Color", "Cosa u objeto"];
  const LETRAS = "ABCDEFGHIJLMNOPRSTUV";   // sin Ñ/K/Q/W/X/Y/Z (difíciles)

  let cont, gameRef, listener, G = {}, mySlot;
  let refs = {}, inputs = [], debTimer = null, locked = false, seqLocal = null;
  let lockInterval = null, fasePrev = null, ganadorPrev = null;
  const otro = (s) => (s === "p1" ? "p2" : "p1");

  function crear(container) {
    cont = container;
    mySlot = IC.room.mySlot;
    gameRef = IC.room.gameRef();
    G = {}; fasePrev = null; ganadorPrev = null; seqLocal = null;
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
      phase: "jugando", round: 1, letra: letraAlAzar(),
      answers: {}, bastaBy: null, deadline: null,
      scores: { p1: 0, p2: 0 }, detalle: null, ganador: null, seq: 1
    });
  }

  function destroy() {
    if (gameRef && listener) gameRef.off("value", listener);
    clearTimeout(debTimer); clearInterval(lockInterval);
    G = {}; refs = {}; inputs = [];
  }

  function letraAlAzar() { return LETRAS[Math.floor(Math.random() * LETRAS.length)]; }

  /* --- Árbitro ------------------------------------------------------------- */
  let hostDeadSeq = null, hostNextSeq = null;
  function hostTick() {
    const seq = G.seq;
    if (G.phase === "jugando" && G.bastaBy && !G.deadline) {
      gameRef.update({ deadline: hostNow() + ESPERA * 1000 });
    }
    if (G.phase === "jugando" && G.deadline && hostDeadSeq !== seq) {
      hostDeadSeq = seq;
      clearTimeout(debTimer);
      const ms = Math.max(0, G.deadline - hostNow());
      setTimeout(() => {
        gameRef.child("phase").get().then(s => { if (s.val() === "jugando") revelar(); });
      }, ms + 120);
    }
    if (G.phase === "revelar" && hostNextSeq !== seq) {
      hostNextSeq = seq;
      setTimeout(() => siguienteRonda(), 6000);
    }
  }

  function revelar() {
    if (!IC.room.isHost() || G.phase !== "jugando") return;
    const A = G.answers || {};
    const letra = normal(G.letra || "");
    const a1 = A.p1 || {}, a2 = A.p2 || {};
    const scores = Object.assign({ p1: 0, p2: 0 }, G.scores);
    const detalle = { p1: {}, p2: {} };
    let r1 = 0, r2 = 0;
    CATS.forEach((_, i) => {
      const v1 = normal(a1[i] || ""), v2 = normal(a2[i] || "");
      const ok1 = v1.length > 0 && v1[0] === letra;
      const ok2 = v2.length > 0 && v2[0] === letra;
      let p1 = 0, p2 = 0;
      if (ok1) p1 = (ok2 && v1 === v2) ? 50 : 100;
      if (ok2) p2 = (ok1 && v1 === v2) ? 50 : 100;
      detalle.p1[i] = p1; detalle.p2[i] = p2; r1 += p1; r2 += p2;
    });
    scores.p1 += r1; scores.p2 += r2;
    gameRef.update({ phase: "revelar", scores, detalle });
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
      phase: "jugando", round: next, letra: letraAlAzar(),
      answers: {}, bastaBy: null, deadline: null, detalle: null,
      seq: (G.seq || 0) + 1
    });
  }

  /* --- Acciones del jugador ------------------------------------------------ */
  function escribiendo() {
    clearTimeout(debTimer);
    debTimer = setTimeout(guardarRespuestas, 260);
  }
  function guardarRespuestas() {
    const obj = {};
    inputs.forEach((inp, i) => { const v = inp.value.trim(); if (v) obj[i] = v; });
    gameRef.child("answers/" + mySlot).set(obj);
  }
  function tocarBasta() {
    if (G.phase !== "jugando" || G.bastaBy) return;
    guardarRespuestas();
    if (IC.audio) IC.audio.coin();
    gameRef.update({ bastaBy: mySlot });
  }
  function bloquear() {
    if (locked) return;
    locked = true;
    clearInterval(lockInterval); lockInterval = null;
    guardarRespuestas();
    inputs.forEach(inp => inp.disabled = true);
    const b = refs.basta; if (b) b.disabled = true;
  }

  /* =========================================================================
     SKELETON + UPDATE
     ========================================================================= */
  function construirSkeleton() {
    cont.innerHTML = `
      <div class="bs-head">
        <span class="bs-round" id="bs-round">Ronda 1/${RONDAS}</span>
        <span class="bs-status" id="bs-status"></span>
      </div>
      <div class="bs-scores" id="bs-scores"></div>
      <div class="bs-letra-wrap"><span class="bs-letra" id="bs-letra">A</span></div>
      <div class="bs-form" id="bs-form">
        ${CATS.map((c, i) => `
          <label class="bs-row">
            <span class="bs-cat">${c}</span>
            <input class="input bs-inp" data-i="${i}" maxlength="20" autocomplete="off" placeholder="…" />
          </label>`).join("")}
      </div>
      <button class="btn btn--amarillo bs-basta" id="bs-basta">¡BASTA! ✋</button>
      <div class="bs-reveal hidden" id="bs-reveal"></div>`;
    refs = {
      round: id("bs-round"), status: id("bs-status"), scores: id("bs-scores"),
      letra: id("bs-letra"), form: id("bs-form"), basta: id("bs-basta"),
      reveal: id("bs-reveal")
    };
    inputs = Array.from(cont.querySelectorAll(".bs-inp"));
    inputs.forEach(inp => inp.addEventListener("input", escribiendo));
    refs.basta.onclick = tocarBasta;
  }

  function nuevaRondaLocal() {
    locked = false;
    clearInterval(lockInterval); lockInterval = null;
    inputs.forEach(inp => { inp.value = ""; inp.disabled = false; });
    refs.basta.disabled = false;
    refs.reveal.classList.add("hidden");
    refs.form.classList.remove("hidden");
    refs.basta.classList.remove("hidden");
  }

  function update() {
    if (!G.phase) return;

    // ¿Ronda nueva? (seq cambió) → reiniciar inputs locales.
    if (G.phase === "jugando" && seqLocal !== G.seq) {
      seqLocal = G.seq;
      nuevaRondaLocal();
    }
    if (G.phase !== fasePrev) {
      fasePrev = G.phase;
      if (G.phase === "revelar" && IC.audio) IC.audio.correct();
    }
    if (G.ganador && G.ganador !== ganadorPrev) {
      ganadorPrev = G.ganador;
      if (IC.audio) (G.ganador === mySlot ? IC.audio.win() : (G.ganador === "empate" ? IC.audio.coin() : IC.audio.lose()));
    }

    refs.round.textContent = `Ronda ${Math.min(G.round || 1, RONDAS)}/${RONDAS}`;
    refs.letra.textContent = G.letra || "?";
    pintarScores();
    pintarStatus();

    if (G.phase === "revelar" || G.phase === "fin") {
      refs.form.classList.add("hidden");
      refs.basta.classList.add("hidden");
      pintarReveal();
    }
  }

  function pintarScores() {
    const s = G.scores || { p1: 0, p2: 0 };
    refs.scores.innerHTML =
      `<span class="bs-sc p1">${IC.player.html(av("p1"), 20)} ${s.p1}</span>
       <span class="bs-sc p2">${s.p2} ${IC.player.html(av("p2"), 20)}</span>`;
  }

  function pintarStatus() {
    if (G.phase !== "jugando") { refs.status.textContent = ""; return; }
    if (!G.bastaBy) { refs.status.textContent = "¡Completá y tocá BASTA!"; return; }
    // hay basta: mostrar quién y cuenta regresiva
    const nom = G.bastaBy === mySlot ? "Vos" : (IC.room.players[G.bastaBy] ? esc(IC.room.players[G.bastaBy].nick) : "El otro");
    if (G.deadline) {
      const seg = Math.max(0, Math.ceil((G.deadline - Date.now()) / 1000));
      refs.status.innerHTML = `✋ ${nom} tocó basta · <b class="bs-cd">${seg}s</b>`;
      refs.status.classList.add("urgente");
      // arrancar el bloqueo local al llegar a 0 (una vez)
      if (!lockInterval && !locked) {
        lockInterval = setInterval(() => {
          const s2 = Math.max(0, Math.ceil((G.deadline - Date.now()) / 1000));
          const cd = refs.status.querySelector(".bs-cd"); if (cd) cd.textContent = s2 + "s";
          if (Date.now() >= G.deadline) bloquear();
        }, 250);
      }
    } else {
      refs.status.textContent = `✋ ${nom} tocó basta…`;
    }
  }

  function pintarReveal() {
    const det = G.detalle || { p1: {}, p2: {} };
    const A = G.answers || {}; const a1 = A.p1 || {}, a2 = A.p2 || {};
    const nom = (s) => (IC.room.players[s] ? esc(IC.room.players[s].nick) : (s === "p1" ? "P1" : "P2"));
    let filas = CATS.map((c, i) => {
      const cell = (a, det, slot) => {
        const val = a[i] ? esc(a[i]) : "—";
        const pts = (det[i] || 0);
        const cls = pts >= 100 ? "full" : (pts > 0 ? "half" : "zero");
        return `<td class="bs-ans ${cls} ${slot}">${val}<span class="bs-pts">${pts}</span></td>`;
      };
      return `<tr><th>${c}</th>${cell(a1, det.p1, "p1")}${cell(a2, det.p2, "p2")}</tr>`;
    }).join("");

    let head = `<table class="bs-tabla"><tr><th></th><th class="p1">${nom("p1")}</th><th class="p2">${nom("p2")}</th></tr>${filas}</table>`;

    if (G.phase === "fin") {
      const won = G.ganador === mySlot, emp = G.ganador === "empate";
      head += `<div class="bs-fin">
          <div class="bs-fin-tit">${emp ? "🤝 ¡Empate!" : (won ? "🏆 ¡Ganaste!" : "💀 Perdiste")}</div>
          <button class="btn" id="bs-rev">🔁 Revancha</button>
          <button class="btn btn--ghost" id="bs-menu">Volver al menú</button>
        </div>`;
    } else {
      head += `<p class="bs-next muted center">Siguiente ronda…</p>`;
    }
    refs.reveal.innerHTML = head;
    refs.reveal.classList.remove("hidden");
    if (G.phase === "fin") {
      id("bs-rev").onclick = () => { ganadorPrev = null; fasePrev = null; seqLocal = null; gameRef.remove(); };
      id("bs-menu").onclick = () => IC.room.backToMenu();
    }
  }

  /* --- helpers ------------------------------------------------------------- */
  function id(x) { return document.getElementById(x); }
  function av(slot) { const p = IC.room.players[slot]; return p ? p.avatar : "🎮"; }
  function hostNow() { return Date.now(); }
  function normal(s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ]/g, "").trim(); }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  IC.games.register({
    id: "basta",
    nombre: "Basta! (Tutti Frutti)",
    emoji: "🅰️",
    desc: "Letra al azar y a completar categorías · clásico",
    disponible: true,
    crear, destroy
  });
})();
