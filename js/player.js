/* ============================================================================
   INSERT COIN — player.js
   Maneja la identidad de QUIEN está jugando en ESTE teléfono: su apodo y su
   avatar. Se guarda en el navegador (localStorage) para no tener que cargarlo
   cada vez.
   ============================================================================ */

IC.player = {
  // Set de avatares con onda arcade para elegir.
  AVATARES: ["🎮","👾","🕹️","🤖","👻","🐲","🦊","🐱","🍿","⭐","💀","🎯"],

  // Datos del jugador local.
  data: { nick: "", avatar: "🎮" },

  /** Carga lo guardado en el navegador (si hay). */
  load() {
    try {
      const guardado = JSON.parse(localStorage.getItem("ic_player"));
      if (guardado && guardado.nick) this.data = guardado;
    } catch (_) { /* primera vez: no hay nada guardado, está bien */ }
    return this.data;
  },

  /** Guarda apodo + avatar para la próxima vez. */
  set(nick, avatar) {
    this.data = { nick: nick.trim() || "Jugador", avatar: avatar || "🎮" };
    localStorage.setItem("ic_player", JSON.stringify(this.data));
    return this.data;
  }
};
