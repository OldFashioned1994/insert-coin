/* ============================================================================
   INSERT COIN — chat.js
   Chat de texto dentro de la sala. Se sincroniza por Firebase y se muestra en
   un panel que sube desde abajo. Lleva un contador de mensajes no leídos.
   ============================================================================ */

IC.chat = {
  _ref: null,
  _abierto: false,
  _noLeidos: 0,
  _iniciado: false,

  // Elementos del DOM (se buscan una sola vez).
  _el: {},

  /** Se llama al entrar a una sala. Engancha la escucha y los botones. */
  init() {
    const $ = (id) => document.getElementById(id);
    this._el = {
      fab:    $("chat-fab"),
      badge:  $("chat-badge"),
      wrap:   $("chat-wrap"),
      msgs:   $("chat-msgs"),
      form:   $("chat-form"),
      input:  $("chat-input"),
      cerrar: $("chat-cerrar")
    };

    // Engancho los botones una sola vez (aunque se entre/salga de salas).
    if (!this._iniciado) {
      this._el.fab.addEventListener("click", () => this.abrir());
      this._el.cerrar.addEventListener("click", () => this.cerrar());
      this._el.wrap.addEventListener("click", (e) => {
        if (e.target === this._el.wrap) this.cerrar(); // tocar afuera cierra
      });
      this._el.form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.enviar(this._el.input.value);
        this._el.input.value = "";
      });
      this._iniciado = true;
    }

    // Muestro la burbuja de chat (estaba oculta en el inicio).
    this._el.fab.classList.remove("hidden");
    this._el.msgs.innerHTML = "";
    this._noLeidos = 0;
    this._t0 = Date.now();          // para no sonar con el historial inicial
    this._actualizarBadge();

    // Escucho los últimos 50 mensajes de la sala.
    this._ref = IC.fb.ref(`rooms/${IC.room.code}/chat`).limitToLast(50);
    this._ref.on("child_added", (snap) => this._pintar(snap.val()));
  },

  /** Envía un mensaje (lo escribe en Firebase; ambos lo verán). */
  enviar(texto) {
    texto = (texto || "").trim();
    if (!texto) return;
    IC.fb.ref(`rooms/${IC.room.code}/chat`).push({
      slot: IC.room.mySlot,
      nick: IC.player.data.nick,
      text: texto.slice(0, 200),     // límite sano de largo
      ts: IC.fb.serverTime()
    });
  },

  /** Dibuja un mensaje en el panel. */
  _pintar(m) {
    if (!m) return;
    const mio = m.slot === IC.room.mySlot;
    const div = document.createElement("div");
    div.className = "msg " + (mio ? "mine" : "their");
    div.innerHTML =
      (mio ? "" : `<span class="quien">${this._escape(m.nick)}</span>`) +
      this._escape(m.text);
    this._el.msgs.appendChild(div);
    this._el.msgs.scrollTop = this._el.msgs.scrollHeight;

    // Si el chat está cerrado y el mensaje es del otro, cuento no leído.
    if (!this._abierto && !mio) {
      this._noLeidos++;
      this._actualizarBadge();
    }
    // Blip al recibir un mensaje del otro (no con el historial inicial).
    if (!mio && Date.now() - (this._t0 || 0) > 1500) IC.audio.chat();
  },

  abrir() {
    this._abierto = true;
    this._noLeidos = 0;
    this._actualizarBadge();
    this._el.wrap.classList.remove("hidden");
    setTimeout(() => this._el.input.focus(), 50);
    this._el.msgs.scrollTop = this._el.msgs.scrollHeight;
  },

  cerrar() {
    this._abierto = false;
    this._el.wrap.classList.add("hidden");
  },

  _actualizarBadge() {
    const b = this._el.badge;
    if (this._noLeidos > 0) {
      b.textContent = this._noLeidos > 9 ? "9+" : this._noLeidos;
      b.classList.remove("hidden");
    } else {
      b.classList.add("hidden");
    }
  },

  /** Oculta el chat al salir de la sala y corta la escucha. */
  apagar() {
    if (this._ref) { this._ref.off(); this._ref = null; }
    if (this._el.fab) this._el.fab.classList.add("hidden");
    this.cerrar();
  },

  /** Evita que alguien "inyecte" HTML en un mensaje (seguridad básica). */
  _escape(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }
};
