/* ============================================================================
   INSERT COIN — player.js
   Maneja la identidad de QUIEN está jugando en ESTE teléfono: su apodo y su
   avatar (un personaje de terror). Se guarda en el navegador (localStorage).
   ============================================================================ */

IC.player = {
  // Los 12 avatares de terror (imágenes en assets/avatars/<id>.png).
  AVATARES: [
    { id: "jason",       nombre: "Jason" },
    { id: "alien",       nombre: "Alien" },
    { id: "chucky",      nombre: "Chucky" },
    { id: "pennywise",   nombre: "Pennywise" },
    { id: "freddy",      nombre: "Freddy" },
    { id: "pinhead",     nombre: "Pinhead" },
    { id: "ghostface",   nombre: "Ghostface" },
    { id: "myers",       nombre: "Michael Myers" },
    { id: "leatherface", nombre: "Leatherface" },
    { id: "zombie",      nombre: "Poseída" },
    { id: "jigsaw",      nombre: "Jigsaw" },
    { id: "samara",      nombre: "Samara" }
  ],

  // Datos del jugador local. El avatar se guarda como id (ej. "jason").
  data: { nick: "", avatar: "jason" },

  /** Carga lo guardado en el navegador (si hay). */
  load() {
    try {
      const guardado = JSON.parse(localStorage.getItem("ic_player"));
      if (guardado && guardado.nick) this.data = guardado;
    } catch (_) { /* primera vez: no hay nada guardado */ }
    return this.data;
  },

  /** Guarda apodo + avatar (id) para la próxima vez. */
  set(nick, avatar) {
    this.data = { nick: (nick || "").trim() || "Jugador", avatar: avatar || "jason" };
    localStorage.setItem("ic_player", JSON.stringify(this.data));
    return this.data;
  },

  /** Ruta de la imagen de un avatar por su id. */
  src(id) { return `assets/avatars/${id}.png`; },

  /** ¿Ese id corresponde a un avatar conocido (imagen)? */
  existe(id) { return this.AVATARES.some(a => a.id === id); },

  /** Devuelve el HTML de un avatar a un tamaño dado (px). Sirve en cualquier
      lugar de la app. Si es un avatar viejo (emoji), lo muestra como texto. */
  html(id, px) {
    px = px || 32;
    if (id && this.existe(id)) {
      return `<img class="avimg" style="width:${px}px;height:${px}px" src="${this.src(id)}" alt="" />`;
    }
    const fs = Math.round(px * 0.7);
    return `<span class="avimg-emoji" style="width:${px}px;height:${px}px;font-size:${fs}px">${id || "🎮"}</span>`;
  }
};
