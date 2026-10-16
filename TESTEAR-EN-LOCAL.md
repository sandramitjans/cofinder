# Testear Cofinder sin gastar Netlify

Netlify ya no hace falta para probar. Todo se prueba en el Mac, en el navegador,
y Netlify queda solo para publicar lo que ya das por bueno.

## 1. Arrancar en el Mac

En VS Code: `File → Open Folder` → la carpeta `cofinder`.
Abre la terminal integrada (**Ctrl + ñ**) y escribe:

```bash
npm run dev
```

Te dará una dirección tipo `http://localhost:5173`. La abres en el navegador y, cada vez que
guardes un archivo, la página se recarga sola. Para parar el servidor: **Ctrl + C** en la terminal.

No hace falta configurar nada: con el `.env` vacío la app arranca en **modo local** y guarda
todo en el navegador (localStorage), sin tocar la base real de París. El PIN del panel es `2026`
y la cuenta atrás apunta al 25/11/2026, que son los valores por defecto del código.

## 2. Dos modos de prueba

| Comando | Dónde guarda los datos | Cuándo usarlo |
|---|---|---|
| `npm run dev` | En el navegador (localStorage) | **Por defecto.** Probar pantallas, registro, rondas, panel y proyector sin crear nada real |
| `npm run dev:cloud` | En la base real de Supabase (París) | Solo para comprobar el guardado de verdad. Lo que registres aquí es un perfil real |

Para empezar de cero en modo local: borra los datos del sitio en el navegador,
o ábrelo en una ventana de incógnito.

### Activar el modo cloud (solo si lo necesitas)

`npm run dev:cloud` necesita un fichero `.env.cloud` en la raíz del proyecto.
Créalo en VS Code (`New File` → `.env.cloud`) y pega esto:

```
VITE_SUPABASE_URL=https://dixhoqdykarenflooirp.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_K-q_0QnQV6QYNjCKp4mJOQ_L4xWylDp
VITE_EVENT_DATE=2026-11-25T00:00:00+01:00
```

Son las mismas claves que ya están en `netlify.toml`. El `.gitignore` ignora `.env.*`,
así que el fichero no se sube a GitHub. En este modo el PIN es el de la base de datos,
no el del código. Y recuerda retirar después los perfiles de prueba desde el panel
(«Retirer les tests»).

## 3. Probar desde el móvil

Importante, porque editar perfil solo funciona desde el móvil con el que te registraste.
Al arrancar, Vite muestra una segunda dirección con la IP del Mac, tipo:

```
➜  Network: http://192.168.1.37:5173/
```

Con el móvil en la misma wifi, abres esa dirección y pruebas el flujo real de móvil
sin publicar nada. (Ya está activado en `vite.config.js` con `server: { host: true }`.)

## 4. Probar panel y participante a la vez

Abre dos pestañas sobre el mismo `localhost`: una en `#moderadora` (panel) y otra normal.
En modo local comparten el localStorage del navegador, así que verás cómo reacciona
la pantalla del participante cuando lanzas una ronda.

## 5. Frenar el gasto en Netlify

Dos niveles, según cuánto quieras frenar:

- **Pausar las publicaciones:** en Netlify, `Deploys → Deploy settings → Stop auto publishing`
  (o el botón *Lock deploys*). Los commits siguen llegando, pero no se publican hasta que tú lo digas.
- **Que ni se construya:** añade `[skip netlify]` al final del mensaje del commit.
  Netlify ignora ese push por completo. Útil para subir cambios a medias.

El hábito que más ahorra: probar en `localhost` y hacer `git push` solo cuando el cambio esté
dado por bueno, agrupando varios retoques en un commit.

## Qué se cambió para este montaje

- `package.json` — añadido el script `dev:cloud` (`vite --mode cloud`).
- Este fichero.
- El `.env` sigue vacío, y así está bien: es lo que activa el modo local.
