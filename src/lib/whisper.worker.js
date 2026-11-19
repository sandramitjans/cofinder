/**
 * Whisper (código abierto) dentro del navegador, con Transformers.js de Hugging Face.
 * Corre en un Web Worker para que la página no se congele mientras transcribe.
 * El modelo se descarga de huggingface.co la primera vez y el navegador lo guarda en caché.
 *
 * Mensajes: { type: 'load', model } → 'progress'… 'ready' · { type: 'run', id, audio: Float32Array (16 kHz) } → 'result' | 'error'
 */
import { env, pipeline } from '@huggingface/transformers'
// El motor (ONNX Runtime en WebAssembly) se sirve desde la propia web, no desde un CDN externo
import ortWasm from '../../node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.wasm?url'
import ortMjs from '../../node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.mjs?url'

env.allowLocalModels = false
env.backends.onnx.wasm.wasmPaths = { wasm: ortWasm, mjs: ortMjs }

let asr = null
let loading = null

async function load(model) {
  if (model === 'fake') { asr = async (audio) => ({ text: `(prueba) ${(audio.length / 16_000).toFixed(1)} s de audio` }); return 'fake' } // solo para tests
  const webgpu = !!(self.navigator?.gpu && (await self.navigator.gpu.requestAdapter().catch(() => null)))
  const progress_callback = (p) => {
    if (p.status === 'progress' && p.total) self.postMessage({ type: 'progress', file: p.file, loaded: p.loaded, total: p.total })
  }
  // WebGPU (tarjeta gráfica del portátil) si la hay: mucho más rápido. Si no, WebAssembly en la CPU.
  const opts = webgpu
    ? { device: 'webgpu', dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' }, progress_callback }
    : { device: 'wasm', dtype: 'q8', progress_callback }
  // Por si una variante no está publicada: misma familia en la cuenta Xenova, y sin tarjeta gráfica
  const cpu = { device: 'wasm', dtype: 'q8', progress_callback }
  const tries = [[model, opts], ...(webgpu ? [[model, cpu]] : []), [model.replace('onnx-community/', 'Xenova/'), cpu]]
  let last
  for (const [m, o] of tries) {
    try {
      asr = await pipeline('automatic-speech-recognition', m, o)
      return o.device
    } catch (err) { last = err; console.warn('Whisper', m, o.device, err) }
  }
  throw last
}

self.onmessage = async ({ data }) => {
  if (data.type === 'load') {
    try {
      loading ??= load(data.model)
      self.postMessage({ type: 'ready', device: await loading })
    } catch (err) {
      loading = null
      self.postMessage({ type: 'loadError', message: String(err?.message ?? err) })
    }
  } else if (data.type === 'run') {
    try {
      await loading
      const out = await asr(data.audio, { task: 'transcribe', chunk_length_s: 30, stride_length_s: 5, ...(data.language ? { language: data.language } : {}) })
      self.postMessage({ type: 'result', id: data.id, text: String(out?.text ?? '').trim() })
    } catch (err) {
      self.postMessage({ type: 'error', id: data.id, message: String(err?.message ?? err) })
    }
  }
}
