/* ============================================================================
   INSERT COIN — ruleta.js  (juego: Ruleta del Diablo)
   Duelo de tensión estilo ruleta rusa, pero SOBRENATURAL y sin sangre.
   Un revólver maldito se carga con balas "malditas" y "vacías" (se anuncia
   cuántas de cada una, como en Buckshot Roulette). En tu turno elegís:
     · 🔫 Apuntar al rival  → si sale maldita, le sacás una vida; siempre pasa
                              el turno al rival.
     · 😰 Probar suerte (vos) → si sale VACÍA, seguís jugando (ventaja); si
                              sale maldita, perdés una vida y pasa el turno.
   Cuando se vacía el tambor, se recarga con una cantidad nueva al azar.
   Cada uno tiene 2 almas. Pierde el que se queda sin almas.

   El anfitrión (p1) es el árbitro: guarda solo los CONTADORES (malditas/vacías
   que quedan) y sortea cada disparo al momento. Así no hay una secuencia
   pre-guardada que el rival pueda espiar por consola.
   ============================================================================ */

(function () {
  const ALMAS = 2;                          // vidas por jugador
  const TAMBOR = 6;                         // recámaras por carga
  const REVOLVER = "assets/games/revolver.png";
  const MONSTRUO = "assets/games/jumpscare2.png";

  let cont, gameRef, listener, G = {}, mySlot, ganadorPrev = null;
  let flashSeq = null, flashTimer = null, resolviendo = false;
  const otro = (s) => (s === "p1" ? "p2" : "p1");

  function crear(container) {
    cont = container;
    mySlot = IC.room.mySlot;
    gameRef = IC.room.gameRef();
    ganadorPrev = null; flashSeq = null; resolviendo = false;
    cont.innerHTML = `<p class="muted center" style="margin:auto">Cargando el tambor…</p>`;
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

  // Sortea una carga: entre 1 y 3 malditas, el resto vacías (siempre queda de las dos).
  function nuevaCarga() {
    const live = 1 + Math.floor(Math.random() * 3);   // 1..3
    return { live, blank: TAMBOR - live };
  }

  function init() {
    const c = nuevaCarga();
    gameRef.set({
      phase: "jugando",
      almas: { p1: ALMAS, p2: ALMAS },
      turn: "p1",
      liveLeft: c.live, blankLeft: c.blank,
      loadInfo: { live: c.live, blank: c.blank, seq: 1 },
      pending: null, lastShot: null, ganador: null, seq: 1
    });
  }

  function destroy() {
    if (gameRef && listener) gameRef.off("value", listener);
    clearTimeout(flashTimer);
    G = {}; ganadorPrev = null;
  }

  /* --- Árbitro: resuelve el disparo pedido --------------------------------- */
  function hostTick() {
    if (!G.pending || resolviendo || G.ganador) return;
    resolviendo = true;

    const by = G.pending.by, target = G.pending.target;   // target: "rival" | "yo"
    const rival = otro(by);
    let live = G.liveLeft, blank = G.blankLeft;
    const total = live + blank;
    const outcome = (Math.random() * total < live) ? "live" : "blank";
    if (outcome === "live") live--; else blank--;

    const almas = Object.assign({ p1: ALMAS, p2: ALMAS }, G.almas);
    let turn;
    if (target === "rival") {
      if (outcome === "live") almas[rival]--;
      turn = rival;                                        // siempre pasa el turno
    } else { // "yo"
      if (outcome === "live") { almas[by]--; turn = rival; }
      else { turn = by; }                                  // vacía en vos → seguís
    }

    let ganador = almas.p1 <= 0 ? "p2" : (almas.p2 <= 0 ? "p1" : null);

    const seq = (G.seq || 0) + 1;
    let liveLeft = live, blankLeft = blank;
    let loadInfo = G.loadInfo;
    if (!ganador && live + blank === 0) {                  // tambor vacío → recargar
      const c = nuevaCarga();
      liveLeft = c.live; blankLeft = c.blank;
      loadInfo = { live: c.live, blank: c.blank, seq };
    }

    gameRef.update({
      liveLeft, blankLeft, almas, turn, loadInfo,
      pending: null,
      lastShot: { by, target, outcome, seq },
      ganador: ganador || null,
      phase: ganador ? "fin" : "jugando"
    }).then(() => {
      resolviendo = false;
      if (ganador) IC.scoreboard.registrarVictoria(ganador);
    }).catch(() => { resolviendo = false; });
  }

  /* --- El jugador activo pide un disparo ----------------------------------- */
  function disparar(target) {
    if (G.ganador || G.turn !== mySlot || G.pending) return;
    if (IC.audio) IC.audio.click();
    gameRef.child("pending").transaction(cur => (cur == null ? { by: mySlot, target } : undefined));
  }

  /* --- Dibujo -------------------------------------------------------------- */
  function render() {
    if (!G.phase) { cont.innerHTML = `<p class="muted center" style="margin:auto">Cargando…</p>`; return; }

    // Revelado del disparo (flash local, no toca Firebase).
    // La primera vez sólo sincronizo (no muestro flash de un disparo viejo).
    if (flashSeq === null) {
      flashSeq = G.lastShot ? G.lastShot.seq : 0;
    } else if (G.lastShot && G.lastShot.seq !== flashSeq) {
      flashSeq = G.lastShot.seq;
      if (IC.audio) (G.lastShot.outcome === "live" ? IC.audio.wrong() : IC.audio.click());
      clearTimeout(flashTimer);
      flashTimer = setTimeout(() => { if (cont) render(); }, 1500);
      cont.innerHTML = flashHTML(G.lastShot);
      return;
    }

    if (G.ganador !== ganadorPrev) {
      ganadorPrev = G.ganador;
      if (G.ganador && IC.audio) (G.ganador === mySlot ? IC.audio.win() : IC.audio.lose());
    }

    const a = G.almas || { p1: ALMAS, p2: ALMAS };
    const miTurno = !G.ganador && G.turn === mySlot && !G.pending;

    let html = `<div class="rd-hud">
        <span class="rd-p p1">${IC.player.html(av("p1"), 22)} ${almasHTML(a.p1)}</span>
        <span class="rd-vs">RITUAL</span>
        <span class="rd-p p2">${almasHTML(a.p2)} ${IC.player.html(av("p2"), 22)}</span>
      </div>`;

    // Info del tambor
    html += `<div class="rd-tambor">
        <img class="rd-rev" src="${REVOLVER}" alt="revólver" />
        <div class="rd-carga">
          <span class="rd-live">🔴 ${G.liveLeft} maldita${G.liveLeft === 1 ? "" : "s"}</span>
          <span class="rd-blank">⚪ ${G.blankLeft} vacía${G.blankLeft === 1 ? "" : "s"}</span>
        </div>
      </div>`;

    if (G.ganador) {
      const won = G.ganador === mySlot;
      html += `<div class="rd-fin ${won ? "gano" : "perdio"}">
          <div class="rd-fin-tit">${won ? "🏆 ¡SOBREVIVISTE!" : "💀 Te consumió el ritual"}</div>
          <button class="btn" id="rd-rev-btn">🔁 Revancha</button>
          <button class="btn btn--ghost" id="rd-menu">Volver al menú</button>
        </div>`;
    } else if (miTurno) {
      html += `<div class="rd-estado activo ${mySlot}">Tu turno · elegí</div>
        <div class="rd-acciones">
          <button class="btn btn--magenta" id="rd-rival">🔫 Apuntar al rival</button>
          <button class="btn btn--ghost" id="rd-yo">😰 Probar suerte (vos)</button>
        </div>
        <p class="rd-tip muted">Si te disparás y sale <b>vacía</b>, seguís jugando.</p>`;
    } else {
      const nom = IC.room.players[G.turn] ? IC.room.players[G.turn].nombre : "el rival";
      html += `<div class="rd-estado">${G.pending ? "🎲 Girando el tambor…" : "Turno de " + nom + "…"}</div>`;
    }

    cont.innerHTML = html;

    if (G.ganador) {
      cont.querySelector("#rd-rev-btn").onclick = () => { ganadorPrev = null; flashSeq = null; gameRef.remove(); };
      cont.querySelector("#rd-menu").onclick = () => IC.room.backToMenu();
    } else if (miTurno) {
      cont.querySelector("#rd-rival").onclick = () => disparar("rival");
      cont.querySelector("#rd-yo").onclick = () => disparar("yo");
    }
  }

  function flashHTML(shot) {
    const nom = (s) => (IC.room.players[s] ? IC.room.players[s].nombre : (s === "p1" ? "Jugador 1" : "Jugador 2"));
    const quien = shot.target === "rival" ? `${nom(shot.by)} → ${nom(otro(shot.by))}` : `${nom(shot.by)} probó suerte`;
    if (shot.outcome === "live") {
      return `<div class="rd-flash live" style="background-image:url('${MONSTRUO}')">
          <span class="rd-flash-big">💥 ¡MALDITA!</span>
          <span class="rd-flash-sub">${quien}</span>
        </div>`;
    }
    return `<div class="rd-flash blank">
        <span class="rd-flash-big">…click. vacía</span>
        <span class="rd-flash-sub">${quien}</span>
      </div>`;
  }

  function almasHTML(n) {
    let s = "";
    for (let i = 0; i < ALMAS; i++) s += (i < n) ? "🔥" : "🖤";
    return `<span class="rd-almas">${s}</span>`;
  }

  function av(slot) { const p = IC.room.players[slot]; return p ? p.avatar : "🎮"; }

  IC.games.register({
    id: "ruleta",
    nombre: "Ruleta del Diablo",
    emoji: "🔫",
    desc: "Revólver maldito: apuntá al rival o probá suerte · tensión",
    disponible: true,
    crear, destroy
  });
})();
