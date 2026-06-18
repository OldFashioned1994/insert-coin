/* ============================================================================
   INSERT COIN — hub.js
   El "director de orquesta": arranca todo, navega entre pantallas, maneja el
   alta del jugador, crear/unirse a salas, el menú de juegos y la entrada/salida
   de cada juego. Es el último script que se carga.
   ============================================================================ */

(function () {
  const $ = (id) => document.getElementById(id);

  let avatarSel = "🎮";
  let activeGameId = null;     // juego que se está jugando ahora
  let gameController = null;   // controlador devuelto por el juego (para destruirlo)

  /* --- Helpers de UI ------------------------------------------------------- */
  function mostrar(id) {
    document.querySelectorAll(".screen").forEach((s) => (s.hidden = true));
    $(id).hidden = false;
  }
  function toast(msg, ms = 2200) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }

  /* =========================================================================
     ARRANQUE
     ========================================================================= */
  function init() {
    IC.player.load();
    const ok = IC.fb.init();          // intenta conectar Firebase

    construirAvatars();
    construirMenuJuegos();
    wireInicio(ok);
    wirePerfil(ok);
    wireUnirse(ok);
    wireSala();

    // Escucha de jugadores (se registra una sola vez).
    IC.bus.on("players-changed", renderPlayers);

    // ¿Hay una sala guardada de antes? Ofrezco volver.
    const saved = IC.room.getSaved();
    if (saved && ok) $("btn-resume").classList.remove("hidden");

    if (!ok) {
      // Aviso suave: la app abre, pero sin Firebase no hay multijugador.
      setTimeout(() => toast("⚠️ Falta configurar Firebase (ver README)", 4000), 800);
    }
  }

  /* --- Avatares ------------------------------------------------------------ */
  function construirAvatars() {
    const cont = $("avatars");
    avatarSel = IC.player.data.avatar || IC.player.AVATARES[0];
    cont.innerHTML = IC.player.AVATARES.map((a) =>
      `<button class="avatar-opt" data-av="${a}" aria-pressed="${a === avatarSel}">${a}</button>`
    ).join("");
    cont.querySelectorAll(".avatar-opt").forEach((b) => {
      b.onclick = () => {
        avatarSel = b.dataset.av;
        cont.querySelectorAll(".avatar-opt").forEach((x) =>
          x.setAttribute("aria-pressed", x === b));
      };
    });
    if (IC.player.data.nick) $("in-nick").value = IC.player.data.nick;
  }

  /* --- Menú de juegos (se arma desde el registro) -------------------------- */
  function construirMenuJuegos() {
    const grid = $("game-grid");
    grid.innerHTML = IC.games.todos().map((g) => `
      <button class="game-card ${g.disponible ? "" : "locked"}" data-game="${g.id}" ${g.disponible ? "" : "disabled"}>
        <span class="emoji">${g.emoji}</span>
        <span class="info">
          <span class="nombre">${g.nombre}</span>
          <span class="desc">${g.desc}</span>
        </span>
        ${g.disponible ? "" : `<span class="badge">Pronto</span>`}
      </button>`).join("");

    grid.querySelectorAll(".game-card:not(.locked)").forEach((b) => {
      b.onclick = () => {
        if (!IC.room.ambosConectados()) {
          toast("Esperá a que entre la otra persona 👫");
          return;
        }
        IC.room.launchGame(b.dataset.game);
      };
    });
  }

  /* --- Pantalla de inicio -------------------------------------------------- */
  function wireInicio(ok) {
    $("btn-start").onclick = () => { mostrar("screen-perfil"); setTimeout(() => $("in-nick").focus(), 100); };
    $("btn-resume").onclick = async () => {
      try {
        await IC.room.resume(IC.room.getSaved());
        entrarASala();
      } catch (e) { toast(e.message); $("btn-resume").classList.add("hidden"); }
    };
    // Botones "volver" (flechita ‹) de todas las pantallas.
    document.querySelectorAll("[data-volver]").forEach((b) =>
      b.onclick = () => mostrar(b.dataset.volver));
  }

  /* --- Pantalla de perfil -------------------------------------------------- */
  function wirePerfil(ok) {
    document.querySelectorAll("[data-quickname]").forEach((b) =>
      b.onclick = () => { $("in-nick").value = b.dataset.quickname; });

    $("btn-crear").onclick = async () => {
      const nick = $("in-nick").value.trim();
      if (!nick) { toast("Poné tu apodo 🙂"); return; }
      IC.player.set(nick, avatarSel);
      if (!IC.fb.configurado) { toast("⚠️ Configurá Firebase primero (ver README)"); return; }
      $("btn-crear").disabled = true;
      try {
        await IC.room.create();
        entrarASala();
      } catch (e) { toast("No pude crear la sala: " + e.message); }
      finally { $("btn-crear").disabled = false; }
    };

    $("btn-ir-unirse").onclick = () => {
      const nick = $("in-nick").value.trim();
      if (!nick) { toast("Poné tu apodo 🙂"); return; }
      IC.player.set(nick, avatarSel);
      mostrar("screen-unirse");
      setTimeout(() => $("in-code").focus(), 100);
    };
  }

  /* --- Pantalla de unirse -------------------------------------------------- */
  function wireUnirse(ok) {
    const inp = $("in-code");
    inp.addEventListener("input", () => {
      inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
      $("unirse-error").textContent = "";
    });
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") $("btn-entrar").click(); });

    $("btn-entrar").onclick = async () => {
      if (!IC.fb.configurado) { toast("⚠️ Configurá Firebase primero (ver README)"); return; }
      const code = inp.value.trim();
      $("btn-entrar").disabled = true;
      try {
        await IC.room.join(code);
        entrarASala();
      } catch (e) { $("unirse-error").textContent = e.message; }
      finally { $("btn-entrar").disabled = false; }
    };
  }

  /* --- Pantalla de sala (botones fijos) ------------------------------------ */
  function wireSala() {
    $("btn-copiar-code").onclick = () => copiar(IC.room.code, "Código copiado 📋");

    $("btn-compartir").onclick = () => {
      const code = IC.room.code;
      const url = location.origin + location.pathname;
      const texto = `¡Te invito a jugar en INSERT COIN! 🎮\nEntrá con el código: ${code}\n${url}`;
      if (navigator.share) navigator.share({ title: "INSERT COIN", text: texto }).catch(() => {});
      else copiar(texto, "Invitación copiada 📋");
    };

    $("btn-salir-sala").onclick = async () => {
      await IC.room.leave();
      IC.chat.apagar();
      IC.scoreboard.apagar();
      activeGameId = null; gameController = null;
      $("btn-resume").classList.add("hidden");
      mostrar("screen-inicio");
    };

    $("btn-volver-menu").onclick = () => IC.room.backToMenu();
  }

  /* =========================================================================
     ENTRAR A LA SALA (después de crear o unirse)
     ========================================================================= */
  function entrarASala() {
    const code = IC.room.code;
    $("btn-copiar-code").textContent = code;
    $("code-grande").textContent = code;

    IC.scoreboard.init();
    IC.chat.init();
    renderPlayers(IC.room.players);

    // Navegación según el juego activo (la maneja el estado compartido).
    // room.leave() desengancha la escucha anterior, así que la re-enganchamos
    // en cada entrada a una sala.
    IC.room.watchCurrentGame(onCurrentGame);

    mostrar("screen-sala");
  }

  /* --- Render de los jugadores en la sala ---------------------------------- */
  function renderPlayers(players) {
    players = players || {};
    const cont = $("players");
    if (!cont) return;
    const chip = (slot) => {
      const p = players[slot];
      if (!p) return "";
      return `<div class="player-chip ${slot}">
        <span class="av">${p.avatar || "🎮"}</span>
        <span>${escape(p.nick)}</span>
        <span class="estado ${p.online ? "on" : ""}"></span>
      </div>`;
    };
    cont.innerHTML = chip("p1") + chip("p2");

    // Aviso de "esperando al otro": visible mientras no estén los dos online.
    const aviso = $("aviso-esperando");
    if (aviso) aviso.style.display = IC.room.ambosConectados() ? "none" : "block";
  }

  /* --- Entrada/salida de un juego ------------------------------------------ */
  function onCurrentGame(id) {
    if (id) {
      if (activeGameId === id) return;        // ya estoy en ese juego
      const g = IC.games.get(id);
      if (!g) return;
      activeGameId = id;
      $("juego-titulo").textContent = g.nombre;
      const c = $("juego-container");
      c.innerHTML = "";
      gameController = g.crear(c, {});
      mostrar("screen-juego");
    } else {
      if (gameController && gameController.destroy) gameController.destroy();
      gameController = null;
      activeGameId = null;
      mostrar("screen-sala");
    }
  }

  /* --- Utilidades ---------------------------------------------------------- */
  function copiar(texto, msgOk) {
    if (navigator.clipboard) navigator.clipboard.writeText(texto).then(() => toast(msgOk)).catch(() => toast("No pude copiar"));
    else toast(texto);
  }
  function escape(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  // El script va al final del body, así que el DOM ya está listo.
  init();
})();
