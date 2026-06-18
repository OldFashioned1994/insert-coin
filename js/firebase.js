/* ============================================================================
   INSERT COIN — firebase.js
   Inicializa la conexión con Firebase y ofrece utilidades para leer/escribir
   en la base de datos en tiempo real. Crea el "espacio de nombres" global IC
   (de Insert Coin) que usan todos los demás archivos.
   ============================================================================ */

// Espacio de nombres global. Todos los módulos cuelgan de acá (IC.fb, IC.room…)
window.IC = window.IC || {};

/* --- Mini "bus de eventos" -------------------------------------------------
   Permite que un módulo avise algo (emit) y otros escuchen (on), sin que se
   conozcan entre sí. Ej: room.js avisa "players-changed" y la pantalla se
   actualiza. Mantiene el código desacoplado y prolijo. */
IC.bus = (function () {
  const oyentes = {};
  return {
    on(evento, fn) { (oyentes[evento] ||= []).push(fn); },
    emit(evento, dato) { (oyentes[evento] || []).forEach(fn => fn(dato)); }
  };
})();

/* --- Capa de Firebase ------------------------------------------------------ */
IC.fb = {
  db: null,
  configurado: false,

  /** Arranca Firebase. Devuelve true si quedó listo, false si faltan claves. */
  init() {
    const cfg = window.FIREBASE_CONFIG || {};

    // ¿El usuario todavía no pegó sus claves? Lo detectamos para avisar lindo.
    const sinConfigurar =
      !cfg.databaseURL || String(cfg.databaseURL).includes("PEGÁ");

    if (sinConfigurar) {
      this.configurado = false;
      console.warn("[IC] Firebase no está configurado. Editá js/firebase-config.js");
      return false;
    }

    firebase.initializeApp(cfg);
    this.db = firebase.database();
    this.configurado = true;
    return true;
  },

  /** Atajo para apuntar a una ruta de la base. Ej: IC.fb.ref("rooms/4X9Z"). */
  ref(path) { return this.db.ref(path); },

  /** Marca de tiempo del servidor de Firebase (igual para los dos celulares). */
  serverTime() { return firebase.database.ServerValue.TIMESTAMP; },

  /** Lee una vez un valor (devuelve una promesa con el dato plano). */
  async get(path) {
    const snap = await this.db.ref(path).get();
    return snap.val();
  }
};
