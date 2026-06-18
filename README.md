# 🎮 INSERT COIN

Un **hub de juegos para jugar de a dos**, cada uno desde su celular, en lugares distintos.
Funciona en el navegador (es una **PWA**: se puede "instalar" en la pantalla de inicio), se aloja
**gratis** en GitHub Pages y usa **Firebase** para el tiempo real (que los dos teléfonos se sincronicen).

**Primer juego:** 🎬 **Trivia de Cine** — duelo a contrarreloj con categorías (¡incluida Terror y Slasher!),
apuestas de confianza, comodines (50/50, pista, saltar) y bonus por racha.

> ⚠️ **Antes de que funcione el multijugador tenés que hacer UNA configuración (Firebase).**
> Está todo explicado abajo, paso a paso y sin terminal. Tranqui que es fácil.

---

## 🗺️ Cómo está organizado (para ubicarte)

```
insert-coin/
├── index.html                 ← la app (se abre esto)
├── manifest.webmanifest        ← datos de la PWA
├── service-worker.js           ← hace que sea instalable
├── database.rules.json         ← reglas de seguridad de Firebase (copiar/pegar)
├── css/                        ← estilos (estética neón)
├── assets/                     ← imágenes e íconos
└── js/
    ├── firebase-config.js      ← ★ ACÁ van TUS claves de Firebase (lo editás vos)
    ├── ... (cáscara: salas, chat, marcador, menú)
    ├── game-registry.js        ← ★ lista de juegos (para sumar nuevos)
    └── games/trivia/           ← el juego de trivia + su banco de preguntas
```

El **único archivo que vas a tocar** para que funcione es `js/firebase-config.js`.

---

## 🔥 PASO 1 — Configurar Firebase (de cero, sin instalar nada)

Firebase es un servicio **gratis** de Google. Se entra **con tu Gmail**.

### 1.1 Crear el proyecto
1. Entrá a **https://console.firebase.google.com/** e iniciá sesión con tu Gmail.
2. Clic en **"Crear un proyecto"** (o "Add project").
3. Ponele un nombre (ej. `insert-coin`). Seguí los pasos. Podés **desactivar Google Analytics** (no hace falta).
4. Esperá a que se cree y entrá al proyecto.

### 1.2 Crear la base de datos en tiempo real
1. En el menú de la izquierda: **Compilación (Build) → Realtime Database**.
   > 👀 Ojo: es **"Realtime Database"**, NO "Firestore". Son distintas.
2. Clic en **"Crear base de datos" (Create Database)**.
3. Elegí la ubicación que te ofrezca (ej. *United States* o *Belgium*, da igual).
4. Cuando pregunte el modo, elegí **"Iniciar en modo de prueba" (test mode)** y confirmá.
   (Las reglas buenas las ponemos en el punto 1.4.)

### 1.3 Registrar la app web y copiar las claves
1. Clic en el **engranaje ⚙️** (arriba a la izquierda) → **Configuración del proyecto**.
2. Bajá hasta **"Tus apps"** y clic en el ícono **web `</>`**.
3. Ponele un apodo (ej. `insert-coin-web`) y registrá. **No** marques "Hosting".
4. Te va a mostrar un bloque de código con un objeto `firebaseConfig = { ... }`. **Eso es lo que necesitás.**
5. Abrí el archivo `js/firebase-config.js` de este proyecto y **reemplazá** cada valor por el tuyo:

   | En firebase-config.js | Copiá de Firebase el valor de… |
   |---|---|
   | `apiKey` | `apiKey` |
   | `authDomain` | `authDomain` |
   | `databaseURL` | `databaseURL` ← **¡el más importante!** |
   | `projectId` | `projectId` |
   | `storageBucket` | `storageBucket` |
   | `messagingSenderId` | `messagingSenderId` |
   | `appId` | `appId` |

   > 🟡 Si **no ves `databaseURL`** en el código que te dio Firebase, copialo desde la pantalla de
   > Realtime Database (es la URL que aparece arriba, termina en `.firebasedatabase.app` o `.firebaseio.com`).
   > **Sin ese campo no anda el tiempo real.**

   > 🔒 ¿Es seguro dejar estas claves a la vista en GitHub? **Sí.** En Firebase son públicas por diseño;
   > lo que protege la base son las *reglas* del paso siguiente.

### 1.4 Poner las reglas de seguridad
1. Volvé a **Realtime Database** y entrá a la pestaña **"Reglas" (Rules)**.
2. Borrá lo que haya y **pegá el contenido del archivo `database.rules.json`** de este proyecto.
   (Podés pegar solo la parte de `"rules": { ... }` o todo; Firebase ignora el comentario.)
3. Clic en **"Publicar" (Publish)**.

✅ Listo Firebase. Ya tenés tiempo real con reglas básicas.

---

## 🚀 PASO 2 — Subir a GitHub y publicar (GitHub Pages)

Esto ya lo hiciste antes, así que te va a sonar. Todo desde la web, sin terminal.

### 2.1 Crear el repositorio
1. En **https://github.com/** → botón **"New"** (repositorio nuevo).
2. Nombre: ej. `insert-coin`. Marcá **Public**. Creá el repo.

