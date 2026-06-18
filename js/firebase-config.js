/* ============================================================================
   ★★★  ESTE ES EL ÚNICO ARCHIVO QUE TENÉS QUE EDITAR VOS  ★★★
   ----------------------------------------------------------------------------
   Acá van las claves de TU proyecto de Firebase. Son las que conectan la app
   con tu base de datos en la nube.

   ¿De dónde saco esto? El README.md te explica paso a paso, pero en resumen:
   Firebase  →  Configuración del proyecto  →  "Tus apps"  →  Config.
   Copiá los valores y reemplazá los de abajo (dejá las comillas).

   El dato MÁS importante es "databaseURL": SIN ese campo no funciona el
   tiempo real. Asegurate de que esté y que termine en ".firebasedatabase.app"
   (o ".firebaseio.com").

   ⚠️ ¿Es seguro que estas claves estén a la vista en GitHub? Sí: en Firebase
   estas claves son públicas por diseño. Lo que protege tu base son las
   "Reglas de seguridad" (ver README). No pongas acá contraseñas de verdad.
   ============================================================================ */

window.FIREBASE_CONFIG = {
  apiKey: "PEGÁ_TU_API_KEY_ACÁ",
  authDomain: "PEGÁ_TU_AUTH_DOMAIN_ACÁ",
  databaseURL: "PEGÁ_TU_DATABASE_URL_ACÁ",   // ← imprescindible para el tiempo real
  projectId: "PEGÁ_TU_PROJECT_ID_ACÁ",
  storageBucket: "PEGÁ_TU_STORAGE_BUCKET_ACÁ",
  messagingSenderId: "PEGÁ_TU_SENDER_ID_ACÁ",
  appId: "PEGÁ_TU_APP_ID_ACÁ"
};
