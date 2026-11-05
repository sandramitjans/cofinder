import * as api from './backend'

/**
 * Notas de audio al acabar cada ronda («lo que te llevas de esta conversación», máx. 1 minuto).
 * Cada nota se guarda siempre en este dispositivo (IndexedDB) para poder escucharla y descargarla
 * en el cierre. Con Supabase además se sube al bucket privado `audio-notes` (ver supabase/README).
 */
export const MAX_NOTE_SECONDS = 60

const DB = 'cofinder-notes'
const STORE = 'notes'

const open = () => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB, 1)
  req.onupgradeneeded = () => req.result.createObjectStore(STORE)
  req.onsuccess = () => resolve(req.result)
  req.onerror = () => reject(req.error)
})

const tx = async (mode, fn) => {
  const db = await open()
  return new Promise((resolve, reject) => {
    const store = db.transaction(STORE, mode).objectStore(STORE)
    const req = fn(store)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

const key = (userId, round) => `${userId}:${round}`

/** Nota guardada de una ronda: { blob, mime, createdAt, uploaded } o null */
export async function getNote(userId, round) {
  try { return (await tx('readonly', (s) => s.get(key(userId, round)))) ?? null } catch { return null }
}

/**
 * Guarda la nota en el dispositivo y, si hay servidor, la sube y la registra como enviada
 * (para que el panel sepa quién ha terminado). Devuelve { uploaded } (false = solo en este dispositivo).
 */
export async function saveNote({ userId, round, tableId, topic, blob }) {
  const note = { blob, mime: blob.type, createdAt: Date.now(), uploaded: false }
  if (api.isRemote) {
    try {
      const path = await api.uploadAudioNote({ userId, round, tableId, blob })
      await api.submitAudioNote({ id: userId, round, tableId, topic, path, blob })
      note.uploaded = true
    } catch { /* sin red o sin el SQL de notas: queda en el dispositivo */ }
  }
  try { await tx('readwrite', (s) => s.put(note, key(userId, round))) } catch { /* sin IndexedDB */ }
  return { uploaded: note.uploaded }
}

/** Igual que saveNote, pero con una nota escrita (se guarda también como .txt en el dispositivo) */
export async function saveTextNote({ userId, round, tableId, topic, text }) {
  const note = { text, blob: new Blob([text], { type: 'text/plain' }), mime: 'text/plain', createdAt: Date.now(), uploaded: false }
  if (api.isRemote) {
    try {
      const res = await api.submitTextNote({ id: userId, round, tableId, topic, text })
      note.uploaded = !res?.error
    } catch { /* sin red o sin el SQL de la nota escrita */ }
  }
  try { await tx('readwrite', (s) => s.put(note, key(userId, round))) } catch { /* sin IndexedDB */ }
  return { uploaded: note.uploaded }
}

/** Borra las notas de una persona (al volver la sesión al principio, p. ej. tras un ensayo) */
export async function clearNotes(userId) {
  try { await tx('readwrite', (s) => s.delete(IDBKeyRange.bound(`${userId}:`, `${userId}:￿`))) } catch { /* noop */ }
}

/** Formato que admite el navegador (Safari no graba webm) */
export function recorderMime() {
  if (typeof MediaRecorder === 'undefined') return null
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported?.(m)) ?? ''
}

export const canRecord = () => !!navigator.mediaDevices?.getUserMedia && recorderMime() !== null

export const extensionOf = (mime = '') => (mime.includes('text') ? 'txt' : mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm')
