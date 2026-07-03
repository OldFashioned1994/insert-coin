/* ============================================================================
   INSERT COIN — conecta4.js  (juego: 4 en Línea Maldito)
   Estrategia por turnos para 2. Cada uno suelta fichas en una columna; gana
   quien alinea 4 (horizontal, vertical o diagonal). Estética neón/terror.
   Usa la cáscara del hub: sala, marcador, Firebase (rooms/<code>/game).
   ============================================================================ */

(function () {
  const COLS = 7, ROWS = 6, N = COLS * ROWS;

  let cont, gameRef, listener, G = {}, mySlot, ganadorPrev = null;

  /* --- Arranque ----------------------------------------------------------- */
  function crear(container) {
    cont = container;
    mySlot = IC.room.mySlot;
    gameRef = IC.room.gameRef();
    ganadorPrev = null;
    cont.innerHTML = `<p class="muted center" style="margin:auto">Cargando…</p>`;

    listener = gameRef.on("value", (snap) => {
      G = snap.val() || {};
      if (IC.room.isHost() && !G.board) { init(); return; }   // el anfitrión arma el tablero
      render();
    });
    // Plan B del anfitrión (por si el evento no llega).
    if (IC.room.isHost()) {
      gameRef.child("board").get().then(s => { if (!s.exists()) init(); }).catch(() => {});
    }
    return { destroy };
  }

  function init() {
    gameRef.set({ board: ".".repeat(N), turn: "p1", ganador: null });
  }

  function destroy() {
    if (gameRef && listener) gameRef.off("value", listener);
    G = {}; ganadorPrev = null;
  }

  /* --- Jugada ------------------------------------------------------------- */
  function jugar(col) {
    if (!G.board || G.ganador || G.turn !== mySlot) return;
    const b = G.board.split("");
    let row = -1;
    for (let r = ROWS - 1; r >= 0; r--) { if (b[r * COLS + col] === ".") { row = r; break; } }
    if (row < 0) return;                       // columna llena
    const ficha = mySlot === "p1" ? "1" : "2";
    b[row * COLS + col] = ficha;
    const board = b.join("");
    let ganador = null;
    if (hayLinea(b, row, col, ficha)) ganador = mySlot;
    else if (board.indexOf(".") === -1) ganador = "empate";
    if (IC.audio) IC.audio.click();
    gameRef.update({ board, turn: mySlot === "p1" ? "p2" : "p1", ganador });
    if (ganador && ganador !== "empate") IC.scoreboard.registrarVictoria(ganador);
  }

  /** ¿Hay 4 en línea desde (r,c) con la ficha f? */
  function hayLinea(b, r, c, f) {
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dr, dc] of dirs) {
      let count = 1;
      for (const sign of [1, -1]) {
        let rr = r + dr * sign, cc = c + dc * sign;
        while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && b[rr * COLS + cc] === f) {
          count++; rr += dr * sign; cc += dc * sign;
        }
      }
      if (count >= 4) return true;
    }
    return false;
  }

  /* --- Dibujo ------------------------------------------------------------- */
  function render() {
    if (!G.board) { cont.innerHTML = `<p class="muted center" style="margin:auto">Preparando tablero…</p>`; return; }

    // Sonido al definirse el resultado (una sola vez).
    if (G.ganador !== ganadorPrev) {
      ganadorPrev = G.ganador;
      if (G.ganador && G.ganador !== "empate" && IC.audio) {
        (G.ganador === mySlot ? IC.audio.win() : IC.audio.lose());
      }
    }

    const miTurno = !G.ganador && G.turn === mySlot;
    const estado = G.ganador
      ? (G.ganador === "empate" ? "¡Empate! 🤝" : (G.ganador === mySlot ? "¡Ganaste! 🏆" : "Perdiste 😅"))
      : (miTurno ? "Tu turno" : "Turno del otro…");

    let html = `<div class="c4-top ${miTurno ? "activo" : ""} ${mySlot}">${estado}</div><div class="c4-board">`;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const v = G.board[r * COLS + c];
        const cls = v === "1" ? "p1" : (v === "2" ? "p2" : "");
        html += `<button class="c4-cell ${cls}" data-col="${c}" ${miTurno ? "" : "disabled"}></button>`;
      }
    }
    html += `</div>`;
    if (G.ganador) {
      html += `<div class="c4-fin">
        <button class="btn" id="c4-rev">🔁 Revancha</button>
        <button class="btn btn--ghost" id="c4-menu">Volver al menú</button>
      </div>`;
    }
    cont.innerHTML = html;

    if (miTurno) cont.querySelectorAll(".c4-cell").forEach(b =>
      b.onclick = () => jugar(parseInt(b.dataset.col, 10)));
    if (G.ganador) {
      cont.querySelector("#c4-rev").onclick = () => { ganadorPrev = null; gameRef.remove(); }; // el anfitrión rearma
      cont.querySelector("#c4-menu").onclick = () => IC.room.backToMenu();
    }
  }

  /* --- Registro en el hub ------------------------------------------------- */
  IC.games.register({
    id: "conecta4",
    nombre: "4 en Línea Maldito",
    emoji: "🩸",
    desc: "Alineá 4 fichas antes que tu rival · estrategia",
    disponible: true,
    crear, destroy
  });
})();
