/* ============================================================================
   INSERT COIN — reflejos.js  (juego: Reflejos Mortales)
   Duelo de reacción para 2. La pantalla está en rojo: "NO toques todavía".
   En un momento al azar salta un monstruo y todo se pone verde: el primero en
   tocar gana la ronda. Si tocás antes de que aparezca, te adelantaste y perdés.
   Best of 5 (gana el primero en llegar a 3 rondas).

   Justicia de red: cada jugador mide su PROPIA reacción (performance.now desde
   que ve al monstruo hasta que toca). El anfitrión compara los dos tiempos y
   gana el menor. Así nadie tiene ventaja por estar "más cerca" de Firebase.
   ============================================================================ */

(function () {
  const TARGET = 3;                         // rondas para ganar (best of 5)
  const IMGS = ["assets/games/jumpscare2.png", "assets/games/jumpscare1.png"];
  const NO_TAP = 99999;                     // tiempo para el que no llegó a tocar

  let cont, gameRef, listener, G = {}, mySlot, ganadorPrev = null, fasePrev = null;
  let tYa = 0, tYaSeq = null;               // reloj local del "¡ya!" por ronda
  let armTimer = null, failTimer = null, nextTimer = null;
  let armSeq = null, failSeq = null, nextSeq = null, resolviendo = false;
  const otro = (s) => (s === "p1" ? "p2" : "p1");

  function crear(container) {
    cont = container;
    mySlot = IC.room.mySlot;
    gameRef = IC.room.gameRef();
    ganadorPrev = null; fasePrev = null; tYaSeq = null; resolviendo = false;
    armSeq = failSeq = nextSeq = null;
    cont.innerHTML = `<p class="muted center" style="margin:auto">Cargando…</p>`;
    listener = gameRef.on("value", (snap) => {
      G = snap.val() || {};
      if (IC.room.isHost() && !G.phase) { init(); return; }
      if (IC.room.isHost()) hostTick();
      render();
    });
    if (IC.room.isHost()) {
      gameRef.child("phase").get().then(s => { if (!s.exists()) init(); }).catch(() => {});
    }
    return { destroy };
  }

  function init() {
    gameRef.set({
      round: 1, phase: "espera", taps: {}, roundWinner: null, foulBy: null,
      scores: { p1: 0, p2: 0 }, ganador: null, seq: 1
    });
  }

  function destroy() {
    if (gameRef && listener) gameRef.off("value", listener);
    clearTimeout(armTimer); clearTimeout(failTimer); clearTimeout(nextTimer);
    G = {}; ganadorPrev = null; fasePrev = null;
  }

  /* --- Lógica del anfitrión (árbitro) ------------------------------------- */
  function hostTick() {
    const phase = G.phase, seq = G.seq, t = G.taps || {};

    if (phase === "espera") {
      // ¿alguien se adelantó?
      if (t.p1 === -1 || t.p2 === -1) {
        clearTimeout(armTimer);
        if (t.p1 === -1 && t.p2 === -1) resolver("empate", null);
        else { const f = t.p1 === -1 ? "p1" : "p2"; resolver(otro(f), f); }
        return;
      }
      // programar el salto del monstruo (una sola vez por ronda)
      if (armSeq !== seq) {
        armSeq = seq; clearTimeout(armTimer);
        const delay = 1400 + Math.floor(Math.random() * 2800);   // 1.4–4.2s
        armTimer = setTimeout(armar, delay);
      }
    }

    if (phase === "ya") {
      if (failSeq !== seq) {
        failSeq = seq; clearTimeout(failTimer);
        failTimer = setTimeout(rellenarYResolver, 5000);          // por si alguno no toca
      }
      if (t.p1 != null && t.p2 != null && !resolviendo) {
        const a = t.p1, b = t.p2;
        resolver(a < b ? "p1" : (b < a ? "p2" : "empate"), null);
      }
    }

    if (phase === "resultado") {
      if (nextSeq !== seq) {
        nextSeq = seq; clearTimeout(nextTimer);
        nextTimer = setTimeout(() => {
          const next = (G.roundWinner === "empate") ? G.round : G.round + 1;
          startRound(next);
        }, 2600);
      }
    }
  }

  function armar() {
    if (!IC.room.isHost() || G.phase !== "espera") return;
    const t = G.taps || {};
    if (t.p1 === -1 || t.p2 === -1) return;    // se adelantaron justo antes
    gameRef.update({ phase: "ya" });
  }

  function rellenarYResolver() {
    if (!IC.room.isHost() || G.phase !== "ya" || resolviendo) return;
    const t = Object.assign({}, G.taps);
    if (t.p1 == null) t.p1 = NO_TAP;
    if (t.p2 == null) t.p2 = NO_TAP;
    resolver(t.p1 < t.p2 ? "p1" : (t.p2 < t.p1 ? "p2" : "empate"), null);
  }

  function resolver(winner, foulBy) {
    if (!IC.room.isHost() || resolviendo || G.roundWinner) return;
    resolviendo = true;
    clearTimeout(armTimer); clearTimeout(failTimer);
    const scores = Object.assign({ p1: 0, p2: 0 }, G.scores);
    if (winner !== "empate") scores[winner]++;
    const matchWinner = scores.p1 >= TARGET ? "p1" : (scores.p2 >= TARGET ? "p2" : null);
    gameRef.update({
      roundWinner: winner, foulBy: foulBy || null, scores,
      phase: matchWinner ? "fin" : "resultado", ganador: matchWinner || null
    }).then(() => { if (matchWinner) IC.scoreboard.registrarVictoria(matchWinner); });
  }

  function startRound(n) {
    if (!IC.room.isHost()) return;
    resolviendo = false;
    const seq = (G.seq || 0) + 1;
    gameRef.update({ round: n, phase: "espera", taps: {}, roundWinner: null, foulBy: null, seq });
  }

  /* --- Toques del jugador -------------------------------------------------- */
  function tocar() {
    const t = G.taps || {};
    if (t[mySlot] != null) return;                       // ya tocaste esta ronda
    if (G.phase === "espera") {                          // ¡te adelantaste!
      if (IC.audio) IC.audio.wrong();
      escribirTap(-1);
    } else if (G.phase === "ya") {
      const ms = Math.max(1, Math.round(performance.now() - tYa));
      if (IC.audio) IC.audio.click();
      escribirTap(ms);
    }
  }
  function escribirTap(val) {
    gameRef.child("taps").child(mySlot).transaction(cur => (cur == null ? val : undefined));
  }

  /* --- Dibujo -------------------------------------------------------------- */
  function render() {
    if (!G.phase) { cont.innerHTML = `<p class="muted center" style="margin:auto">Preparando…</p>`; return; }

    // sonido del "salto" y del final (una sola vez)
    if (G.phase !== fasePrev) {
      if (G.phase === "ya" && IC.audio) IC.audio.wrong();
      fasePrev = G.phase;
    }
    if (G.ganador !== ganadorPrev) {
      ganadorPrev = G.ganador;
      if (G.ganador && IC.audio) (G.ganador === mySlot ? IC.audio.win() : IC.audio.lose());
    }
    if (G.phase === "ya" && tYaSeq !== G.seq) { tYaSeq = G.seq; tYa = performance.now(); }

    const sc = G.scores || { p1: 0, p2: 0 };
    const t = G.taps || {};
    const yaToque = t[mySlot] != null;

    let html = `<div class="rf-hud">
        <span class="rf-p p1">${IC.player.html(av("p1"), 22)} <b>${sc.p1}</b></span>
        <span class="rf-ronda">Ronda ${Math.min(G.round, 5)}/5</span>
        <span class="rf-p p2"><b>${sc.p2}</b> ${IC.player.html(av("p2"), 22)}</span>
      </div>`;

    if (G.phase === "espera") {
      const msg = yaToque ? "🩸 Te adelantaste…" : "Cuando aparezca el monstruo…";
      html += `<button class="rf-stage esperando ${yaToque ? "muerto" : ""}">
          <span class="rf-eyebrow">ESPERÁ</span>
          <span class="rf-big">✋ NO TOQUES</span>
          <span class="rf-sub">${msg}</span>
        </button>`;
    } else if (G.phase === "ya") {
      const img = IMGS[(G.round - 1) % IMGS.length];
      const sub = yaToque ? `⚡ ${t[mySlot]} ms` : "¡TOCÁ AHORA!";
      html += `<button class="rf-stage ya" style="background-image:url('${img}')">
          <span class="rf-flash">👹 ¡TOCÁ!</span>
          <span class="rf-sub">${sub}</span>
        </button>`;
    } else if (G.phase === "resultado" || G.phase === "fin") {
      html += resultadoHTML();
    }

    cont.innerHTML = html;

    if (G.phase === "espera" || G.phase === "ya") {
      const stage = cont.querySelector(".rf-stage");
      if (stage) stage.onclick = tocar;
    }
    if (G.phase === "fin") {
      cont.querySelector("#rf-rev").onclick = () => { ganadorPrev = null; gameRef.remove(); };
      cont.querySelector("#rf-menu").onclick = () => IC.room.backToMenu();
    }
  }

  function resultadoHTML() {
    const rw = G.roundWinner, t = G.taps || {};
    const nom = (s) => (IC.room.players[s] ? IC.room.players[s].nombre : (s === "p1" ? "Jugador 1" : "Jugador 2"));
    const tiempo = (s) => (t[s] === -1 ? "se adelantó" : (t[s] >= NO_TAP || t[s] == null ? "no tocó" : t[s] + " ms"));

    let titulo, clase;
    if (G.phase === "fin") {
      const won = G.ganador === mySlot;
      titulo = won ? "🏆 ¡GANASTE EL DUELO!" : "💀 Perdiste el duelo";
      clase = won ? "gano" : "perdio";
    } else if (rw === "empate") {
      titulo = "🤝 Empate — se repite"; clase = "empate";
    } else {
      const won = rw === mySlot;
      titulo = won ? "✅ Ganaste la ronda" : (G.foulBy === mySlot ? "🩸 Te adelantaste" : "❌ Perdiste la ronda");
      clase = won ? "gano" : "perdio";
    }

    let h = `<div class="rf-result ${clase}"><div class="rf-res-tit">${titulo}</div>
      <div class="rf-tiempos">
        <span class="p1">${nom("p1")}: ${tiempo("p1")}</span>
        <span class="p2">${nom("p2")}: ${tiempo("p2")}</span>
      </div></div>`;

    if (G.phase === "fin") {
      h += `<div class="rf-fin">
        <button class="btn" id="rf-rev">🔁 Revancha</button>
        <button class="btn btn--ghost" id="rf-menu">Volver al menú</button>
      </div>`;
    } else {
      h += `<p class="rf-next muted center">Siguiente ronda…</p>`;
    }
    return h;
  }

  function av(slot) { const p = IC.room.players[slot]; return p ? p.avatar : "🎮"; }

  IC.games.register({
    id: "reflejos",
    nombre: "Reflejos Mortales",
    emoji: "⚡",
    desc: "El primero en tocar al monstruo gana · reacción",
    disponible: true,
    crear, destroy
  });
})();
