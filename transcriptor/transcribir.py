"""
Cofinder · transcriptor de notas de audio con Whisper (https://github.com/openai/whisper)

Programa que se deja en marcha en el servidor (o en cualquier ordenador). Cada pocos segundos:
  1. busca en Supabase las notas de audio validadas que aún no tienen texto (tabla `audio_notes`)
  2. descarga el audio del bucket privado `audio-notes`
  3. lo transcribe con Whisper, en local: los audios no salen a ningún servicio externo
  4. guarda el texto en `audio_notes.transcript`

Configuración en un fichero `.env` junto a este script (ver `.env.example`) o en variables de entorno.
Ver LEEME.md para instalarlo.
"""
import json
import os
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


def load_env():
    """Lee KEY=valor de un .env junto al script (sin dependencias extra)"""
    env = Path(__file__).with_name(".env")
    if env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_env()
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
MODEL = os.environ.get("WHISPER_MODEL", "small")          # tiny · base · small · medium · turbo
LANGUAGE = os.environ.get("WHISPER_LANGUAGE") or None       # vacío = lo detecta solo (es, fr, en…)
INTERVAL = int(os.environ.get("INTERVALO_SEGUNDOS", "10"))
MAX_TRIES = 3                                               # audios que fallan: se reintentan 3 veces


def log(*args):
    print(datetime.now().strftime("%H:%M:%S"), *args, flush=True)


def request(method, path, body=None, raw=False):
    """Llamada a Supabase con la clave de servicio (solo en el servidor, nunca en la web)"""
    req = urllib.request.Request(
        f"{SUPABASE_URL}{path}",
        method=method,
        data=None if body is None else json.dumps(body).encode(),
        headers={
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as res:
        data = res.read()
        return data if raw else (json.loads(data) if data else None)


def pending_notes():
    q = "select=participant_id,round,path&transcript=is.null&order=created_at.asc&limit=20"
    return request("GET", f"/rest/v1/audio_notes?{q}")


def download(path):
    return request("GET", f"/storage/v1/object/audio-notes/{urllib.parse.quote(path)}", raw=True)


def save_transcript(note, text):
    q = f"participant_id=eq.{note['participant_id']}&round=eq.{note['round']}&path=eq.{urllib.parse.quote(note['path'])}"
    request("PATCH", f"/rest/v1/audio_notes?{q}", {
        "transcript": text,
        "transcribed_at": datetime.now(timezone.utc).isoformat(),
    })


def make_transcriber():
    """Whisper de OpenAI. Con COFINDER_FAKE_WHISPER=1 devuelve un texto fijo (solo para pruebas)"""
    if os.environ.get("COFINDER_FAKE_WHISPER") == "1":
        return lambda file: f"(prueba) {Path(file).name}"
    import whisper  # pip install -U openai-whisper  (necesita ffmpeg instalado)
    log(f"Cargando el modelo de Whisper «{MODEL}» (la primera vez se descarga)…")
    model = whisper.load_model(MODEL)
    log("Modelo listo.")

    def transcribe(file):
        result = model.transcribe(file, language=LANGUAGE, fp16=False)
        return result["text"].strip()
    return transcribe


def main():
    if not SUPABASE_URL or not SERVICE_KEY:
        sys.exit("Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (ver .env.example)")
    transcribe = make_transcriber()
    failures = {}
    log(f"Esperando notas de audio (cada {INTERVAL} s). Ctrl+C para parar.")
    while True:
        try:
            notes = [n for n in pending_notes() if failures.get(n["path"], 0) < MAX_TRIES]
        except (urllib.error.URLError, TimeoutError) as err:
            log("Sin conexión con Supabase:", err)
            notes = []
        for note in notes:
            ext = Path(note["path"]).suffix or ".webm"
            try:
                audio = download(note["path"])
                with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as f:
                    f.write(audio)
                    tmp = f.name
                try:
                    start = time.time()
                    text = transcribe(tmp)
                finally:
                    os.unlink(tmp)
                save_transcript(note, text)
                log(f"Ronda {note['round']} · {note['path']} → {len(text)} caracteres en {time.time() - start:.1f} s")
            except Exception as err:  # un audio roto no debe parar a los demás
                failures[note["path"]] = failures.get(note["path"], 0) + 1
                log(f"Error con {note['path']} (intento {failures[note['path']]}/{MAX_TRIES}):", err)
        time.sleep(INTERVAL)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log("Transcriptor parado.")
