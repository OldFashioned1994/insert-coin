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
  const BASE_SPEED = 12, SPEED_GROWTH = 0.06, SPEED_CAP = 38;  // m/s (más rápido y acelera más)
  const JUMP_V = -720;

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
    const arr = []; let d = 40;
    for (let i = 0; i < n; i++) {
      d += 12 + Math.floor(r() * 10);          // separación 12..21 m
      const k = r();
      const kind = k < 0.6 ? 1 : (k < 0.85 ? 2 : 3);   // 1=pincho, 2=triple, 3=alto
      arr.push({ dist: d, kind });
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
    RS.myAvatar = (IC.room.players[mySlot] || {}).avatar || "jason";
    RS.oppAvatar = (IC.room.players[otro(mySlot)] || {}).avatar || "freddy";
    const config = {
      type: Phaser.AUTO,
      parent: refs.stage,
      width: W, height: H,
      backgroundColor: "#0D0221",
      physics: { default: "arcade", arcade: { gravity: { y: 1800 }, debug: false } },
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

      preload() {
        // avatares elegidos (mi personaje y el del rival)
        if (IC.player.existe(RS.myAvatar)) this.load.image("run_me", IC.player.src(RS.myAvatar));
        if (IC.player.existe(RS.oppAvatar)) this.load.image("run_op", IC.player.src(RS.oppAvatar));
      }

      create() {
        this.dist = 0; this.speed = BASE_SPEED; this.dead = false;
        this.started = false; this.lastBc = 0;
        this.obs = generarObstaculos(RS.seed, 2500);
        crearTexturas(this);

        // suelo estático
        this.ground = this.physics.add.staticImage(W / 2, GROUND_Y + 6, "run_ground").setDisplaySize(W, 12).refreshBody();

        // jugador = caja física invisible (hitbox parejo) + avatar encima
        this.player = this.physics.add.sprite(PLAYER_X, GROUND_Y - 40, "run_hit").setVisible(false);
        this.physics.add.collider(this.player, this.ground);
        const meKey = this.textures.exists("run_me") ? "run_me" : "run_box";
        this.meImg = this.add.image(PLAYER_X, this.player.y, meKey).setDepth(5).setDisplaySize(40, 40);

        // fantasma del rival = su avatar, translúcido
        const opKey = this.textures.exists("run_op") ? "run_op" : "run_box";
        this.ghost = this.add.image(PLAYER_X, GROUND_Y - 20, opKey).setDepth(4).setAlpha(0.5).setDisplaySize(34, 34);

        // pool de obstáculos (pinchos)
        this.pool = [];
        for (let i = 0; i < 12; i++) {
          const im = this.add.image(-99, GROUND_Y, "run_spike").setOrigin(0.5, 1).setDepth(3).setVisible(false);
          this.pool.push(im);
        }

        // decorado: piso neón + puntitos de fondo (parallax simple)
        this.floor = this.add.tileSprite(W / 2, GROUND_Y + 12, W, 24, "run_floor").setDepth(2);
        this.stars = this.add.tileSprite(W / 2, H / 2, W, H, "run_stars").setDepth(0).setAlpha(0.5);

        // HUD
        this.hud = this.add.text(W / 2, 14, "0 m", { fontFamily: "monospace", fontSize: "20px", color: "#FFD300" }).setOrigin(0.5, 0).setDepth(10);
        this.cd = this.add.text(W / 2, H / 2 - 30, "", { fontFamily: "monospace", fontSize: "56px", color: "#00F0FF" }).setOrigin(0.5).setDepth(11);
        this.msg = this.add.text(W / 2, H / 2 + 40, "", { fontFamily: "monospace", fontSize: "22px", color: "#FF2E97" }).setOrigin(0.5).setDepth(11);

        // input estilo Geometry Dash: tap salta; MANTENER = salta en cadena
        this.holding = false;
        const down = () => { this.holding = true; this.saltar(); };
        const up = () => { this.holding = false; };
        this.input.on("pointerdown", down);
        this.input.on("pointerup", up);
        if (this.input.keyboard) {
          this.input.keyboard.on("keydown-SPACE", down); this.input.keyboard.on("keyup-SPACE", up);
          this.input.keyboard.on("keydown-UP", down); this.input.keyboard.on("keyup-UP", up);
        }

        // estela de partículas (trail) siguiendo al cubo
        this.trail = this.add.particles(0, 0, "run_spark", {
          lifespan: 320, speed: 0, scale: { start: 1, end: 0 },
          alpha: { start: 0.75, end: 0 }, frequency: 30,
          tint: [0x00F0FF, 0xFF2E97, 0xFFD300], blendMode: "ADD"
        }).setDepth(3);
        this.trail.startFollow(this.meImg);

        // fondo que late
        this.tweens.add({ targets: this.stars, alpha: { from: 0.28, to: 0.6 }, duration: 380, yoyo: true, repeat: -1 });
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
        // el avatar siempre sigue a la caja física
        this.meImg.setPosition(this.player.x, this.player.y);

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
          // mantener apretado = saltar apenas toca el piso (Geometry Dash) + giro en el aire
          const grounded = this.player.body && (this.player.body.blocked.down || this.player.body.touching.down);
          if (this.holding && grounded) this.saltar();
          if (grounded) this.meImg.rotation = 0; else this.meImg.rotation += 9 * dt;

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
        // asigno sprites del pool a los obstáculos visibles (según su tipo)
        let pi = 0;
        for (let i = 0; i < this.obs.length && pi < this.pool.length; i++) {
          const rel = this.obs[i].dist - this.dist;
          if (rel < -2) continue;
          if (rel > VIEW_M + 2) break;
          const im = this.pool[pi++];
          const k = this.obs[i].kind;
          const tex = k === 2 ? "run_spike3" : (k === 3 ? "run_tall" : "run_spike");
          const dw = k === 2 ? 44 : 20, dh = k === 3 ? 40 : 24;
          im.setVisible(true).setTexture(tex).setPosition(PLAYER_X + rel * PPM, GROUND_Y).setDisplaySize(dw, dh);
          im._kind = k;
        }
        for (; pi < this.pool.length; pi++) this.pool[pi].setVisible(false);
      }

      chequearChoque() {
        // hitbox perdonador (estilo GD): cubo más chico que el dibujo, base del pincho angosta
        const pr = new Phaser.Geom.Rectangle(this.player.x - 9, this.player.y - 12, 18, 24);
        for (const im of this.pool) {
          if (!im.visible) continue;
          const k = im._kind || 1;
          const halfW = k === 2 ? 17 : 5;
          const top = GROUND_Y - (k === 3 ? 30 : 14);
          const or = new Phaser.Geom.Rectangle(im.x - halfW, top, halfW * 2, GROUND_Y - top);
          if (Phaser.Geom.Intersects.RectangleToRectangle(pr, or)) { this.morir(); return; }
        }
      }

      morir() {
        if (this.dead) return;
        this.dead = true; this.holding = false;
        this.player.setVelocity(0, 0); this.player.body.allowGravity = false;
        if (this.trail) this.trail.stop();
        this.explotar();
        this.meImg.setVisible(false);
        this.cameras.main.shake(260, 0.025);
        this.msg.setText("¡MORISTE! " + Math.floor(this.dist) + " m");
        if (IC.audio) IC.audio.wrong();
        RS.onDeath(Math.floor(this.dist));
      }
      explotar() {
        const b = this.add.particles(this.meImg.x, this.meImg.y, "run_spark", {
          lifespan: 480, speed: { min: 60, max: 240 }, scale: { start: 1.3, end: 0 },
          alpha: { start: 1, end: 0 }, tint: [0x00F0FF, 0xFF2E97, 0xFFD300],
          blendMode: "ADD", emitting: false
        }).setDepth(6);
        b.explode(26, this.meImg.x, this.meImg.y);
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
    // caja física invisible (hitbox parejo)
    g.fillStyle(0x00F0FF, 1); g.fillRect(0, 0, 34, 40);
    g.generateTexture("run_hit", 34, 40); g.clear();
    // avatar fallback (si el id no existe)
    g.fillStyle(0x00243a, 1); g.fillRoundedRect(0, 0, 40, 40, 8);
    g.fillStyle(0x00F0FF, 1); g.fillRoundedRect(5, 5, 30, 30, 6);
    g.generateTexture("run_box", 40, 40); g.clear();
    // pincho simple
    dibujarPincho(g, 0, 20, 24); g.generateTexture("run_spike", 20, 24); g.clear();
    // triple pincho
    dibujarPincho(g, 0, 14, 24); dibujarPincho(g, 15, 14, 24); dibujarPincho(g, 30, 14, 24);
    g.generateTexture("run_spike3", 44, 24); g.clear();
    // pincho alto
    dibujarPincho(g, 0, 20, 40); g.generateTexture("run_tall", 20, 40); g.clear();
    // chispa (partículas)
    g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 7, 7); g.generateTexture("run_spark", 7, 7); g.clear();
    // piso neón
    g.fillStyle(0x140a24, 1); g.fillRect(0, 0, 32, 24);
    g.fillStyle(0xFF2E97, 0.9); g.fillRect(0, 0, 32, 3);
    g.fillStyle(0x00F0FF, 0.5); g.fillRect(0, 6, 16, 2);
    g.generateTexture("run_floor", 32, 24); g.clear();
    // suelo (bloque base)
    g.fillStyle(0x140a24, 1); g.fillRect(0, 0, 8, 8); g.generateTexture("run_ground", 8, 8); g.clear();
    // estrellas de fondo
    g.fillStyle(0x1b1040, 1); g.fillRect(0, 0, 60, 60);
    g.fillStyle(0x3a2a6a, 1); g.fillCircle(10, 12, 1.5); g.fillCircle(44, 30, 1.5); g.fillCircle(26, 48, 1);
    g.generateTexture("run_stars", 60, 60); g.clear();
    g.destroy();
  }
  function dibujarPincho(g, x, w, h) {
    g.fillStyle(0xFF2E97, 1); g.fillTriangle(x, h, x + w / 2, 0, x + w, h);
    g.fillStyle(0x00F0FF, 0.9); g.fillTriangle(x + w / 2 - 2, 7, x + w / 2, 0, x + w / 2 + 2, 7);
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
