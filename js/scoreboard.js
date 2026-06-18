/* ============================================================================
   INSERT COIN — scoreboard.js
   Marcador acumulado de la sala: cuántas partidas ganó cada uno, sumando
   TODOS los juegos. Vive en Firebase, así que los dos ven lo mismo y persiste
   aunque vuelvan al menú o cambien de juego.
   ============================================================================ */

IC.scoreboard = {
  data: { p1: 0, p2: 0 },
  _ref: null,

  /** Se llama al entrar a la sala. */
  init() {
    this._ref = IC.fb.ref(`rooms/${IC.room.code}/scoreboard`);

    // Escucho el marcador y lo dibujo cuando cambia.
    this._ref.on("value", (snap) => {
      this.data = snap.val() || { p1: 0, p2: 0 };
      this._render();
    });

    // Si cambian los jugadores (nombres/avatares), redibujo los nombres.
    IC.bus.on("players-changed", () => this._render());
  },

  /** Suma una victoria al ganador de una partida. slot = "p1" | "p2" | null(empate) */
  registrarVictoria(slot) {
    if (slot !== "p1" && slot !== "p2") return;   // empate: no suma nadie
    IC.fb.ref(`rooms/${IC.room.code}/scoreboard/${slot}`)
      .transaction((v) => (v || 0) + 1);
  },

  _render() {
    const p = IC.room.players || {};
    const html = (id, v) => { const el = document.getElementById(id); if (el) el.innerHTML = v; };
    const txt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const esc = (s) => String(s).replace(/[&<>"']/g, c =>
      ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

    html("sb-nom1", p.p1 ? `${IC.player.html(p.p1.avatar, 20)} ${esc(p.p1.nick)}` : "Jugador 1");
    html("sb-nom2", p.p2 ? `${IC.player.html(p.p2.avatar, 20)} ${esc(p.p2.nick)}` : "Esperando…");
    txt("sb-pts1", this.data.p1 || 0);
    txt("sb-pts2", this.data.p2 || 0);
  },

  apagar() {
    if (this._ref) { this._ref.off(); this._ref = null; }
  }
};
