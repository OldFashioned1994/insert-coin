/* ============================================================================
   INSERT COIN — navalterror.js  (juego: Batalla Naval del Terror)
   Estrategia para 2. Cada uno esconde su flota de ataúdes en su cementerio;
   por turnos disparan coordenadas al cementerio rival. Hunde toda la flota
   enemiga para ganar. Estética neón/terror.
   ============================================================================ */

(function () {
  const GRID = 8, NC = GRID * GRID;
  const FLOTA = [4, 3, 3, 2];                 // tamaños de los ataúdes
  const TOTAL = FLOTA.reduce((a, b) => a + b, 0);   // celdas de barco totales (12)

  let cont, gameRef, listener, G = {}, mySlot;
  let flotaEnviada = false, ganadorPrev = null;
  const otro = (s) => (s === "p1" ? "p2" : "p1");

  /* --- Arranque ----------------------------------------------------------- */
  function crear(container) {
    cont = container;
    mySlot = IC.room.mySlot;
    gameRef = IC.room.gameRef();
    flotaEnviada = false; ganadorPrev = null;
    cont.innerHTML = `<p class="muted center" style="margin:auto">Cargando…</p>`;

    listener = gameRef.on("value", (snap) => {
      G = snap.val() || {};
      if (IC.room.isHost() && !G.phase) { init(); return; }
      autoColocar();
      if (IC.room.isHost()) hostTransiciones();
      render();
    });
    if (IC.room.isHost()) {
      gameRef.child("phase").get().then(s => { if (!s.exists()) init(); }).catch(() => {});
    }
    return { destroy };
  }

  function init() {
    gameRef.set({ phase: "coloc", ready: { p1: false, p2: false }, turn: "p1", ganador: null });
  }

  function destroy() {
    if (gameRef && listener) gameRef.off("value", listener);
    G = {}; flotaEnviada = false; ganadorPrev = null;
  }

  /* --- El anfitrión mueve las fases --------------------------------------- */
  function hostTransiciones() {
    if (G.phase === "coloc" && G.ready && G.ready.p1 && G.ready.p2) {
      gameRef.update({ phase: "batalla", turn: "p1" });
    }
  }

  /* --- Colocación automática de mi flota (con reacomodar) ----------------- */
  function autoColocar() {
    if (G.phase !== "coloc") return;
    if ((!G.fleet || !G.fleet[mySlot]) && !flotaEnviada) {
      flotaEnviada = true;
      gameRef.child(`fleet/${mySlot}`).set(placeFleet());
    }
  }
  function reacomodar() {
    if (G.ready && G.ready[mySlot]) return;   // ya confirmé
    gameRef.child(`fleet/${mySlot}`).set(placeFleet());
    if (IC.audio) IC.audio.click();
  }
  function listo() { gameRef.child(`ready/${mySlot}`).set(true); if (IC.audio) IC.audio.coin(); }

  function placeFleet() {
    const g = Array(NC).fill(".");
    for (const size of FLOTA) {
      let ok = false, tries = 0;
      while (!ok && tries < 300) {
        tries++;
        const horiz = Math.random() < 0.5;
        const r = Math.floor(Math.random() * GRID), c = Math.floor(Math.random() * GRID);
        const cells = []; let libre = true;
        for (let k = 0; k < size; k++) {
          const rr = r + (horiz ? 0 : k), cc = c + (horiz ? k : 0);
          if (rr >= GRID || cc >= GRID) { libre = false; break; }
          if (g[rr * GRID + cc] !== ".") { libre = false; break; }
          cells.push(rr * GRID + cc);
        }
        if (libre) { cells.forEach(i => g[i] = "X"); ok = true; }
      }
    }
    return g.join("");
  }

  /* --- Disparo ------------------------------------------------------------ */
  function disparar(idx) {
    if (G.phase !== "batalla" || G.turn !== mySlot || G.ganador) return;
    const mis = (G.shots && G.shots[mySlot]) || ".".repeat(NC);
    if (mis[idx] !== ".") return;                       // ya disparé ahí
    const flotaEnemiga = (G.fleet && G.fleet[otro(mySlot)]) || ".".repeat(NC);
    const tocado = flotaEnemiga[idx] === "X";
    const arr = mis.split(""); arr[idx] = tocado ? "x" : "o";
    const nuevo = arr.join("");
    const hits = arr.filter(x => x === "x").length;
    if (IC.audio) (tocado ? IC.audio.correct() : IC.audio.wrong());
    const up = {};
    up[`shots/${mySlot}`] = nuevo;
    up.turn = otro(mySlot);                             // se pasa el turno (haya tocado o no)
    if (hits >= TOTAL) { up.ganador = mySlot; }
    gameRef.update(up);
    if (hits >= TOTAL) IC.scoreboard.registrarVictoria(mySlot);
  }

  /* --- Dibujo ------------------------------------------------------------- */
  function render() {
    if (!G.phase) { cont.innerHTML = `<p class="muted center" style="margin:auto">Preparando cementerio…</p>`; return; }

    if (G.ganador !== ganadorPrev) {
      ganadorPrev = G.ganador;
      if (G.ganador && IC.audio) (G.ganador === mySlot ? IC.audio.win() : IC.audio.lose());
    }

    if (G.phase === "coloc") return vistaColoc();
    if (G.phase === "batalla") return vistaBatalla();
    if (G.phase === "fin" || G.ganador) return vistaBatalla();   // muestra final sobre el tablero
  }

  function vistaColoc() {
    const miFlota = (G.fleet && G.fleet[mySlot]) || ".".repeat(NC);
    const yoListo = G.ready && G.ready[mySlot];
    const otroListo = G.ready && G.ready[otro(mySlot)];
    let html = `<div class="nv-titulo">⚰️ Acomodá tu flota</div>
      <p class="muted small center">Se acomodan solas. Tocá "Reacomodar" hasta que te gusten y confirmá.</p>
      ${grid(miFlota, null, "propio", false)}`;
    if (yoListo) {
      html += `<p class="nv-estado center mt">${otroListo ? "¡Listos! Empezando…" : "Esperando al otro jugador…"}</p>`;
    } else {
      html += `<div class="nv-acciones">
        <button class="btn btn--ghost" id="nv-shuffle">🎲 Reacomodar</button>
        <button class="btn" id="nv-listo">✔ Listo</button>
      </div>`;
    }
    cont.innerHTML = html;
    if (!yoListo) {
      cont.querySelector("#nv-shuffle").onclick = reacomodar;
      cont.querySelector("#nv-listo").onclick = listo;
    }
  }

  function vistaBatalla() {
    const misShots = (G.shots && G.shots[mySlot]) || ".".repeat(NC);
    const shotsEnemigo = (G.shots && G.shots[otro(mySlot)]) || ".".repeat(NC);
    const miFlota = (G.fleet && G.fleet[mySlot]) || ".".repeat(NC);
    const miTurno = !G.ganador && G.turn === mySlot;

    const misHits = misShots.split("").filter(x => x === "x").length;
    const suHits = shotsEnemigo.split("").filter(x => x === "x").length;

    const estado = G.ganador
      ? (G.ganador === mySlot ? "¡Hundiste su flota! 🏆" : "Hundieron tu flota 💀")
      : (miTurno ? "Tu turno: dispará 🎯" : "Turno del otro…");

    let html = `<div class="nv-top ${miTurno ? "activo" : ""} ${mySlot}">${estado}</div>
      <div class="nv-marcas"><span>Enemigo: ${misHits}/${TOTAL} 💥</span><span>Vos: ${TOTAL - suHits}/${TOTAL} ⚰️</span></div>
      <div class="nv-label">🎯 Cementerio rival — dispará</div>
      ${grid(null, misShots, "enemigo", miTurno)}
      <div class="nv-label mt">⚰️ Tu cementerio</div>
      ${grid(miFlota, shotsEnemigo, "propio-mini", false)}`;
    if (G.ganador) {
      html += `<div class="nv-fin">
        <button class="btn" id="nv-rev">🔁 Revancha</button>
        <button class="btn btn--ghost" id="nv-menu">Volver al menú</button>
      </div>`;
    }
    cont.innerHTML = html;

    if (miTurno) cont.querySelectorAll(".nv-enemigo .nv-cell:not(.disparada)").forEach(b =>
      b.onclick = () => disparar(parseInt(b.dataset.i, 10)));
    if (G.ganador) {
      cont.querySelector("#nv-rev").onclick = () => { flotaEnviada = false; ganadorPrev = null; gameRef.remove(); };
      cont.querySelector("#nv-menu").onclick = () => IC.room.backToMenu();
    }
  }

  /** Dibuja una grilla. flota (X/.) para mostrar barcos propios; shots (./o/x)
      para superponer disparos. tipo: "propio" | "enemigo" | "propio-mini". */
  function grid(flota, shots, tipo, activa) {
    let cells = "";
    for (let i = 0; i < NC; i++) {
      let cls = "nv-cell", cont2 = "";
      if (tipo === "enemigo") {
        const s = shots ? shots[i] : ".";
        if (s === "x") { cls += " tocado disparada"; cont2 = "💥"; }
        else if (s === "o") { cls += " agua disparada"; cont2 = "•"; }
        else if (!activa) cls += " off";
      } else { // propio / propio-mini
        const barco = flota && flota[i] === "X";
        const s = shots ? shots[i] : ".";
        if (barco && s === "x") { cls += " barco-tocado"; cont2 = "💥"; }
        else if (barco) { cls += " barco"; }
        else if (s === "x" || s === "o") { cls += " agua"; cont2 = "•"; }
      }
      cells += `<button class="${cls}" data-i="${i}" ${tipo === "enemigo" && activa ? "" : "disabled"}>${cont2}</button>`;
    }
    return `<div class="nv-grid nv-${tipo}">${cells}</div>`;
  }

  /* --- Registro ----------------------------------------------------------- */
  IC.games.register({
    id: "navalterror",
    nombre: "Batalla Naval del Terror",
    emoji: "⚓",
    desc: "Escondé tu flota y hundí la del rival · estrategia",
    disponible: true,
    crear, destroy
  });
})();
