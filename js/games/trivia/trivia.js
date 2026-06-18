/* ============================================================================
   INSERT COIN — trivia.js  (juego: Trivia de Cine, duelo a contrarreloj)
   ----------------------------------------------------------------------------
   Mecánica de cada ronda:
     1) CATEGORÍA  → uno de los dos (se alterna) elige el tema.
     2) PREGUNTA   → aparece la pregunta con cronómetro de 20s. Comodines: 50/50,
                     Pista y Saltar (1 uso de cada uno por partida).
     3) REVELAR    → se muestra la correcta, cuántos puntos sumó cada uno y un
                     dato curioso.
   Puntaje único: acertar = 100 + bonus por rapidez, multiplicado por el factor
   de racha (respuestas seguidas). Errar o no responder = 0 y corta la racha.
   Gana quien junta más puntos en 10 preguntas. El ganador suma 1 al marcador.

   Sincronización: TODO el estado vive en  rooms/<code>/game . El "anfitrión"
   (p1, quien creó la sala) es el árbitro: avanza las fases y calcula los puntos.
   Los dos clientes dibujan la misma pantalla a partir de ese estado compartido.
   ============================================================================ */

(function () {

  /* --- Parámetros del juego (fáciles de ajustar) -------------------------- */
  // Sistema de puntos ÚNICO: acertar = BASE + bonus por rapidez, multiplicado
  // por el factor de racha. Errar o no responder = 0 puntos y corta la racha.
  const TOTAL = 10;            // preguntas por partida
  const SEG = 20;              // segundos por pregunta
  const BASE = 100;            // puntos base por acierto
  const BONUS_RAPIDEZ = 50;    // bonus máximo por responder rápido

  // Categorías del modo CINE (todas las categorías).
  const CATEGORIAS = [
    { id: "terror",    nombre: "Terror y Slasher", emoji: "🔪" },
    { id: "hollywood", nombre: "Hollywood y Sagas", emoji: "🎬" },
    { id: "argentino", nombre: "Cine Argentino",    emoji: "🧉" },
    { id: "animacion", nombre: "Animación",         emoji: "🎨" },
    { id: "mixto",     nombre: "Mix de Cine",       emoji: "🎞️" },
    { id: "sorpresa",  nombre: "¡Sorpresa!",        emoji: "🎲" }
  ];

  // Sub-temas del modo SOLO TERROR (filtran por el campo "sub" de cada pregunta).
  const CAT_TERROR = [
    { id: "clasicos",      nombre: "Clásicos",        emoji: "🎞️" },
    { id: "slasher",       nombre: "Slashers",        emoji: "🔪" },
    { id: "sobrenatural",  nombre: "Sobrenatural",    emoji: "👻" },
    { id: "moderno",       nombre: "Terror Moderno",  emoji: "🩸" },
    { id: "internacional", nombre: "Internacional",   emoji: "🌍" },
    { id: "frases",        nombre: "Frases de Terror", emoji: "💬" },
    { id: "sorpresa",      nombre: "¡Sorpresa!",      emoji: "🎲" }
  ];
  // Lista de categorías según el modo de la partida ("terror" | "cine").
  const catsActuales = (modo) => (modo === "terror" ? CAT_TERROR : CATEGORIAS);

  /* --- Variables locales (de ESTE teléfono, no se comparten) --------------- */
  let cont, gameRef, listener;
  let G = {};                  // último estado del juego (espejo de Firebase)
  let mySlot, soyHost;
  let timerInt = null, finRonda = 0, rondaConTimer = -1;
  let local50 = {};            // opciones escondidas por el comodín 50/50 (por ronda)
  let localPista = {};         // si revelé la pista (por ronda)
  let hostTimeoutRonda = -1;   // control del "timeout de seguridad" del anfitrión
  let sonRevelar = -1, finSonado = false, lastTick = 0;   // control de sonidos

  /* --- Utilidades ---------------------------------------------------------- */
  const preguntas = () => window.TRIVIA_PREGUNTAS;
  const esc = (s) => String(s).replace(/[&<>"']/g, c =>
    ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function catInfo(id) { return CATEGORIAS.find(c => c.id === id) || { nombre: id, emoji: "🎬" }; }
  function catInfoFor(id, modo) { return catsActuales(modo).find(c => c.id === id) || { nombre: id, emoji: "🎬" }; }
  const otro = (slot) => (slot === "p1" ? "p2" : "p1");
  function nick(slot) { const p = IC.room.players[slot]; return p ? p.nick : (slot === "p1" ? "Jugador 1" : "Jugador 2"); }
  function avatar(slot) { const p = IC.room.players[slot]; return p ? p.avatar : "🎮"; }

  /* =========================================================================
     ARRANQUE DEL JUEGO  (lo llama el hub al entrar a la trivia)
     ========================================================================= */
  function crear(container) {
    cont = container;
    mySlot = IC.room.mySlot;
    soyHost = IC.room.isHost();
    gameRef = IC.room.gameRef();

    // Muestro "Cargando…" ANTES de escuchar (si el evento llega sincrónico,
    // no quiero pisar lo que dibuje el render).
    cont.innerHTML = `<p class="muted center" style="margin:auto">Cargando…</p>`;

    // Escucho TODO el estado del juego y redibujo en cada cambio.
    // El try/catch evita que un error deje la pantalla colgada en silencio.
    listener = gameRef.on("value",
      (snap) => {
        try {
          G = snap.val() || {};
          if (soyHost) hostTick();   // el árbitro mueve las fases
          render();
        } catch (e) {
          mostrarError("Error al dibujar la trivia", e);
        }
      },
      (err) => mostrarError("Sin permiso para leer el juego", err)
    );

    // Plan B del anfitrión: arranca el estado sin esperar al primer evento
    // (por si el evento sincrónico se pisó o tardó).
    if (soyHost) {
      gameRef.child("phase").get()
        .then((s) => {
          if (!s.exists()) {
            gameRef.set({
              phase: "lobby", ronda: 0, total: TOTAL,   // arranca en el lobby (elegir modo)
              puntos: { p1: 0, p2: 0 }, racha: { p1: 0, p2: 0 }
            });
          }
        })
        .catch((e) => mostrarError("No pude iniciar la partida", e));
    }

    return { destroy };   // el hub usa esto para limpiar al volver al menú
  }

  /** Muestra un error en pantalla en vez de quedar colgado. */
  function mostrarError(titulo, e) {
    console.error("[trivia]", titulo, e);
    const msg = (e && e.message) ? e.message : String(e);
    if (cont) cont.innerHTML = `
      <div class="tr-bloque" style="margin:auto;text-align:center">
        <p style="color:var(--rojo);font-weight:700">${titulo}</p>
        <p class="muted small">${msg}</p>
        <button class="btn btn--ghost" onclick="IC.room.backToMenu()">Volver al menú</button>
      </div>`;
  }

  /* =========================================================================
     LÓGICA DEL ANFITRIÓN (p1): hace avanzar la partida
     ========================================================================= */
  function hostTick() {
    // Si el estado está vacío (primer arranque o revancha), arranca en el lobby
    // (donde el anfitrión elige el modo: Cine o Solo Terror).
    if (!G.phase) {
      gameRef.set({
        phase: "lobby", ronda: 0, total: TOTAL,
        puntos: { p1: 0, p2: 0 }, racha: { p1: 0, p2: 0 }
      });
      return;
    }
    const r = G.ronda || 0;

    if (G.phase === "categoria") {
      const elegida = G.eleccion && G.eleccion[r];
      const yaHayPregunta = G.rondas && G.rondas[r];
      if (elegida && !yaHayPregunta) {
        const usadas = G.usadas || {};
        const pick = elegirPregunta(elegida, usadas, G.modo);
        const info = catInfoFor(elegida, G.modo);
        const up = {};
        up[`rondas/${r}`] = { qIndex: pick.qIndex, orden: pick.orden, cat: pick.cat, tag: `${info.emoji} ${info.nombre}` };
        up[`usadas/${pick.qIndex}`] = true;
        up["phase"] = "pregunta";          // directo a la pregunta (sin apuesta)
        gameRef.update(up);
        programarTimeoutSeguridad(r);
      }
    }

    else if (G.phase === "pregunta") {
      const resp = (G.respuestas && G.respuestas[r]) || {};
      if (resp.p1 && resp.p2 && !(G.resultados && G.resultados[r])) {
        calcularResultados(r);
      }
    }

    else if (G.phase === "revelar") {
      if (G.avanzarA === r + 1) {
        if (r + 1 >= (G.total || TOTAL)) {
          finalizar();
        } else {
          gameRef.update({ ronda: r + 1, phase: "categoria" });
        }
      }
    }
  }

  /** El anfitrión elige una pregunta sin repetir. `usadas` se conserva entre
      revanchas (ver revancha()), así no salen las mismas preguntas de nuevo. */
  function elegirPregunta(catId, usadas, modo) {
    const todas = preguntas().map((p, i) => ({ p, i }));

    // Base según el modo: en "terror" solo preguntas de terror, filtradas por sub-tema.
    let base;
    if (modo === "terror") {
      base = todas.filter(x => x.p.cat === "terror");
      if (catId !== "sorpresa") base = base.filter(x => x.p.sub === catId);
    } else {
      base = (catId === "sorpresa") ? todas : todas.filter(x => x.p.cat === catId);
    }

    let pool = base.filter(x => !usadas[x.i]);   // sin usar
    if (!pool.length) pool = base;               // agotado: reciclo dentro del mismo filtro

    const pick = elegirPonderado(pool);          // favorece las difíciles
    return { qIndex: pick.i, orden: shuffle([0, 1, 2, 3]), cat: pick.p.cat };
  }

  /** Elige al azar PERO ponderando por dificultad: una dif 3 tiene el triple de
      chances que una dif 1. Así el juego se inclina hacia lo difícil. */
  function elegirPonderado(pool) {
    let total = 0;
    for (const x of pool) total += (x.p.dif || 2);
    let r = Math.random() * total;
    for (const x of pool) { r -= (x.p.dif || 2); if (r <= 0) return x; }
    return pool[pool.length - 1];
  }

  /** Si alguien se desconecta y no responde, el anfitrión cierra la ronda. */
  function programarTimeoutSeguridad(r) {
    if (hostTimeoutRonda === r) return;
    hostTimeoutRonda = r;
    setTimeout(() => {
      if (G.phase !== "pregunta" || G.ronda !== r) return;
      const resp = (G.respuestas && G.respuestas[r]) || {};
      const up = {};
      if (!resp.p1) up[`respuestas/${r}/p1`] = { op: -1, ms: SEG * 1000 };
      if (!resp.p2) up[`respuestas/${r}/p2`] = { op: -1, ms: SEG * 1000 };
      if (Object.keys(up).length) gameRef.update(up);
    }, (SEG + 6) * 1000);
  }

  /** Calcula puntos de la ronda para los dos y pasa a "revelar".
      Sistema único: acertar = (BASE + bonus por rapidez) × factor de racha.
      Errar o no responder = 0 puntos y corta la racha. */
  function calcularResultados(r) {
    const ronda = G.rondas[r];
    const preg = preguntas()[ronda.qIndex];
    const correcta = ronda.orden.indexOf(preg.ok);   // índice correcto YA mezclado
    const resp = G.respuestas[r];
    const puntos = Object.assign({ p1: 0, p2: 0 }, G.puntos);
    const racha = Object.assign({ p1: 0, p2: 0 }, G.racha);

    const res = { correcta };
    ["p1", "p2"].forEach(slot => {
      const { op, ms } = resp[slot];
      let pts = 0, acierto = false;

      if (op === correcta) {                 // ACIERTA
        acierto = true;
        const restante = Math.max(0, SEG * 1000 - (ms || 0));
        const bonus = Math.round(BONUS_RAPIDEZ * (restante / (SEG * 1000)));
        racha[slot] = (racha[slot] || 0) + 1;
        const factorRacha = 1 + 0.2 * Math.min(racha[slot] - 1, 3);   // x1 → x1.6
        pts = Math.round((BASE + bonus) * factorRacha);
      } else {                                // ERRÓ o NO RESPONDIÓ
        pts = 0;
        racha[slot] = 0;
      }
      puntos[slot] += pts;
      res[slot] = { acierto, pts, op };
    });

    gameRef.update({
      [`resultados/${r}`]: res,
      puntos, racha, phase: "revelar"
    });
  }

  function finalizar() {
    // Transición ATÓMICA a "fin": aunque el anfitrión procese varios eventos
    // seguidos, solo UNA ejecución gana la transacción y registra la victoria.
    // Así el marcador nunca suma de más ni de menos.
    gameRef.child("phase").transaction(
      (cur) => (cur === "fin" ? undefined : "fin"),   // si ya finalizó, aborta
      (err, committed) => {
        if (err || !committed) return;                // otro evento ya cerró: no duplico
        const p1 = G.puntos.p1, p2 = G.puntos.p2;
        const ganador = p1 === p2 ? "empate" : (p1 > p2 ? "p1" : "p2");
        gameRef.child("ganador").set(ganador);
        if (ganador !== "empate") IC.scoreboard.registrarVictoria(ganador);
      }
    );
  }

  /* =========================================================================
     ACCIONES DEL JUGADOR (escriben en el estado compartido)
     ========================================================================= */
  function elegirModo(modo) {            // lo elige el anfitrión en el lobby
    gameRef.update({ modo: modo, phase: "categoria" });
  }
  function elegirCategoria(catId) {
    gameRef.child(`eleccion/${G.ronda}`).set(catId);
  }
  function responder(opDisplay) {
    const r = G.ronda;
    if (G.respuestas && G.respuestas[r] && G.respuestas[r][mySlot]) return; // ya respondí
    const ms = SEG * 1000 - Math.max(0, finRonda - Date.now());
    gameRef.child(`respuestas/${r}/${mySlot}`).set({ op: opDisplay, ms });
    pararTimer();
  }
  function usarComodin(tipo) {
    const r = G.ronda;
    const usados = (G.comodines && G.comodines[mySlot]) || {};
    if (usados[tipo]) return;
    gameRef.child(`comodines/${mySlot}/${tipo}`).set(true);

    if (tipo === "ff") {
      // Escondo 2 opciones incorrectas (efecto local, solo para mí).
      const ronda = G.rondas[r];
      const preg = preguntas()[ronda.qIndex];
      const correcta = ronda.orden.indexOf(preg.ok);
      const malas = [0, 1, 2, 3].filter(i => i !== correcta);
      local50[r] = shuffle(malas).slice(0, 2);
    } else if (tipo === "pista") {
      localPista[r] = true;
    } else if (tipo === "saltar") {
      responder(-2);     // saltar = no responder, sin penalización
    }
    render();
  }
  function siguiente() {
    gameRef.child("avanzarA").set((G.ronda || 0) + 1);
  }
  function revancha() {
    // Reinicio la partida PERO conservo "usadas" (las preguntas ya jugadas),
    // así la revancha no repite las preguntas anteriores.
    rondaConTimer = -1; local50 = {}; localPista = {}; hostTimeoutRonda = -1;
    sonRevelar = -1; finSonado = false; lastTick = 0;
    const usadas = (G && G.usadas) ? G.usadas : {};
    gameRef.set({
      phase: "lobby", ronda: 0, total: TOTAL,
      puntos: { p1: 0, p2: 0 }, racha: { p1: 0, p2: 0 },
      usadas: usadas
    });
  }

  /* =========================================================================
     DIBUJO DE LA PANTALLA  (todo se deriva del estado G)
     ========================================================================= */
  function render() {
    if (!G.phase) { cont.innerHTML = `<p class="muted center" style="margin:auto">Preparando duelo…</p>`; return; }
    const r = G.ronda || 0;

    if (G.phase === "lobby") vistaLobby();
    else if (G.phase === "categoria") vistaCategoria(r);
    else if (G.phase === "pregunta") vistaPregunta(r);
    else if (G.phase === "revelar") vistaRevelar(r);
    else if (G.phase === "fin") vistaFin();
  }

  /* --- 0) LOBBY: el anfitrión elige el modo (Cine o Solo Terror) ----------- */
  function vistaLobby() {
    if (!IC.room.isHost()) {
      cont.innerHTML = hud() + espera("p1", `${esc(nick("p1"))} está eligiendo el modo…`);
      return;
    }
    cont.innerHTML = hud() + `
      <div class="tr-bloque">
        <h3 class="tr-titulo">Elegí el modo</h3>
        <p class="muted small">El anfitrión elige cómo jugar esta partida.</p>
        <div class="tr-modos">
          <button class="tr-modo cine" data-modo="cine">
            <span class="e">🎬</span><b>Cine (todo)</b>
            <span>Terror, Hollywood, animación, cine argentino y más.</span>
          </button>
          <button class="tr-modo terror" data-modo="terror">
            <span class="e">🔪</span><b>Solo Terror</b>
            <span>Clásicos, slashers, sobrenatural, moderno, internacional y frases.</span>
          </button>
        </div>
      </div>`;
    cont.querySelectorAll(".tr-modo").forEach(b =>
      b.onclick = () => elegirModo(b.dataset.modo));
  }

  /** Barra superior con el tanteador del duelo y el número de ronda. */
  function hud() {
    const p = G.puntos || { p1: 0, p2: 0 };
    const rc = G.racha || { p1: 0, p2: 0 };
    const fuego = (n) => n >= 2 ? ` <span class="racha">🔥${n}</span>` : "";
    return `
      <div class="tr-hud">
        <div class="tr-hud-lado p1">
          ${IC.player.html(avatar("p1"), 34)}
          <span class="tr-nom">${esc(nick("p1"))}</span>
          <span class="tr-pts">${p.p1}${fuego(rc.p1)}</span>
        </div>
        <div class="tr-ronda">Ronda<br><b>${(G.ronda || 0) + 1}/${G.total || TOTAL}</b></div>
        <div class="tr-hud-lado p2">
          ${IC.player.html(avatar("p2"), 34)}
          <span class="tr-nom">${esc(nick("p2"))}</span>
          <span class="tr-pts">${p.p2}${fuego(rc.p2)}</span>
        </div>
      </div>`;
  }

  function espera(slot, texto) {
    return `<div class="tr-espera">${IC.player.html(avatar(slot), 84)}
      <p class="muted">${texto}</p>
      <div class="dots"><span></span><span></span><span></span></div></div>`;
  }

  /* --- 1) CATEGORÍA -------------------------------------------------------- */
  function vistaCategoria(r) {
    const elige = (r % 2 === 0) ? "p1" : "p2";
    if (elige === mySlot) {
      const ya = G.eleccion && G.eleccion[r];
      if (ya) { cont.innerHTML = hud() + espera(mySlot, "Preparando la pregunta…"); return; }
      cont.innerHTML = hud() + `
        <div class="tr-bloque">
          <h3 class="tr-titulo">Elegí la categoría</h3>
          <p class="muted small">Te toca a vos elegir el tema de esta ronda.</p>
          <div class="tr-cats">
            ${catsActuales(G.modo).map(c => `
              <button class="tr-cat" data-cat="${c.id}">
                <span class="e">${c.emoji}</span><span>${c.nombre}</span>
              </button>`).join("")}
          </div>
        </div>`;
      cont.querySelectorAll(".tr-cat").forEach(b =>
        b.onclick = () => elegirCategoria(b.dataset.cat));
    } else {
      cont.innerHTML = hud() + espera(elige, `${esc(nick(elige))} está eligiendo la categoría…`);
    }
  }

  /* --- 2) PREGUNTA --------------------------------------------------------- */
  function vistaPregunta(r) {
    const ronda = G.rondas[r];
    const preg = preguntas()[ronda.qIndex];
    const opciones = ronda.orden.map(i => preg.ops[i]);
    const tag = ronda.tag || `${catInfo(ronda.cat).emoji} ${catInfo(ronda.cat).nombre}`;

    const yaRespondi = G.respuestas && G.respuestas[r] && G.respuestas[r][mySlot];
    const miOp = yaRespondi ? G.respuestas[r][mySlot].op : null;
    const escondidas = local50[r] || [];
    const usados = (G.comodines && G.comodines[mySlot]) || {};
    const oppResp = G.respuestas && G.respuestas[r] && G.respuestas[r][otro(mySlot)];

    cont.innerHTML = hud() + `
      <div class="tr-bloque">
        <div class="tr-cat-tag">${tag}</div>
        <div class="tr-timer"><div class="tr-timer-bar" id="trivia-timer-bar"></div></div>
        <h3 class="tr-pregunta">${esc(preg.q)}</h3>
        ${localPista[r] ? `<p class="tr-pista">💡 ${esc(preg.pista || "Sin pista para esta.")}</p>` : ""}
        <div class="tr-opciones">
          ${opciones.map((op, i) => {
            const oculta = escondidas.includes(i) ? "oculta" : "";
            const elegida = (miOp === i) ? "elegida" : "";
            const dis = yaRespondi ? "disabled" : "";
            return `<button class="tr-op ${oculta} ${elegida}" data-op="${i}" ${dis}>${esc(op)}</button>`;
          }).join("")}
        </div>
        ${yaRespondi
          ? `<p class="tr-estado">${miOp === -2 ? "Saltaste la pregunta." : "Respuesta enviada."} ${oppResp ? "El otro ya respondió ✓" : "Esperando al otro…"}</p>`
          : `<div class="tr-comodines">
               <button class="tr-com" data-com="ff" ${usados.ff ? "disabled" : ""}>✂️ 50/50</button>
               <button class="tr-com" data-com="pista" ${usados.pista ? "disabled" : ""}>💡 Pista</button>
               <button class="tr-com" data-com="saltar" ${usados.saltar ? "disabled" : ""}>⏭️ Saltar</button>
             </div>
             <p class="tr-estado small">${oppResp ? `${esc(nick(otro(mySlot)))} ya respondió ✓` : ""}</p>`}
      </div>`;

    if (!yaRespondi) {
      cont.querySelectorAll(".tr-op:not(.oculta)").forEach(b =>
        b.onclick = () => responder(parseInt(b.dataset.op, 10)));
      cont.querySelectorAll(".tr-com").forEach(b =>
        b.onclick = () => usarComodin(b.dataset.com));
    }

    arrancarTimer(r);
  }

  /* --- 4) REVELAR ---------------------------------------------------------- */
  function vistaRevelar(r) {
    const ronda = G.rondas[r];
    const preg = preguntas()[ronda.qIndex];
    const opciones = ronda.orden.map(i => preg.ops[i]);
    const res = G.resultados[r];
    const miRes = res[mySlot], opRes = res[otro(mySlot)];
    const ultima = (r + 1) >= (G.total || TOTAL);

    // Sonido del resultado (una sola vez por ronda).
    if (sonRevelar !== r) {
      sonRevelar = r;
      if (miRes.acierto) IC.audio.correct();
      else if (miRes.op < 0) IC.audio.timeout();
      else IC.audio.wrong();
    }

    const linea = (slot) => {
      const rr = res[slot];
      const signo = rr.pts > 0 ? "+" : "";
      const clase = rr.acierto ? "ok" : (rr.op >= 0 ? "mal" : "nada");
      return `<div class="tr-res-linea ${clase}">
        <span>${IC.player.html(avatar(slot), 26)} ${esc(nick(slot))}</span>
        <b>${signo}${rr.pts}</b></div>`;
    };

    cont.innerHTML = hud() + `
      <div class="tr-bloque">
        <div class="tr-veredicto ${miRes.acierto ? "ok" : "mal"}">
          ${miRes.acierto ? "¡Correcto! 🎉" : (miRes.op === -2 ? "Saltaste ⏭️" : (miRes.op < 0 ? "Se acabó el tiempo ⏰" : "Incorrecto ✖"))}
        </div>
        <div class="tr-opciones revelado">
          ${opciones.map((op, i) => {
            let c = "";
            if (i === res.correcta) c = "correcta";
            else if (i === miRes.op) c = "mimala";
            return `<div class="tr-op ${c}">${esc(op)}</div>`;
          }).join("")}
        </div>
        <p class="tr-dato">🎬 ${esc(preg.dato || "")}</p>
        <div class="tr-resultados">${linea("p1")}${linea("p2")}</div>
        <button class="btn ${ultima ? "btn--amarillo" : ""}" id="tr-sig">${ultima ? "Ver resultado final 🏁" : "Siguiente ▶"}</button>
      </div>`;
    cont.querySelector("#tr-sig").onclick = () => { cont.querySelector("#tr-sig").disabled = true; siguiente(); };
  }

  /* --- 5) FIN -------------------------------------------------------------- */
  function vistaFin() {
    const p = G.puntos;
    // Si el ganador todavía no se sincronizó, lo calculo localmente (evita parpadeo).
    let gan = G.ganador;
    if (!gan) gan = p.p1 === p.p2 ? "empate" : (p.p1 > p.p2 ? "p1" : "p2");
    const gano = gan === mySlot;

    // Fanfarria de cierre (una sola vez).
    if (!finSonado) {
      finSonado = true;
      if (gan !== "empate") { gano ? IC.audio.win() : IC.audio.lose(); }
    }
    const titulo = gan === "empate" ? "¡Empate! 🤝" : (gano ? "¡Ganaste! 🏆" : "Perdiste 😅");

    cont.innerHTML = `
      <div class="tr-bloque tr-fin">
        <h2 class="tr-fin-titulo ${gan === "empate" ? "" : (gano ? "gano" : "perdio")}">${titulo}</h2>
        <div class="tr-fin-marcador">
          <div class="lado p1"><span>${IC.player.html(avatar("p1"), 30)} ${esc(nick("p1"))}</span><b>${p.p1}</b></div>
          <div class="vs">VS</div>
          <div class="lado p2"><span>${IC.player.html(avatar("p2"), 30)} ${esc(nick("p2"))}</span><b>${p.p2}</b></div>
        </div>
        <p class="muted small center">${gan === "empate" ? "Empate: no suma nadie al marcador." : "El ganador sumó 1 al marcador de la sala."}</p>
        <button class="btn" id="tr-revancha">🔁 Revancha</button>
        <button class="btn btn--ghost" id="tr-menu">Volver al menú</button>
      </div>`;
    cont.querySelector("#tr-revancha").onclick = () => revancha();
    cont.querySelector("#tr-menu").onclick = () => IC.room.backToMenu();
  }

  /* --- Cronómetro ---------------------------------------------------------- */
  function arrancarTimer(r) {
    const yaRespondi = G.respuestas && G.respuestas[r] && G.respuestas[r][mySlot];
    if (rondaConTimer !== r) {           // primera vez que veo esta pregunta
      rondaConTimer = r;
      finRonda = Date.now() + SEG * 1000;
      lastTick = 99;
    }
    pararTimer();
    if (yaRespondi) { pintarBarra(); return; }
    timerInt = setInterval(() => {
      pintarBarra();
      // Tic-tac en los últimos 5 segundos (una vez por segundo).
      const sec = Math.ceil((finRonda - Date.now()) / 1000);
      if (sec <= 5 && sec >= 1 && sec !== lastTick) { lastTick = sec; IC.audio.tick(); }
      if (Date.now() >= finRonda) {
        pararTimer();
        // Se acabó el tiempo y no respondí: envío "sin respuesta".
        if (!(G.respuestas && G.respuestas[r] && G.respuestas[r][mySlot])) responder(-1);
      }
    }, 100);
    pintarBarra();
  }
  function pintarBarra() {
    const bar = document.getElementById("trivia-timer-bar");
    if (!bar) return;
    const restante = Math.max(0, finRonda - Date.now());
    const pct = (restante / (SEG * 1000)) * 100;
    bar.style.width = pct + "%";
    bar.classList.toggle("urgente", restante < 6000);
  }
  function pararTimer() { if (timerInt) { clearInterval(timerInt); timerInt = null; } }

  /* --- Limpieza al volver al menú ----------------------------------------- */
  function destroy() {
    pararTimer();
    if (gameRef && listener) gameRef.off("value", listener);
    G = {}; rondaConTimer = -1; local50 = {}; localPista = {}; hostTimeoutRonda = -1;
    sonRevelar = -1; finSonado = false; lastTick = 0;
  }

  /* --- Registro en el hub -------------------------------------------------- */
  IC.games.register({
    id: "trivia",
    nombre: "Trivia de Cine",
    emoji: "🎬",
    desc: "Duelo a contrarreloj · terror, sagas, animación y más",
    disponible: true,
    crear, destroy
  });

})();
