/* ============================================================================
   INSERT COIN — runner.js  (juego: Fuga Maldita — endless runner 2 jugadores)
   Los dos corren la MISMA pista al mismo tiempo. El anfitrión reparte una
   semilla → ambos generan obstáculos idénticos sin sincronizar cada uno (pista
   justa). Ves al rival como un fantasma en vivo al lado. Gana quien llega más
   lejos. Cuenta 3-2-1 sincronizada para arrancar juntos.

   Motor: Phaser 4 (global window.Phaser, autohospedado en js/vendor).
   Sync:  Firebase Realtime DB (rooms/<code>/game). El host es árbitro.
   Patrón: NO se re-renderiza el contenedor en cada snapshot (rompería el
   canvas). Skeleton fijo (#run-stage para Phaser + #run-overlay para HTML).
   ============================================================================ */

(function () {
  const W = 360, H = 540;                 // tamaño lógico (se escala con FIT)
  const GROUND_Y = H - 64;
  const PLAYER_X = 64;
  const PPM = 11;                         // píxeles por metro
  const VIEW_M = W / PPM;                 // metros visibles a la derecha
  const BASE_SPEED = 9, SPEED_GROWTH = 0.02, SPEED_CAP = 27;   // m/s
  const JUMP_V = -640;

  let cont, gameRef, listener, G = {}, mySlot;
  let refs = {}, phaserGame = null, mounted = false;
  let fasePrev = null, ganadorPrev = null;
  const otro = (s) => (s === "p1" ? "p2" : "p1");

  // Estado compartido con la escena de Phaser (la escena lee de acá).
  const RS = {
    seed: 0, startAt: 0, mySlot: "p1",
    opp: { d: 0, alive: true },
    onDist: (d) => {},
    onDeath: (d) => {}
  };

  /* --- PRNG determinista + secuencia de obstáculos (puro, testeable) ------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function generarObstaculos(seed, n) {
    const r = mulberry32(seed >>> 0);
    const arr = []; let d = 42;
    for (let i = 0; i < n; i++) {
      d += 14 + Math.floor(r() * 15);          // separación 14..28 m
      arr.push({ dist: d, h: 1 + Math.floor(r() * 2) });   // alto 1..2
    }
    return arr;
  }
  window.__RUNNER_GEN = generarObstaculos;     // expuesto para el harness de test

  /* --- Arranque ----------------------------------------------------------- */
  function crear(container) {
    cont = container;
    mySlot = IC.room.mySlot; RS.mySlot = mySlot;
    gameRef = IC.room.gameRef();
    G = {}; fasePrev = null; ganadorPrev = null; mounted = false;
    construirSkeleton();

    RS.onDist = (d) => gameRef.child("run/" + mySlot).update({ d: d });
    RS.onDeath = (d) => gameRef.child("run/" + mySlot).update({ d: d, alive: false });

    listener = gameRef.on("value", (snap) => {
      G = snap.val() || {};
      const r = (G.run && G.run[otro(mySlot)]) || { d: 0, alive: true };
      RS.opp.d = r.d || 0; RS.opp.alive = r.alive !== false;
      if (IC.room.isHost() && !G.phase) { init(); return; }
      if (IC.room.isHost()) hostTick();
      update();
    });
    if (IC.room.isHost()) {
      gameRef.child("phase").get().then(s => { if (!s.exists()) init(); }).catch(() => {});
    }
    return { destroy };
  }

  function init() {
    gameRef.set({ phase: "lobby", ready: { p1: false, p2: false }, seed: null, startAt: null, run: null, ganador: null, seq: 1 });
  }

  function destroy() {
    if (gameRef && listener) gameRef.off("value", listener);
    destruirPhaser();
    G = {}; refs = {};
  }

  /* --- Árbitro ------------------------------------------------------------- */
  let hostFinDone = false;
  function hostTick() {
    if (G.phase === "lobby" && G.ready && G.ready.p1 && G.ready.p2 && !G.seed) {
      const seed = 1 + Math.floor(Math.random() * 2147483646);
      gameRef.update({
        phase: "corriendo", seed,
        startAt: hostNow() + 3600,
        run: { p1: { d: 0, alive: true }, p2: { d: 0, alive: true } },
        ganador: null
      });
      hostFinDone = false;
    }
    if (G.phase === "corriendo" && !hostFinDone && G.run &&
        G.run.p1 && G.run.p2 && G.run.p1.alive === false && G.run.p2.alive === false) {
      hostFinDone = true;
      const d1 = G.run.p1.d || 0, d2 = G.run.p2.d || 0;
      const ganador = d1 === d2 ? "empate" : (d1 > d2 ? "p1" : "p2");
      gameRef.update({ phase: "fin", ganador });
      if (ganador !== "empate") IC.scoreboard.registrarVictoria(ganador);
    }
  }

  function marcarListo() {
    if (G.phase !== "lobby") return;
    if (IC.audio) IC.audio.coin();
    gameRef.child("ready/" + mySlot).set(true);
  }

  /* =========================================================================
     SKELETON + UPDATE
     ========================================================================= */
  function construirSkeleton() {
    cont.innerHTML = `
      <div class="run-scores" id="run-scores"></div>
      <div class="run-stage" id="run-stage">
        <div class="run-overlay" id="run-overlay"></div>
      </div>`;
    refs = { scores: id("run-scores"), stage: id("run-stage"), overlay: id("run-overlay") };
  }

  function update() {
    if (!G.phase) return;
    if (G.phase !== fasePrev) {
      fasePrev = G.phase;
      if (G.phase === "corriendo" && IC.audio) IC.audio.coin();
    }
    if (G.ganador && G.ganador !== ganadorPrev) {
      ganadorPrev = G.ganador;
      if (IC.audio) (G.ganador === mySlot ? IC.audio.win() : (G.ganador === "empate" ? IC.audio.coin() : IC.audio.lose()));
    }

    pintarScores();

    if (G.phase === "lobby") {
      destruirPhaser();
      mostrarOverlay(overlayLobby());
    } else if (G.phase === "corriendo") {
      ocultarOverlay();
      if (!mounted && G.seed && G.startAt) montarPhaser(G.seed, G.startAt);
    } else if (G.phase === "fin") {
      destruirPhaser();
      mostrarOverlay(overlayFin());
    }
  }

  function pintarScores() {
    const run = G.run || {};
    const d = (s) => Math.floor((run[s] && run[s].d) || 0);
    const dead = (s) => run[s] && run[s].alive === false;
    refs.scores.innerHTML =
      `<span class="run-sc p1">${IC.player.html(av("p1"), 20)} ${d("p1")}m${dead("p1") ? " 💀" : ""}</span>
       <span class="run-sc p2">${d("p2")}m${dead("p2") ? " 💀" : ""} ${IC.player.html(av("p2"), 20)}</span>`;
  }

  function overlayLobby() {
    const yo = G.ready && G.ready[mySlot];
    const otroL = G.ready && G.ready[otro(mySlot)];
    const nom = IC.room.players[otro(mySlot)] ? esc(IC.room.players[otro(mySlot)].nick) : "el rival";
    const btn = yo
      ? `<div class="run-esperando">${otroL ? "¡Arrancamos!" : "Esperando a " + nom + "…"}</div>`
      : `<button class="btn btn--amarillo" id="run-listo">Estoy listo 🏃</button>`;
    return {
      html: `<div class="run-ov-tit">🏃 FUGA MALDITA</div>
        <p class="run-ov-sub">Corré lo más lejos que puedas.<br>Tocá la pantalla para saltar.</p>
        ${btn}`,
      wire: (el) => { const b = el.querySelector("#run-listo"); if (b) b.onclick = marcarListo; }
    };
  }
  function overlayFin() {
    const run = G.run || {};
    const md = Math.floor((run[mySlot] && run[mySlot].d) || 0);
    const od = Math.floor((run[otro(mySlot)] && run[otro(mySlot)].d) || 0);
    const won = G.ganador === mySlot, emp = G.ganador === "empate";
    const tit = emp ? "🤝 ¡Empate!" : (won ? "🏆 ¡Ganaste la fuga!" : "💀 Te alcanzó");
    return {
      html: `<div class="run-ov-tit">${tit}</div>
        <div class="run-ov-dist"><b>Vos:</b> ${md} m &nbsp;·&nbsp; <b>Rival:</b> ${od} m</div>
        <div class="run-ov-fin">
          <button class="btn" id="run-rev">🔁 Revancha</button>
          <button class="btn btn--ghost" id="run-menu">Volver al menú</button>
        </div>`,
      wire: (el) => {
        el.querySelector("#run-rev").onclick = () => { ganadorPrev = null; fasePrev = null; gameRef.remove(); };
        el.querySelector("#run-menu").onclick = () => IC.room.backToMenu();
      }
    };
  }

  /* --- Phaser: montar / destruir ------------------------------------------ */
  function montarPhaser(seed, startAt) {
    mounted = true;
    RS.seed = seed >>> 0; RS.startAt = startAt;
    const config = {
      type: Phaser.AUTO,
      parent: refs.stage,
      width: W, height: H,
      backgroundColor: "#0D0221",
      physics: { default: "arcade", arcade: { gravity: { y: 1500 }, debug: false } },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
      scene: [ensureScene()]
    };
    phaserGame = new Phaser.Game(config);
  }
  function destruirPhaser() {
    if (phaserGame) { try { phaserGame.destroy(true); } catch (_) {} phaserGame = null; }
    mounted = false;
  }

  /* --- La escena de Phaser (se define una vez, cuando Phaser ya cargó) ----- */
  let SceneClass = null;
  function ensureScene() {
    if (SceneClass) return SceneClass;
    SceneClass = class RunnerScene extends Phaser.Scene {
      constructor() { super({ key: "RunnerScene" }); }

      create() {
        this.dist = 0; this.speed = BASE_SPEED; this.dead = false;
        this.started = false; this.lastBc = 0;
        this.obs = generarObstaculos(RS.seed, 2500);
        crearTexturas(this);

        // suelo (estático) + jugador
        this.ground = this.physics.add.staticImage(W / 2, GROUND_Y + 6, "run_ground").setDisplaySize(W, 12).refreshBody();
        this.player = this.physics.add.sprite(PLAYER_X, GROUND_Y - 40, "run_player");
        this.player.setDepth(5);
        this.physics.add.collider(this.player, this.ground);

        // fantasma del rival
        this.ghost = this.add.image(PLAYER_X, GROUND_Y - 18, "run_ghost").setDepth(4).setAlpha(0.55);

        // pool de obstáculos
        this.pool = [];
        for (let i = 0; i < 10; i++) {
          const im = this.add.image(-99, GROUND_Y, "run_obs").setOrigin(0.5, 1).setDepth(3).setVisible(false);
          this.pool.push(im);
        }

        // decorado: piso neón + puntitos de fondo (parallax simple)
        this.floor = this.add.tileSprite(W / 2, GROUND_Y + 12, W, 24, "run_floor").setDepth(2);
        this.stars = this.add.tileSprite(W / 2, H / 2, W, H, "run_stars").setDepth(0).setAlpha(0.5);

        // HUD
        this.hud = this.add.text(W / 2, 14, "0 m", { fontFamily: "monospace", fontSize: "20px", color: "#FFD300" }).setOrigin(0.5, 0).setDepth(10);
        this.cd = this.add.text(W / 2, H / 2 - 30, "", { fontFamily: "monospace", fontSize: "56px", color: "#00F0FF" }).setOrigin(0.5).setDepth(11);
        this.msg = this.add.text(W / 2, H / 2 + 40, "", { fontFamily: "monospace", fontSize: "22px", color: "#FF2E97" }).setOrigin(0.5).setDepth(11);

        // input: saltar
        const saltar = () => this.saltar();
        this.input.on("pointerdown", saltar);
        this.input.keyboard && this.input.keyboard.on("keydown-SPACE", saltar);
        this.input.keyboard && this.input.keyboard.on("keydown-UP", saltar);
      }

      saltar() {
        if (this.dead || !this.started) return;
        const b = this.player.body;
        if (b && (b.blocked.down || b.touching.down)) {
          this.player.setVelocityY(JUMP_V);
          if (IC.audio) IC.audio.click();
        }
      }

      update(time, delta) {
        // cuenta regresiva / arranque sincronizado
        if (!this.started) {
          const falta = RS.startAt - Date.now();
          if (falta > 0) { this.cd.setText(String(Math.ceil(falta / 1000))); }
          else { this.started = true; this.cd.setText("¡YA!"); this.time.delayedCall(500, () => this.cd.setText("")); }
          this.ghostUpdate();
          return;
        }

        const dt = Math.min(delta, 50) / 1000;

        if (!this.dead) {
          this.speed = Math.min(SPEED_CAP, BASE_SPEED + this.dist * SPEED_GROWTH);
          this.dist += this.speed * dt;
          this.floor.tilePositionX += this.speed * dt * PPM;
          this.stars.tilePositionX += this.speed * dt * PPM * 0.3;
          this.hud.setText(Math.floor(this.dist) + " m");

          this.obstaculosUpdate();
          this.chequearChoque();

          // broadcast de distancia (~8/seg)
          if (time - this.lastBc > 120) { this.lastBc = time; RS.onDist(Math.floor(this.dist)); }
        }
        this.ghostUpdate();
      }

      obstaculosUpdate() {
        // asigno sprites del pool a los obstáculos visibles
        let pi = 0;
        for (let i = 0; i < this.obs.length && pi < this.pool.length; i++) {
          const rel = this.obs[i].dist - this.dist;
          if (rel < -2) continue;
          if (rel > VIEW_M + 2) break;
          const im = this.pool[pi++];
          const oh = 22 * this.obs[i].h;
          im.setVisible(true).setPosition(PLAYER_X + rel * PPM, GROUND_Y).setDisplaySize(20, oh);
          im._h = oh;
        }
        for (; pi < this.pool.length; pi++) this.pool[pi].setVisible(false);
      }

      chequearChoque() {
        const pb = this.player.getBounds();
        for (const im of this.pool) {
          if (!im.visible) continue;
          const ob = im.getBounds();
          if (Phaser.Geom.Intersects.RectangleToRectangle(pb, ob)) { this.morir(); return; }
        }
      }

      morir() {
        if (this.dead) return;
        this.dead = true;
        this.player.setVelocity(0, 0); this.player.body.allowGravity = false;
        this.player.setTint(0xff2e97);
        this.cameras.main.shake(250, 0.02);
        this.msg.setText("¡MORISTE! " + Math.floor(this.dist) + " m");
        if (IC.audio) IC.audio.wrong();
        RS.onDeath(Math.floor(this.dist));
      }

      ghostUpdate() {
        if (!RS.opp) { this.ghost.setVisible(false); return; }
        const rel = (RS.opp.d || 0) - this.dist;
        const x = Phaser.Math.Clamp(PLAYER_X + rel * PPM, 12, W - 12);
        this.ghost.setPosition(x, GROUND_Y - 18).setVisible(true);
        this.ghost.setAlpha(RS.opp.alive ? 0.55 : 0.22);
      }
    };
    return SceneClass;
  }

  function crearTexturas(sc) {
    const g = sc.make.graphics({ x: 0, y: 0, add: false });
    // jugador (cian con brillo)
    g.fillStyle(0x00243a, 1); g.fillRoundedRect(0, 0, 30, 38, 7);
    g.fillStyle(0x00F0FF, 1); g.fillRoundedRect(4, 4, 22, 30, 5);
    g.fillStyle(0x0d0221, 1); g.fillCircle(20, 14, 3);
    g.generateTexture("run_player", 30, 38); g.clear();
    // fantasma
    g.fillStyle(0xffffff, 0.9); g.fillRoundedRect(0, 0, 30, 38, 7);
    g.generateTexture("run_ghost", 30, 38); g.clear();
    // obstáculo (magenta, tipo lápida/púa)
    g.fillStyle(0xFF2E97, 1); g.fillRect(0, 0, 20, 44);
    g.fillStyle(0x7a0033, 1); g.fillRect(0, 0, 20, 6);
    g.generateTexture("run_obs", 20, 44); g.clear();
    // piso neón
    g.fillStyle(0x140a24, 1); g.fillRect(0, 0, 32, 24);
    g.fillStyle(0xFF2E97, 0.9); g.fillRect(0, 0, 32, 3);
    g.fillStyle(0x00F0FF, 0.5); g.fillRect(0, 6, 16, 2);
    g.generateTexture("run_floor", 32, 24); g.clear();
    // estrellas de fondo
    g.fillStyle(0x1b1040, 1); g.fillRect(0, 0, 60, 60);
    g.fillStyle(0x3a2a6a, 1); g.fillCircle(10, 12, 1.5); g.fillCircle(44, 30, 1.5); g.fillCircle(26, 48, 1);
    g.generateTexture("run_stars", 60, 60); g.clear();
    g.destroy();
  }

  /* --- overlay helpers ----------------------------------------------------- */
  function mostrarOverlay(o) {
    refs.overlay.innerHTML = o.html;
    refs.overlay.classList.remove("hidden");
    if (o.wire) o.wire(refs.overlay);
  }
  function ocultarOverlay() { refs.overlay.classList.add("hidden"); refs.overlay.innerHTML = ""; }
  function id(x) { return document.getElementById(x); }
  function av(slot) { const p = IC.room.players[slot]; return p ? p.avatar : "🎮"; }
  function hostNow() { return Date.now(); }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  IC.games.register({
    id: "runner",
    nombre: "Fuga Maldita",
    emoji: "🏃",
    desc: "Corré más lejos que tu rival · arcade en tiempo real",
    disponible: true,
    crear, destroy
  });
})();
