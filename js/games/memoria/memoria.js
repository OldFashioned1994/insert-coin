/* ============================================================================
   INSERT COIN — memoria.js  (juego: Memoria Macabra)
   Juego de memoria por turnos para 2. Se dan vuelta 2 cartas: si son el mismo
   personaje de terror, te la quedás y seguís; si no, se vuelven a tapar y pasa
   el turno. Gana quien junta más pares. Usa los avatares como cartas.
   ============================================================================ */

(function () {
  const IDS = ["jason", "alien", "chucky", "pennywise", "freddy", "pinhead", "ghostface", "myers"]; // 8 pares
  const N = IDS.length * 2;                 // 16 cartas (4x4)

  let cont, gameRef, listener, G = {}, mySlot, ganadorPrev = null;
  const otro = (s) => (s === "p1" ? "p2" : "p1");

  function crear(container) {
    cont = container;
    mySlot = IC.room.mySlot;
    gameRef = IC.room.gameRef();
    ganadorPrev = null;
    cont.innerHTML = `<p class="muted center" style="margin:auto">Cargando…</p>`;
    listener = gameRef.on("value", (snap) => {
      G = snap.val() || {};
      if (IC.room.isHost() && !G.deck) { init(); return; }
      render();
    });
    if (IC.room.isHost()) {
      gameRef.child("deck").get().then(s => { if (!s.exists()) init(); }).catch(() => {});
    }
    return { destroy };
  }

  function init() {
    const deck = shuffle(IDS.concat(IDS));   // cada avatar dos veces, barajado
    gameRef.set({ deck, matched: ".".repeat(N), flipped: [], turn: "p1", pares: { p1: 0, p2: 0 }, ganador: null });
  }

  function destroy() {
    if (gameRef && listener) gameRef.off("value", listener);
    G = {}; ganadorPrev = null;
  }

  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  /* --- Dar vuelta una carta ----------------------------------------------- */
  function voltear(i) {
    const flipped = G.flipped || [];
    if (G.ganador || G.turn !== mySlot) return;
    if (G.matched[i] !== "." || flipped.indexOf(i) >= 0 || flipped.length >= 2) return;

    if (flipped.length === 0) {
      if (IC.audio) IC.audio.click();
      gameRef.update({ flipped: [i] });
      return;
    }
    // Segunda carta
    const j = flipped[0];
    const par = G.deck[i] === G.deck[j];
    if (par) {                                     // ¡par! te la quedás y seguís
      const m = G.matched.split(""); const f = mySlot === "p1" ? "1" : "2";
      m[i] = f; m[j] = f;
      const pares = Object.assign({ p1: 0, p2: 0 }, G.pares); pares[mySlot]++;
      const ganador = m.join("").indexOf(".") === -1
        ? (pares.p1 === pares.p2 ? "empate" : (pares.p1 > pares.p2 ? "p1" : "p2")) : null;
      if (IC.audio) IC.audio.correct();
      gameRef.update({ flipped: [], matched: m.join(""), pares, ganador });
      if (ganador && ganador !== "empate") IC.scoreboard.registrarVictoria(ganador);
    } else {                                       // no coinciden: mostrar y tapar
      if (IC.audio) IC.audio.wrong();
      gameRef.update({ flipped: [j, i] });         // ambas visibles
      setTimeout(() => { gameRef.update({ flipped: [], turn: otro(mySlot) }); }, 1100);
    }
  }

  /* --- Dibujo ------------------------------------------------------------- */
  function render() {
    if (!G.deck) { cont.innerHTML = `<p class="muted center" style="margin:auto">Barajando…</p>`; return; }

    if (G.ganador !== ganadorPrev) {
      ganadorPrev = G.ganador;
      if (G.ganador && G.ganador !== "empate" && IC.audio) (G.ganador === mySlot ? IC.audio.win() : IC.audio.lose());
    }

    const flipped = G.flipped || [];
    const miTurno = !G.ganador && G.turn === mySlot && flipped.length < 2;
    const p = G.pares || { p1: 0, p2: 0 };
    const estado = G.ganador
      ? (G.ganador === "empate" ? "¡Empate! 🤝" : (G.ganador === mySlot ? "¡Ganaste! 🏆" : "Perdiste 😅"))
      : (G.turn === mySlot ? "Tu turno" : "Turno del otro…");

    let html = `<div class="mm-hud">
        <span class="mm-p p1">${IC.player.html(playerAv("p1"), 22)} ${p.p1}</span>
        <span class="mm-estado ${G.turn === mySlot && !G.ganador ? "activo " + mySlot : ""}">${estado}</span>
        <span class="mm-p p2">${p.p2} ${IC.player.html(playerAv("p2"), 22)}</span>
      </div><div class="mm-grid">`;
    for (let i = 0; i < N; i++) {
      const m = G.matched[i];
      const abierta = m !== "." || flipped.indexOf(i) >= 0;
      let cls = "mm-card";
      if (m === "1") cls += " match p1"; else if (m === "2") cls += " match p2"; else if (abierta) cls += " open";
      const inner = abierta
        ? `<img src="${IC.player.src(G.deck[i])}" alt="" />`
        : `<span class="mm-back">?</span>`;
      const dis = (miTurno && !abierta) ? "" : "disabled";
      html += `<button class="${cls}" data-i="${i}" ${dis}>${inner}</button>`;
    }
    html += `</div>`;
    if (G.ganador) {
      html += `<div class="mm-fin">
        <button class="btn" id="mm-rev">🔁 Revancha</button>
        <button class="btn btn--ghost" id="mm-menu">Volver al menú</button>
      </div>`;
    }
    cont.innerHTML = html;

    if (miTurno) cont.querySelectorAll(".mm-card:not([disabled])").forEach(b =>
      b.onclick = () => voltear(parseInt(b.dataset.i, 10)));
    if (G.ganador) {
      cont.querySelector("#mm-rev").onclick = () => { ganadorPrev = null; gameRef.remove(); };
      cont.querySelector("#mm-menu").onclick = () => IC.room.backToMenu();
    }
  }

  function playerAv(slot) { const p = IC.room.players[slot]; return p ? p.avatar : "🎮"; }

  IC.games.register({
    id: "memoria",
    nombre: "Memoria Macabra",
    emoji: "🃏",
    desc: "Encontrá los pares de monstruos · memoria",
    disponible: true,
    crear, destroy
  });
})();
