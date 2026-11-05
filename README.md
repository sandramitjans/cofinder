# Cofinder

**Speed dating de conocimiento** para eventos internos de Cofidis: directores y directoras de marketing
se apuntan a las mesas (temas) que les interesan, y Cofinder decide con quién se sienta cada uno en
**5 rondas de 15 minutos**. El día del evento, una pantalla grande (proyector) y el móvil de cada
participante van sincronizados en directo, y al final de cada ronda cada persona graba una nota de audio
con lo que se lleva. Esas notas se transcriben con Whisper (código abierto) y se leen por tema de mesa.

Español por defecto e inglés (selector ES / EN en todas las pantallas). React 18 + Vite + Tailwind 4,
con Supabase (base de datos, tiempo real y almacenamiento) o en modo local sin servidor.

## Las cuatro partes de la app

| Dirección | Quién | Para qué |
|---|---|---|
| `…/` | Participantes, ~2 semanas antes | Registro y espera hasta el evento |
| `…/#entrar` | Participantes, el día del evento (QR del proyector) | Entrar en el móvil con nombre + código de 4 cifras |
| `…/#admin` | Admin (PIN) | Panel de control y pantalla del proyector |
| `…/#resum` | Admin (mismo PIN) | Resúmenes: las notas de audio transcritas, por tema o por ronda |

### 1. Registro (antes del evento)

Cuatro pasos (unos 3 minutos): **Cuéntanos quién eres** (nombre, cargo, filial, foto) → **Apúntate a las
mesas** (temas que le interesan) → **Tu expertise** (nivel en cada tema) → **Tu arma secreta** (opcional,
un rasgo divertido para romper el hielo). Después, pantalla de espera con cuenta atrás hasta el evento
(`VITE_EVENT_DATE`, por defecto el 25/11/2026) y su **código de acceso de 4 cifras** para el día del evento.
Cada persona puede volver a editar su perfil.

Las mesas (temas) las crea el Admin en el panel («Mesas del evento»): título, quién la propone,
descripción y familia. Mientras no haya ninguna, se usan los 20 temas por defecto.

### 2. Plan de las rondas

En el panel, «Generar el plan» calcula de una vez las 5 rondas (`lib/matching.js`, en un worker):
mesas de 2 a 5 personas, como mucho 5 mesas por ronda, pausa de 10 minutos tras la ronda 3. Reparte
minimizando: personas en un tema que no eligieron, temas repetidos, parejas que ya coincidieron y personas
de la misma filial (reparto voraz + enfriamiento simulado). El panel muestra la calidad del plan y permite
intercambiar o mover a alguien con dos clics, o regenerar una ronda.

### 3. El día del evento: proyector + móviles en directo

| Momento | Proyector | Móvil de cada participante |
|---|---|---|
| Llegada | Solo el **QR** | «Inicia sesión» (usuario = nombre, contraseña = código) → **«Estas son las mesas en las que participarás»** (mesa y tema de cada ronda) → botón **Preparado** → espera con frases que van cambiando |
| Todos preparados | Empieza solo (o «Empezar la sesión» en el panel) | |
| Encuentra tu mesa (2 min) | Todas las mesas con los nombres y la cuenta atrás | Círculo «Empezamos en», mesa + tema y compañeros |
| Conversación (15 min) | Cronómetro grande | Tema, cronómetro, compañeros de mesa y **«Para romper el hielo»** (preguntas sobre el tema) |
| Tiempo terminado | «On hold» con «X de Y notas enviadas» | Grabar una **nota de audio** (máx. 1 min: de qué se ha hablado, aprendizajes, highlight) → escuchar / volver a grabar → Continuar → espera |
| Todas las notas enviadas | Pasa solo a la ronda siguiente (o a la pausa tras la ronda 3, o al final) | |
| Final | Cierre | «Gracias por compartir»: cada ronda con su tema, compañeros y su nota |

El Admin controla todo con la barra de abajo del proyector o con el panel: **Siguiente** (también Espacio,
→ o el mando de presentación) y **←** para deshacer. «Siguiente» hace en cada momento lo esperable: salta
los 2 minutos de buscar mesa, **termina la conversación** (los móviles pasan a grabar la nota) o pasa
a la ronda siguiente aunque falte alguna nota. En el panel se ven los códigos de todos, quién está
conectado (punto verde), cuántos están preparados y cuántas notas han llegado. «Volver al principio»
reinicia la sesión para ensayar (todos vuelven a «no preparados» y se borran las notas).

