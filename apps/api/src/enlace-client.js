require('dotenv').config()

const ENLACE_API_URL      = process.env.ENLACE_API_URL
const ENLACE_VINCULAR_URL = process.env.ENLACE_VINCULAR_URL
const APP_SLUG            = process.env.APP_SLUG || 'peluqueria'

/**
 * Llama a la Edge Function enlace-api con un evento.
 * Si falla, no lanza error — la app sigue funcionando.
 */
async function enlaceCall(action, token, data = {}) {
  if (!token || !ENLACE_API_URL) return null
  try {
    const res = await fetch(ENLACE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, token, data }),
    })
    if (res.ok) {
      const result = await res.json()
      return result
    }
    const err = await res.json().catch(() => ({}))
    console.warn(`[Enlace] ${action} respondio ${res.status}:`, err)
  } catch (e) {
    console.warn(`[Enlace] ${action} fallo silenciosamente:`, e.message)
  }
  return null
}

/**
 * Llama a enlace-vincular para verificar el codigo
 * de 6 digitos y obtener el token permanente.
 */
async function enlaceVincular(telefono, codigo) {
  if (!ENLACE_VINCULAR_URL) return null
  try {
    const res = await fetch(ENLACE_VINCULAR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        telefono, 
        codigo, 
        app_slug: APP_SLUG 
      }),
    })
    const data = await res.json()
    return data
  } catch (e) {
    console.warn('[Enlace] vincular falló:', e.message)
    return null
  }
}

module.exports = { enlaceCall, enlaceVincular }
