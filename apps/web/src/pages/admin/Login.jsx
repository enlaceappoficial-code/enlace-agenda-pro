import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPost } from '../../lib/api'

const SLUG = import.meta.env.VITE_APP_SLUG || 'agenda_pro'
const THEME_CONFIG = {
  peluqueria: { label: 'BARBERÍA', sub: 'Panel de Administración', cta: 'Crea tu barbería gratis' },
  bienestar:  { label: 'BIENESTAR', sub: 'Panel de Administración', cta: 'Crea tu spa gratis' },
  mascotas:   { label: 'MASCOTAS', sub: 'Panel de Administración', cta: 'Crea tu centro gratis' },
  agenda_pro: { label: 'AGENDA PRO', sub: 'Panel de Gestión y Citas', cta: 'Crea tu agenda gratis' },
}
const T = THEME_CONFIG[SLUG] || THEME_CONFIG.agenda_pro

export default function AdminLogin() {
  const nav = useNavigate()
  const [email, setEmail]       = useState('admin@enlace.cl')
  const [password, setPassword] = useState('admin123')
  const [showPass, setShowPass] = useState(false)
  const [err, setErr]           = useState('')
  const [loading, setLoading]   = useState(false)

  async function submit(e) {
    e?.preventDefault()
    setErr('')
    setLoading(true)
    try {
      await apiPost('/api/auth/login', { email, password })
      nav('/admin')
    } catch {
      setErr('Credenciales incorrectas. Revisa tu email y contraseña.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '13px 14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    background: 'var(--card-bg-2, var(--bg))',
    color: 'var(--text-main)',
    fontSize: 14, fontFamily: 'var(--font-body)',
    outline: 'none', transition: 'var(--transition)',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100%', minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      position: 'relative', overflow: 'hidden',
    }}>

      {/* ── Fondo decorativo radial ── */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 65%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ── CARD ── */}
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: '36px 28px',
        width: '100%', maxWidth: 380,
        boxShadow: 'var(--shadow-popover)',
        position: 'relative', zIndex: 1,
        overflow: 'hidden',
      }}>
        {/* Línea dorada top */}
        <div style={{
          position: 'absolute', top: 0, left: '10%', right: '10%', height: 2,
          background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
        }} />

        {/* ── LOGO + BRAND ── */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, margin: '0 auto 14px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-strong)',
            background: 'var(--primary-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            <img src="/logo-icon.png" alt="Logo" style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
          </div>

          <div style={{
            fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700,
            color: 'var(--text-main)', letterSpacing: 'var(--ls-heading)', lineHeight: 1,
          }}>
            ENLACE
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em' }}>
              {T.label}
            </span>
            <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--border-strong)' }} />
            <span style={{
              fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
              background: 'linear-gradient(90deg, var(--accent), var(--primary-hover))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              PRO
            </span>
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 10, fontWeight: 500 }}>
            {T.sub}
          </p>
        </div>

        {/* ── ERROR ── */}
        {err && (
          <div style={{
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.20)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            fontSize: 13, fontWeight: 600, color: 'var(--red)',
            marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>⚠️</span> {err}
          </div>
        )}

        {/* ── FORM ── */}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Email
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required autoComplete="email"
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                required autoComplete="current-password"
                style={{ ...inputStyle, paddingRight: 44 }}
                onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: 16, padding: 4,
              }}>
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 6,
              padding: '14px 20px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: loading
                ? 'var(--border)'
                : 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
              color: loading ? 'var(--text-muted)' : 'var(--bg)',
              fontWeight: 800, fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : 'var(--shadow-btn)',
              fontFamily: 'var(--font-body)',
              letterSpacing: '-0.01em',
              transition: 'var(--transition)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white',
                  animation: 'spin 0.7s linear infinite',
                }} />
                Entrando...
              </>
            ) : 'Entrar al Panel →'}
          </button>
        </form>

        {/* ── FOOTER ── */}
        <div style={{ textAlign: 'center', marginTop: 22 }}>
          <div style={{ height: 1, background: 'var(--border)', marginBottom: 16 }} />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>¿No tienes cuenta? </span>
          <span
            onClick={() => nav('/admin/register')}
            style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)', cursor: 'pointer' }}
          >
            {T.cta}
          </span>
        </div>

        {/* Powered by */}
        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <img src="/logo-icon_1.png" alt="Enlace" style={{ height: 28, opacity: 0.35 }} />
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
