import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_LANG, LANGS } from '../constants'
import { DICT, translate } from '../lib/i18n'

const I18nContext = createContext(null)
const LANG_KEY = 'cofinder:lang'

const initialLang = () => {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (LANGS.includes(saved)) return saved
  } catch { /* sin almacenamiento */ }
  return DEFAULT_LANG // francés por defecto, sin depender del navegador
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initialLang)

  useEffect(() => {
    document.documentElement.lang = lang
    try { localStorage.setItem(LANG_KEY, lang) } catch { /* noop */ }
  }, [lang])

  const setLang = useCallback((l) => LANGS.includes(l) && setLangState(l), [])
  const t = useCallback((key, vars) => translate(lang, key, vars), [lang])
  const topic = useCallback((id) => translate(lang, `topics.${id}`), [lang])
  // Filiale / Département: identificador conocido → traducido; texto libre → tal cual
  const country = useCallback((id) => DICT[lang]?.countries?.[id] ?? id ?? '', [lang])
  const superpower = useCallback((id) => translate(lang, `superpowers.${id}`), [lang])
  const formatDate = useCallback(
    (ts, opts = { day: 'numeric', month: 'long', year: 'numeric' }) =>
      new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', { timeZone: 'Europe/Paris', ...opts }).format(ts),
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, t, topic, country, superpower, formatDate }), [lang, setLang, t, topic, country, superpower, formatDate])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = () => {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n debe usarse dentro de <I18nProvider>')
  return ctx
}