Los cambios llegan a los móviles al instante por websockets (Supabase Realtime). Cada móvil anuncia su
conexión con una huella de su identificador, nunca con el identificador en sí. Si el websocket se corta,
el panel vuelve a pedir el estado cada 15 s.

### 4. Resúmenes y transcripción (`#resum`)

Página aparte, con el PIN de Admin, que funciona en cualquier ordenador sin tener el panel abierto:

- **Por tema** (por defecto): una tarjeta por tema de mesa con las notas de todas las personas que han
  hablado de él (de cualquier ronda), indicando ronda y mesa. **Por ronda**: ronda → mesa → notas.
- Buscador (persona, tema o palabra), filtro por ronda, se actualiza sola cada 20 s.
- Descarga en **.txt** o **Excel (.csv)**.

**Transcribir en este ordenador:** la transcripción la hace el navegador del ordenador que tenga `#resum`
abierta, con [Whisper](https://github.com/openai/whisper) en versión navegador
([Transformers.js](https://github.com/huggingface/transformers.js), código abierto). Gratis, sin Python, sin
Docker, sin servidor propio, y los audios no salen a ninguna empresa. Mientras la página esté abierta,
cada 20 s transcribe las notas nuevas y guarda el texto. Si nadie la tiene abierta, los audios esperan
guardados y se transcriben cuando alguien la abra.

- El modelo se descarga de huggingface.co la primera vez y queda en la caché del navegador:
  «Preciso» (whisper-small, ≈ 250 MB, recomendado) o «Rápido» (whisper-base, ≈ 80 MB).
- Con WebGPU (Chrome o Edge recientes) va mucho más rápido; si no, usa la CPU (WebAssembly).
- El motor (ONNX Runtime) se sirve desde la propia web, no desde un CDN.
- Para que funcione, el móvil guarda una copia del audio en la base de datos (≈ 250 KB por nota de 1 min,
  grabada a 32 kbps). Las notas grabadas antes de activar esto no tienen copia y no se pueden transcribir.

**Alternativa en servidor:** `transcriptor/` es un pequeño servicio en Python con
[faster-whisper](https://github.com/SYSTRAN/faster-whisper) que hace lo mismo desde un servidor
(lee los audios del bucket `audio-notes`). Instrucciones en `transcriptor/LEEME.md`. No hace falta si se
usa la transcripción en el navegador.

## Probar y publicar

```bash
npm install
npm run dev      # http://localhost:5173 (también en la red local, para probar con móviles)
npm run build
```

Sin variables de Supabase, la app funciona en **modo local**: todo se guarda en el navegador (PIN `2026`).
Sirve para probar pantallas y el flujo completo en varias pestañas, pero sin transcripción. Más detalle en
`TESTEAR-EN-LOCAL.md`.

Configuración en un fichero `.env` (ver `.env.example`):

```
VITE_SUPABASE_URL=…                            # sin estas dos → modo local
VITE_SUPABASE_ANON_KEY=…                       # clave publicable (pensada para el navegador)
VITE_MOD_PIN=2026                              # solo modo local; con Supabase el PIN está en la base de datos
VITE_EVENT_DATE=2026-11-25T00:00:00+01:00      # fin de la cuenta atrás
VITE_PUBLIC_URL=http://192.168.1.20:5173       # opcional: dirección que codifica el QR
```

**Publicación:**
- **GitHub Pages** (`.github/workflows/pages.yml`, se lanza a mano o con cada push a `main`):
  desde `main` usa la base real (secretos del repositorio); desde cualquier otra rama, la base de
  **pruebas**. Prueba actual: https://sandramitjans.github.io/cofinder/ (rama `prototipo-visual`).
- **Netlify** (`netlify.toml`): la web publicada original, con la base de París.
- Para la versión definitiva en un servidor propio con dominio basta servir la carpeta `dist/`
  (es una web estática). No necesita Python ni Docker.

Si tras publicar se ve la versión anterior, abrir en una ventana de incógnito (caché del navegador).

## Base de datos (Supabase)

Dos proyectos: **`cofinder`** (París, la web de Netlify) y **pruebas** (`uppsizyvtnyvvtmgyeff`, la de
GitHub Pages desde ramas que no son `main`).

| Pieza | Qué es | Quién accede |
|---|---|---|
| `public.participants` | Perfiles, código de acceso, «preparado». Nunca se borran: se marcan `removed` | Clave pública: solo insertar. No se puede listar |
| `private.event_state` | Plan de rondas y mesas | Solo con funciones que piden el PIN |
| `public.event_status` | Señal sin datos personales (ronda, versión) | Lectura pública + tiempo real |
| `public.audio_notes` | Nota de audio de cada persona y ronda: ruta, copia del audio y transcripción | Solo con funciones (participante: enviar la suya; Admin: leer, con PIN) |
| `public.mesa_topics` | Mesas del evento | Lectura pública; cambios con PIN |
| Bucket `audio-notes` | Audios (privado, solo subir) | Los móviles suben; se leen desde Supabase o el transcriptor de servidor |
| `private.settings` | Hash bcrypt del PIN | Nadie desde fuera |

Funciones (RPC), todas `security definer`:
- **Participante:** `get_my_profile`, `get_my_table` (su mesa, sus compañeros y su plan),
  `participant_login` (nombre + código; 30 fallos en 10 min bloquean), `set_my_ready`, `submit_audio_note`.
- **Admin** (exigen el PIN; 10 fallos en 10 min bloquean): `mod_check_pin`, `mod_get_state`, `mod_set_event`,
  `mod_reset_ready`, `mod_clear_notes`, `mod_get_notes`, `mod_pending_audio`, `mod_get_audio`,
  `mod_save_transcript`, mesas, demo, `mod_set_pin`…

Cambiar el PIN (SQL Editor de Supabase):

```sql
select public.mod_set_pin('PIN_ACTUAL', 'PIN_NUEVO');
```

### Montar una base nueva

En el SQL Editor de Supabase, ejecutar en este orden (cada script se puede repetir sin problema):

1. `supabase/00-esquema-base.sql`: tablas, funciones y PIN
2. `supabase/2026-11-prototipo.sql`: bucket `audio-notes`
3. `supabase/2026-11-mesas.sql` y `supabase/2026-11-mesas-familia.sql`: mesas del evento desde el panel
4. `supabase/2026-11-acceso-movil.sql`: código de 4 cifras y entrada desde el móvil
5. `supabase/2026-11-preparados.sql`: «Preparado» y el plan de cada persona
6. `supabase/2026-11-notas-audio.sql`: notas de audio de cada ronda
7. `supabase/2026-11-resumenes.sql`: página `#resum`
8. `supabase/2026-11-transcribir-navegador.sql`: transcripción en el navegador

La clave secreta de Supabase (`service_role`) nunca va en la web ni en GitHub: solo la usaría el
transcriptor de servidor, en su `.env`.

## Estructura del código

```
src/
├── App.jsx                     # Router: #resum aparte; el resto, vistas + guardas (PIN, sesión)
├── constants/index.js          # Rondas, minutos, tamaños de mesa, temas, enlaces (#admin, #entrar, #resum)
├── context/AppContext.jsx      # Estado y acciones: registro, acceso, rondas, preparados, notas
├── context/I18nContext.jsx     # Idioma, t(), nombres de temas
├── lib/
│   ├── backend.js              # Supabase: RPC, tiempo real, presencia, subida de audios
│   ├── matching.js · planner.worker.js   # Plan de las 5 rondas
│   ├── audioNotes.js           # Grabar / guardar notas (también en el dispositivo)
│   ├── browserTranscriber.js · whisper.worker.js   # Whisper en el navegador (#resum)
│   ├── icebreakers.js          # «Para romper el hielo» por tema (ES / EN)
│   ├── i18n.js                 # Todos los textos ES / EN
│   └── topics.js · demo.js · useCountdown.js · useTimeLeft.js · useConnected.js · image.js
├── components/                 # ModeratorGate (PIN), TopicPicker, LevelPicker, ui/ (Logo, Button, Avatar…)
└── views/
    ├── RegisterView.jsx        # Registro en 4 pasos y edición del perfil
    ├── WaitingView.jsx         # Espera hasta el evento + código de acceso
    ├── LoginView.jsx           # #entrar: nombre + código
    ├── MyTablesView.jsx        # Mis mesas + «Preparado»
    ├── LobbyView.jsx           # Espera con frases
    ├── HomeView.jsx            # Decide qué pantalla ve el móvil
    ├── RoundCardView.jsx       # Encuentra tu mesa · ronda · nota de audio · cierre
    ├── ModeratorPanelView.jsx  # Panel de Admin
    ├── ProjectorView.jsx       # Pantalla grande
    └── ResumView.jsx           # #resum: resúmenes y transcripción
supabase/                       # Scripts SQL (ver «Montar una base nueva»)
transcriptor/                   # Alternativa: transcriptor de servidor (faster-whisper)
```