### 2.2 Subir los archivos
1. En el repo vacío, clic en **"uploading an existing file"** (o **Add file → Upload files**).
2. **Arrastrá TODO el contenido** de la carpeta `insert-coin` (incluidas las subcarpetas `css`, `js`, `assets`).
   > 💡 Tip: seleccioná todos los archivos/carpetas de adentro de `insert-coin` y soltalos en la página.
   > Asegurate de que `index.html` quede en la **raíz** del repo (no dentro de otra carpeta).
3. Abajo, clic en **"Commit changes"**.

### 2.3 Activar GitHub Pages
1. En el repo: **Settings → Pages**.
2. En **"Build and deployment" → Source**, elegí **"Deploy from a branch"**.
3. En **Branch**, elegí **`main`** y carpeta **`/ (root)`**. **Save**.
4. Esperá ~1 minuto y recargá. Te va a aparecer la URL pública, algo como:
   `https://TU-USUARIO.github.io/insert-coin/`

> 🛠️ **Para los próximos cambios** (sin pelearte subiendo archivos a mano): te recomiendo instalar
> **GitHub Desktop** (https://desktop.github.com/) — es una app visual, sin comandos, para subir
> cambios con un par de clics.

---

## 📱 PASO 3 — Probar entre dos teléfonos

1. **Celular 1:** abrí la URL de GitHub Pages → **Press Start** → poné tu apodo (botón "Soy Nico"
   lo completa solo) y elegí avatar → **Crear sala**. Te da un **código de 4 letras**.
2. **Celular 2:** abrí la **misma URL** → **Press Start** → apodo + avatar → **Unirse con código** →
   escribí el código del celular 1 → **Entrar**.
3. En los dos teléfonos deberían verse **ambos jugadores conectados** (puntito verde).
4. Tocá **Trivia de Cine** y… ¡a jugar! Probá el chat 💬 (burbuja abajo a la derecha) y fijate que
   el **marcador** sume cuando termina una partida.

**Para instalarla como app (PWA):**
- **Android (Chrome):** menú ⋮ → **"Agregar a la pantalla principal"**.
- **iPhone (Safari):** botón **Compartir** → **"Agregar a inicio"**.

> ℹ️ El multijugador necesita **https**, y GitHub Pages ya lo da. Si abrís el `index.html` con doble
> clic desde la compu (file://), vas a ver el diseño pero **el tiempo real no conecta**: probá siempre
> desde la URL de GitHub Pages.

---

## ➕ Cómo agregar un juego nuevo más adelante

La cáscara (salas, chat, marcador, menú) ya está hecha. Sumar un juego es **enchufar una pieza**:

1. Creá la carpeta `js/games/mi-juego/` con `mi-juego.js` (y si querés, `mi-juego.css`).
2. Al final de tu `mi-juego.js`, registralo:
   ```js
   IC.games.register({
     id: "mi-juego",
     nombre: "Mi Juego",
     emoji: "🎲",
     desc: "Una línea corta",
     disponible: true,
     crear(container) {
       // Dibujá tu juego dentro de `container`.
       // Para sincronizar entre los dos, usá el estado compartido:
       //   IC.room.gameRef("algo").set(valor)   ← escribir
       //   IC.room.gameRef("algo").on("value", s => ...)  ← escuchar
       //   IC.room.isHost()      → ¿soy quien creó la sala? (útil como "árbitro")
       //   IC.room.mySlot        → "p1" o "p2"
       //   IC.room.players       → datos de los dos jugadores
       //   IC.scoreboard.registrarVictoria("p1" | "p2")  ← sumar al marcador
       return { destroy() { /* apagá timers y escuchas (.off) al volver al menú */ } };
     }
   });
   ```
3. Agregá su `<script>` en `index.html`, **después** de `game-registry.js`
   (y de su `<link>` de CSS arriba, si tiene). También sumá los archivos a la lista del
   `service-worker.js` (y subí la versión `v1`→`v2`).

¡Listo! El menú lo muestra solo y reusa salas, chat, marcador y perfil.
Mirá `js/games/trivia/` como ejemplo completo.

---

## ⚙️ Ajustes rápidos de la trivia

En `js/games/trivia/trivia.js`, arriba de todo:
- `TOTAL` → cantidad de preguntas por partida (por defecto **10**).
- `SEG` → segundos por pregunta (por defecto **20**).
- `MULT` / `PENAL` → cuánto pagan/cuestan las apuestas.

**Sumar preguntas:** abrí `js/games/trivia/preguntas.js`, copiá un bloque y cambialo.
Verificá que `ok` apunte a la opción correcta (se cuenta desde **0**: la primera opción es `0`).

---

## 🆘 Si algo no anda

- **"Falta configurar Firebase":** todavía no pegaste tus claves en `js/firebase-config.js`,
  o falta el `databaseURL`.
- **Entro pero no se ven los dos / no sincroniza:** revisá que publicaste las **reglas**
  (Paso 1.4) y que el `databaseURL` sea el correcto.
- **No carga la app en el celu:** abrí la URL de **GitHub Pages** (https), no el archivo local.
- **Cambié algo y el celu sigue mostrando lo viejo:** subí la versión del caché en
  `service-worker.js` (`insert-coin-v1` → `insert-coin-v2`) y recargá.

¡A jugar! 🍿
