# Transcriptor de notas de audio (faster-whisper)

Programa que convierte en texto las notas de audio que graban los participantes al final de cada
ronda. Usa [faster-whisper](https://github.com/SYSTRAN/faster-whisper) (código abierto, licencia MIT):
los mismos modelos de [Whisper de OpenAI](https://github.com/openai/whisper), con la misma calidad, pero
unas 4 veces más rápido en CPU, con menos memoria y sin PyTorch ni ffmpeg. Se ejecuta **en vuestro
propio servidor**: es gratis y los audios no salen a ningún servicio externo.

Funciona así: la web sube cada audio a Supabase y lo apunta en la tabla `audio_notes`. Este
programa, que se deja en marcha, mira cada 10 segundos si hay notas sin texto, descarga el audio, lo
transcribe y guarda el texto en `audio_notes.transcript`. La web no espera a la transcripción: la
sesión sigue aunque el transcriptor vaya con retraso o esté apagado (se pone al día al arrancar).

## Requisitos del servidor

- Linux (recomendado), Windows o Mac, donde se pueda instalar programas y dejar uno en marcha.
- **Python 3.9 o superior** (no hace falta ffmpeg).
- CPU de 2 núcleos o más y **2 GB de RAM libres** con el modelo `small` (4–6 GB con `medium` o `turbo`).
  Sin tarjeta gráfica, un audio de 1 minuto tarda unos 5–15 s con `small`.
- Salida a internet hacia `*.supabase.co` (HTTPS) y, solo la primera vez, a `huggingface.co` para descargar el modelo.
- Unos 1,5 GB de disco (programa + el modelo `small`).

## Instalación (Linux, p. ej. Ubuntu)

1. Programas del sistema:
   ```bash
   sudo apt update && sudo apt install -y python3 python3-venv git
   ```
2. Descargar Cofinder y entrar en esta carpeta:
   ```bash
   sudo git clone https://github.com/sandramitjans/cofinder.git /opt/cofinder
   cd /opt/cofinder/transcriptor
   ```
3. Entorno de Python e instalación de faster-whisper:
   ```bash
   python3 -m venv venv
   ./venv/bin/pip install -U pip
   ./venv/bin/pip install -r requirements.txt
   ```
4. Configuración: copiar `.env.example` como `.env` y rellenarlo.
   ```bash
   cp .env.example .env && nano .env
   ```
   - `SUPABASE_URL`: Supabase → Project Settings → API → *Project URL*.
   - `SUPABASE_SERVICE_ROLE_KEY`: en la misma página, la clave **service_role**. Es secreta: solo va
     en este `.env` del servidor, nunca en la web ni en GitHub.
5. Probarlo a mano (Ctrl+C para parar):
   ```bash
   ./venv/bin/python transcribir.py
   ```
   La primera vez descarga el modelo (de huggingface.co). Después verás «Esperando notas de audio…».
6. Dejarlo como servicio para que arranque solo con el servidor:
   ```bash
   sudo useradd -r cofinder; sudo chown -R cofinder /opt/cofinder
   sudo cp cofinder-transcriptor.service /etc/systemd/system/
   sudo systemctl enable --now cofinder-transcriptor
   journalctl -u cofinder-transcriptor -f      # ver lo que va haciendo
   ```

## Windows o Mac (para probar en un ordenador)

1. Instalar [Python 3.11 o superior](https://www.python.org/downloads/).
2. En una terminal, dentro de la carpeta `transcriptor`:
   ```bash
   python -m venv venv
   venv\Scripts\pip install -r requirements.txt        # Windows
   ./venv/bin/pip install -r requirements.txt          # Mac
   ```
3. Copiar `.env.example` como `.env`, rellenarlo y arrancar:
   `venv\Scripts\python transcribir.py` (Windows) o `./venv/bin/python transcribir.py` (Mac).

## Opciones (`.env`)

| Variable | Por defecto | Para qué |
|---|---|---|
| `WHISPER_MODEL` | `small` | `tiny`/`base` más rápidos y menos precisos; `medium`/`turbo`/`large-v3` más precisos y más lentos sin GPU |
| `WHISPER_LANGUAGE` | (vacío) | Vacío = detecta el idioma de cada audio; o fija `es`, `fr`, `en` |
| `INTERVALO_SEGUNDOS` | `10` | Cada cuánto busca notas nuevas |
| `WHISPER_HILOS` | `0` | Núcleos de CPU que usa (0 = todos) |

Si un audio falla tres veces seguidas, se salta (queda sin texto) y aparece en el registro.

## Dónde quedan los textos

Supabase → Table Editor → `audio_notes`: una fila por persona y ronda, con su mesa, el tema, la ruta
del audio en Storage y `transcript` con el texto.
