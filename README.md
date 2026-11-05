# Cofinder

"Tinder profesional" de competencias para dinamizar sesiones de networking interno.

## Arranque

```bash
npm install
npm run dev      # http://localhost:5173 (expuesto en la red local para probar en móviles)
npm run build
```

Configuración opcional en un fichero `.env`:

```
VITE_SUPABASE_URL=…                            # sin estas dos variables → modo local (localStorage)
VITE_SUPABASE_ANON_KEY=…
VITE_MOD_PIN=2026                              # solo modo local; en producción el PIN está en la base de datos
VITE_EVENT_DATE=2026-11-25T00:00:00+01:00      # fin de la cuenta atrás (por defecto, medianoche del 25/11)
```

## Idiomas
Francés por defecto e inglés, con selector FR/EN en todas las cabeceras (se recuerda por dispositivo).
Todos los textos están en `src/lib/i18n.js`. Temas y sucursales se guardan como identificadores
(`ai_guru`, `es`…), así que el mismo perfil se muestra traducido en cualquier idioma.

## Pre-registro «Cofinder : Le Speed-Dating des Directeurs»
Concepto VIP speed-dating, elegante y con humor (Playfair Display + Inter, rojo #DF0140 y amarillo #fdc100).

1. **Votre profil** — Nom, Poste, Filiale / Département (texto libre con sugerencias; si coincide con una
   filial conocida se guarda como identificador y se traduce).
2. **Vos compétences** — una única lista de 20 temas (`TOPICS`) con dos selecciones independientes (1–5 cada una):
   *Ce que vous apportez au rendez-vous* (Offre) y *Ce que vous cherchez à explorer* (Demande).
3. **Votre arme secrète au quotidien** — facultativo, hasta 3 de 11 rasgos (`SUPERPOWERS`). No influyen en las
   mesas; aparecen en la tarjeta de mesa de los compañeros como rompehielos.

Barra **Indice d’attractivité** (Profil timide… → Premier regard → Potentiel élevé ! → Coup de cœur en vue →
Irrésistible !). El 100 % exige al menos un arma secreta. Al validar: tarjeta **VIP Pass** que entra girando,
sello **PROFIL VALIDÉ & MATCH READY !** con corazones, y pantalla de espera con cuenta atrás al 25/11 y
«Le mot de Cupidon» rotativo.

## Flujo

| Quién | Qué ve |
|---|---|
| Todos (moderadora incluida), 2 semanas antes | Pre-registro speed-dating → tarjeta VIP + sello MATCH READY → espera con cuenta atrás al 25/11 y frases de Cupidon. Ninguna pista sobre mesas ni rondas. |
| Participantes, día del evento | La misma URL. En cuanto la moderadora inicia la Ronda 1, su pantalla pasa sola a la tarjeta de mesa y cambia en cada ronda. |
| Moderadora | Acceso oculto: candado casi invisible del pie de página o enlace directo `…/#moderadora` → PIN → Panel de control (listado, rondas, calidad del reparto, proyector). Se vuelve a bloquear con «Bloquear» o al cerrar la pestaña. |

La moderadora es un participante más para el algoritmo: lo único que la distingue es conocer el PIN.

## Estructura

```
src/
├── App.jsx                      # Router + guardas (PIN, sesión)
├── constants/index.js           # VIEWS, PIN, temas, sucursales, parámetros de rondas
├── context/AppContext.jsx       # Estado global y acciones (registro, rondas, acceso)
├── context/I18nContext.jsx      # Idioma actual, t(), formato de fechas
├── lib/
│   ├── matching.js              # Algoritmo de mesas multi-ronda
│   ├── demo.js                  # 12 participantes de prueba
│   ├── i18n.js                  # Textos ES / EN
│   ├── useTimeLeft.js           # Cuenta atrás al evento
│   └── useCountdown.js          # Cronómetro de ronda
├── components/
│   ├── ModeratorGate.jsx        # Modal de PIN
│   ├── AttractivenessMeter.jsx  # Barra «Indice d’attractivité»
│   ├── layout/PublicFooter.jsx  # Pie con el acceso discreto
│   └── ui/                      # Logo, Avatar, Button, Field, TagPicker, SuperpowerPicker, RoleBadge, LangSwitch, Stamp, VipCard
└── views/
    ├── RegisterView.jsx         # Pre-registro speed-dating
    ├── MatchScene.jsx           # Tarjeta VIP + sello MATCH READY
    ├── HomeView.jsx             # Decide: espera / tarjeta de ronda / cierre
    ├── WaitingView.jsx          # Cuenta atrás + frases de Cupidon + tarjeta VIP
    ├── RoundCardView.jsx        # Tarjeta de embarque (móvil)
    ├── ModeratorPanelView.jsx   # Panel de control
    └── ProjectorView.jsx        # Pantalla grande
```

## Plan de las 5 rondas (`lib/matching.js`)

La sesión tiene 5 rondas de 15 minutos, mesas de 2 a 5 personas (5 mesas como máximo por ronda) y una
pausa de 10 minutos tras la ronda 3 (`constants/index.js`).

**Semana interna.** En el panel, «Generar el plan de las 5 rondas» calcula de una vez el plan completo
(en un worker, `lib/planner.worker.js`, tarda unos segundos). Cada tour elige temas que la gente ha
elegido y no ha tratado, y reparte a todos minimizando: personas en un tema que no eligieron, temas
repetidos para una persona, parejas que ya coincidieron (máximo 3 veces) y personas de la misma
sucursal. Reparto voraz + enfriamiento simulado que intercambia personas, las mueve de mesa (así el
tamaño sale de la demanda) y cambia temas. El panel muestra la calidad del plan y una rejilla de los
5 rondas donde se puede intercambiar o mover a alguien con dos clics, o regenerar un tour concreto.

**El día del evento.** La moderadora avanza con «Siguiente» en el panel, o en el proyector con Espacio,
→ o el mando de presentación (← deshace): portada del tour → anuncio de cada match (tema, mesa y
tarjetas con foto) → cuenta atrás de 15 min con todas las mesas → «Tiempo terminado» (cada móvil pide grabar una nota de audio de 1 min) → siguiente ronda.
Tras la ronda 3 el proyector muestra la pausa con su cuenta atrás. El móvil de cada director muestra
su mesa en cuanto se anuncia en pantalla, nunca antes. Al terminar el evento, el móvil muestra
«Gracias por compartir» con cada ronda (tema, compañeros y su nota de audio para escuchar o descargar).

Datos: `event.rounds[i]` = `{ plan, tables, revealed, startedAt, pauseStartedAt }`. `plan` son todas
las mesas del tour; `tables`, solo las ya anunciadas, que es lo que leen los móviles (`get_my_table`).

## Base de datos (Supabase)

Proyecto `cofinder` (eu-west-3, París). Las claves públicas están en `netlify.toml`.

| Pieza | Qué es | Quién accede |
|---|---|---|
| `public.participants` | Perfiles. Nunca se borran: «Supprimer» los marca como `removed` | Clave pública: **solo insertar**. No se puede listar |
| `private.event_state` | Rondas y mesas completas | Solo a través de funciones con PIN |
| `public.event_status` | Señal sin datos personales (ronda, versión) | Lectura pública + tiempo real |
| `private.settings` | Hash bcrypt del PIN | Nadie desde fuera |

Funciones (RPC):
- Participante: `get_my_profile(id)`, `get_my_table(id)` → su perfil y, el día del evento, solo sus compañeros de mesa.
- Moderadora (todas exigen el PIN, bloqueo tras 10 fallos en 10 min): `mod_check_pin`, `mod_get_state`,
  `mod_set_event`, `mod_delete_participant`, `mod_add_demo`, `mod_clear_demo`, `mod_set_pin`.

Cambiar el PIN (desde el SQL editor de Supabase o la consola del navegador con el panel abierto):

```sql
select public.mod_set_pin('PIN_ACTUAL', 'PIN_NUEVO');
```

Tiempo real (websockets de Supabase Realtime): los móviles reciben el cambio de ronda al instante
(`event_status`), y el panel y el proyector se refrescan en cuanto llega un aviso (cambio de ronda, nuevo
registro o nueva nota de audio, por el canal de difusión `cofinder-live`). Si el websocket se corta,
el panel vuelve a pedir el estado cada 15 s.

### Cambios del prototipo (noviembre 2026)

Ejecutar una vez `supabase/2026-11-prototipo.sql` en el SQL editor. Añade:
- `list_topic_proposals()`: mesas propuestas por participantes (ya no se usa: ver «Mesas del evento desde el panel»).
- Bucket privado `audio-notes`: cada móvil sube su nota de audio al acabar la ronda (solo subir; se escuchan desde Storage).
  Ruta: `ronda-N/mesa-M/<id participante>-<fecha>.webm`. Cada persona también la tiene en su móvil, en el resumen final.

Sin ese script la app funciona igual, pero sin propuestas de otras personas y con las notas solo en cada móvil.

### Mesas del evento desde el panel (noviembre 2026)

Las mesas que eligen los participantes en «Apúntate a las mesas» las añade la moderadora desde el panel
(sección «Mesas del evento»): tema, quién lo propone y una descripción opcional. Cada participante las ve
en un orden aleatorio propio (estable en su dispositivo). Ya no hay apartado para que los participantes
propongan mesas. Mientras no se añada ninguna mesa, se muestra la lista de 20 temas por defecto.
El reparto en mesas usa solo las mesas añadidas.

En modo local se guardan en el navegador. Con Supabase, ejecutar una vez `supabase/2026-11-mesas.sql`
(tabla `mesa_topics` y funciones `list_mesa_topics`, `mod_add_mesa_topic`, `mod_remove_mesa_topic`).
