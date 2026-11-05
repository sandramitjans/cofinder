import { useEffect, useState } from 'react'
import * as api from './backend'

/**
 * Quién tiene ahora mismo la app abierta en su móvil (presencia de Supabase Realtime).
 * Devuelve una función `isOn(id)`, o null en modo local (ahí los móviles no pueden conectarse).
 */
export function useConnected() {
  const [keys, setKeys] = useState(() => new Set())
  useEffect(() => (api.isRemote ? api.watchPresence(setKeys) : undefined), [])
  if (!api.isRemote) return null
  return (id) => keys.has(api.presenceKey(id))
}
