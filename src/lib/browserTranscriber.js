import * as api from './backend'

/**
 * Transcriptor del navegador para la página #resum: busca las notas sin texto, descarga su audio
 * (con el PIN), lo pasa por Whisper en un Web Worker y guarda el texto. Una nota cada vez.
 */
export const MODELS = {
  small: 'onnx-community/whisper-small', // ~250 MB · mejor en español/francés (recomendado)
  base: 'onnx-community/whisper-base',   // ~80 MB · más rápido, algo menos preciso
}

// El audio llega en webm/mp4: el navegador lo decodifica y lo pasa a 16 kHz mono, como lo pide Whisper
async function toPcm16k(blob) {
  const buf = await blob.arrayBuffer()
  const Ctx = window.AudioContext || window.webkitAudioContext
  const ctx = new Ctx({ sampleRate: 16_000 })
  try {
    const audio = await ctx.decodeAudioData(buf)
    if (audio.numberOfChannels === 1) return new Float32Array(audio.getChannelData(0))
    const a = audio.getChannelData(0), b = audio.getChannelData(1)
    return a.map((v, i) => (v + b[i]) / 2)
  } finally { ctx.close() }
}

export function createTranscriber({ pin, model = 'small', onStatus }) {
  let worker = null
  let stopped = false
  let busy = false
  let seq = 0
  const pending = new Map()
  const failed = new Map() // path → intentos
  const status = { phase: 'loading', device: null, progress: 0, done: 0, current: null, error: null }
  const emit = (patch) => { Object.assign(status, patch); onStatus?.({ ...status }) }

  const ready = new Promise((resolve, reject) => {
    worker = new Worker(new URL('./whisper.worker.js', import.meta.url), { type: 'module' })
    const files = {}
    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') {
        files[data.file] = data
        const all = Object.values(files)
        emit({ progress: all.reduce((s, f) => s + f.loaded, 0) / Math.max(1, all.reduce((s, f) => s + f.total, 0)) })
      } else if (data.type === 'ready') { emit({ phase: 'idle', device: data.device, progress: 1 }); resolve() }
      else if (data.type === 'loadError') { emit({ phase: 'error', error: data.message }); reject(new Error(data.message)) }
      else if (data.type === 'result' || data.type === 'error') {
        const p = pending.get(data.id)
        pending.delete(data.id)
        if (data.type === 'result') p?.resolve(data.text)
        else p?.reject(new Error(data.message))
      }
    }
    worker.onerror = (e) => { emit({ phase: 'error', error: e.message || 'worker' }); reject(e) }
    worker.postMessage({ type: 'load', model: MODELS[model] ?? model })
  })
  ready.catch(() => {})

  const run = (audio) => new Promise((resolve, reject) => {
    const id = ++seq
    pending.set(id, { resolve, reject })
    worker.postMessage({ type: 'run', id, audio }, [audio.buffer])
  })

  /** Transcribe todo lo pendiente. Devuelve cuántas ha hecho (para refrescar la lista). */
  async function tick() {
    if (busy || stopped) return 0
    busy = true
    let n = 0
    try {
      await ready
      const notes = (await api.modPendingAudio(pin)).filter((x) => (failed.get(x.path) ?? 0) < 3)
      for (const note of notes) {
        if (stopped) break
        emit({ phase: 'working', current: note, left: notes.length - n })
        try {
          const { blob, path } = await api.modGetAudio(pin, note.id, note.round)
          const text = await run(await toPcm16k(blob))
          await api.modSaveTranscript(pin, { id: note.id, round: note.round, path, text })
          n++
          emit({ done: status.done + 1 })
        } catch (err) {
          failed.set(note.path, (failed.get(note.path) ?? 0) + 1)
          console.warn('transcripción', note.path, err)
        }
      }
    } catch (err) {
      if (status.phase !== 'error') console.warn('transcriptor', err)
    } finally {
      busy = false
      if (!stopped && status.phase !== 'error') emit({ phase: 'idle', current: null, left: 0 })
    }
    return n
  }

  return {
    tick,
    stop() { stopped = true; worker?.terminate() },
  }
}
