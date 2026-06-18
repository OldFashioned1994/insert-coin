/* ============================================================================
   INSERT COIN — room.js
   El corazón de la cáscara: crear y unirse a salas con código, sincronizar
   quién está conectado (presencia) y darle a los juegos un lugar compartido
   donde guardar su estado. Es para 2 jugadores: "p1" (quien crea) y "p2".
   ============================================================================ */

IC.room = {
  code: null,        // código de la sala actual (ej: "4X9Z")
  mySlot: null,      // "p1" si creé la sala, "p2" si me uní
  players: {},       // copia local de los jugadores { p1:{...}, p2:{...} }
  _watchers: [],     // referencias activas, para poder desconectarlas al salir

  // Caracteres del código: sin los confusos (0/O, 1/I) para que se dicten fácil.
  _ALFABETO: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",

  /* --- Crear / unirse ----------------------------------------------------- */

  /** Crea una sala nueva con un código libre y entra como p1 (anfitrión). */
  async create() {
    let code;
    // Genero un código y verifico que no exista (reintenta por las dudas).
    for (let i = 0; i < 6; i++) {
      code = this._generarCodigo();
      const existe = await IC.fb.get(`rooms/${code}/meta`);
      if (!existe) break;
    }
    await IC.fb.ref(`rooms/${code}`).update({
      meta: { createdAt: IC.fb.serverTime(), host: "p1" },
      currentGame: null
    });
    await this._entrar(code, "p1");
    return code;
  },

  /** Se une a una sala existente como p2. Tira error si el código no existe. */
  async join(codeIngresado) {
    const code = String(codeIngresado || "").trim().toUpperCase();
    if (code.length !== 4) throw new Error("El código tiene 4 caracteres.");
    const meta = await IC.fb.get(`rooms/${code}/meta`);
    if (!meta) throw new Error("No encontré ninguna sala con ese código.");
    await this._entrar(code, "p2");
    return code;
  },

  /* --- Lógica interna de entrada ------------------------------------------ */

  async _entrar(code, slot) {
    this.code = code;
    this.mySlot = slot;

    const yo = IC.player.data;
    const miRef = IC.fb.ref(`rooms/${code}/players/${slot}`);

    // Escribo mi identidad y me marco "online".
    await miRef.update({ nick: yo.nick, avatar: yo.avatar, online: true });

    // PRESENCIA: si se corta la conexión (cierra el celu, se va el wifi),
    // Firebase me marca offline solo. Y al reconectar, vuelvo a online.
    const connRef = IC.fb.ref(".info/connected");
    const onConn = (snap) => {
      if (snap.val() === true) {
        miRef.child("online").onDisconnect().set(false);
        miRef.child("online").set(true);
      }
    };
    connRef.on("value", onConn);
    this._watchers.push({ ref: connRef, ev: "value", cb: onConn });

    // Escucho cambios en los jugadores (entra/sale el otro, cambia avatar…).
    const playersRef = IC.fb.ref(`rooms/${code}/players`);
    const onPlayers = (snap) => {
      this.players = snap.val() || {};
      IC.bus.emit("players-changed", this.players);
    };
    playersRef.on("value", onPlayers);
    this._watchers.push({ ref: playersRef, ev: "value", cb: onPlayers });

    // Escucho el modo elegido en el menú (para que ambos lo conozcan).
    const modeRef = IC.fb.ref(`rooms/${code}/currentMode`);
    const onMode = (snap) => { this.gameMode = snap.val() || "cine"; };
    modeRef.on("value", onMode);
    this._watchers.push({ ref: modeRef, ev: "value", cb: onMode });

    // Guardo la sala para poder "volver" si se recarga la página.
    localStorage.setItem("ic_room", JSON.stringify({ code, slot }));

    IC.bus.emit("room-entered", { code, slot });
  },

  _generarCodigo() {
    let c = "";
    for (let i = 0; i < 4; i++) {
      // Nota: usamos un índice pseudo-aleatorio simple; suficiente para salas.
      const idx = Math.floor(Math.random() * this._ALFABETO.length);
      c += this._ALFABETO[idx];
    }
    return c;
  },

  /* --- Ayudas para los jugadores ------------------------------------------ */

  isHost() { return this.mySlot === "p1"; },
  opponentSlot() { return this.mySlot === "p1" ? "p2" : "p1"; },
  me() { return this.players[this.mySlot] || IC.player.data; },
  opponent() { return this.players[this.opponentSlot()] || null; },

  /** ¿Están los dos jugadores conectados? */
  ambosConectados() {
    return !!(this.players.p1 && this.players.p1.online &&
              this.players.p2 && this.players.p2.online);
  },

  /* --- Estado de juego compartido ----------------------------------------- */

  /** Referencia a un subnodo del estado del juego activo. */
  gameRef(sub) {
    return IC.fb.ref(`rooms/${this.code}/game${sub ? "/" + sub : ""}`);
  },

  gameMode: "cine",   // modo elegido en el menú (ej. la trivia: "cine" | "terror")

  /** Lanza un juego: limpia el estado anterior y lo marca como activo.
      `modo` es opcional (lo usa la trivia para Cine vs Solo Terror).
      Cualquiera de los dos puede iniciarlo desde el menú. */
  async launchGame(id, modo) {
    this.gameMode = modo || "cine";
    await this.gameRef().remove();                  // borra estado viejo
    await IC.fb.ref(`rooms/${this.code}/currentMode`).set(this.gameMode);
    await IC.fb.ref(`rooms/${this.code}/currentGame`).set(id);
  },

  /** Vuelve al menú (sin desconectarse de la sala). */
  async backToMenu() {
    await IC.fb.ref(`rooms/${this.code}/currentGame`).set(null);
  },

  /** Escucha qué juego está activo (o null = menú). */
  watchCurrentGame(cb) {
    const ref = IC.fb.ref(`rooms/${this.code}/currentGame`);
    const fn = (snap) => cb(snap.val());
    ref.on("value", fn);
    this._watchers.push({ ref, ev: "value", cb: fn });
  },

  /* --- Salir / reanudar --------------------------------------------------- */

  /** Sala guardada de una sesión anterior (para el botón "Volver a tu sala"). */
  getSaved() {
    try { return JSON.parse(localStorage.getItem("ic_room")); }
    catch (_) { return null; }
  },

  /** Reentra a una sala guardada (tras recargar la página). */
  async resume(saved) {
    const meta = await IC.fb.get(`rooms/${saved.code}/meta`);
    if (!meta) { this.clearSaved(); throw new Error("La sala ya no existe."); }
    await this._entrar(saved.code, saved.slot);
  },

  clearSaved() { localStorage.removeItem("ic_room"); },

  /** Sale de la sala: se marca offline y corta todas las escuchas. */
  async leave() {
    if (this.code && this.mySlot) {
      try { await IC.fb.ref(`rooms/${this.code}/players/${this.mySlot}/online`).set(false); }
      catch (_) {}
    }
    this._watchers.forEach(w => w.ref.off(w.ev, w.cb));
    this._watchers = [];
    this.clearSaved();
    this.code = null; this.mySlot = null; this.players = {};
  }
};
