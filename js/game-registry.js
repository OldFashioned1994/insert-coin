/* ============================================================================
   INSERT COIN — game-registry.js
   El "enchufe" de los juegos. Cada juego se registra acá con sus datos y su
   forma de arrancar. El menú del hub se arma SOLO a partir de esta lista.

   ────────────────────────────────────────────────────────────────────────
   ★ CÓMO AGREGAR UN JUEGO NUEVO (resumen — el detalle está en el README):
   1) Creá la carpeta  js/games/<tu-juego>/  con su .js y, si querés, su .css
   2) Al final de tu .js, llamá a:

        IC.games.register({
          id: "tu-juego",            // identificador único (sin espacios)
          nombre: "Mi Juego",        // lo que se ve en el menú
          emoji: "🎲",               // ícono
          desc: "Una línea corta",   // subtítulo en la tarjeta
          disponible: true,          // false = aparece "Próximamente"
          crear(container, ctx) {    // arranca el juego dentro de `container`
            // ... dibujás y sincronizás con Firebase usando IC.room.gameRef(...)
            return {
              destroy() { ...limpiá timers y escuchas al volver al menú... }
            };
          }
        });

   3) Sumá el <script> de tu juego en index.html (después de game-registry.js).
   ¡Listo! El menú lo muestra solo y reusa salas, chat y marcador.
   ────────────────────────────────────────────────────────────────────────
   ============================================================================ */

IC.games = {
  _lista: [],

  /** Registra un juego. Lo llaman los propios módulos de juego al cargarse. */
  register(def) {
    if (!def || !def.id || typeof def.crear !== "function") {
      console.error("[IC] Juego mal definido:", def);
      return;
    }
    this._lista.push(def);
  },

  /** Todos los juegos registrados (en el orden en que se cargaron). */
  todos() { return this._lista.slice(); },

  /** Busca un juego por su id. */
  get(id) { return this._lista.find((g) => g.id === id) || null; }
};
