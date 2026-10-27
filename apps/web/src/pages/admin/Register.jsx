import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPost } from '../../lib/api'

const SLUG = import.meta.env.VITE_APP_SLUG || 'agenda_pro'
const THEME_CONFIG = {
  peluqueria: { label: 'BARBERÍA', namePlaceholder: 'Ej: Kings Barber', slugPlaceholder: 'kings-barber', cta: 'Crear Barbería y Empezar' },
  bienestar:  { label: 'BIENESTAR', namePlaceholder: 'Ej: Zenith Spa', slugPlaceholder: 'zenith-spa', cta: 'Crear Spa y Empezar' },
  mascotas:   { label: 'MASCOTAS', namePlaceholder: 'Ej: Paws & Claws', slugPlaceholder: 'paws-claws', cta: 'Crear Centro y Empezar' },
  agenda_pro: { label: 'AGENDA PRO', namePlaceholder: 'Ej: Centro de Atención San Andrés', slugPlaceholder: 'san-andres', cta: 'Crear Agenda y Empezar' },
}
const T = THEME_CONFIG[SLUG] || THEME_CONFIG.agenda_pro

export default function AdminRegister() {
  const nav = useNavigate()
  const [businessType, setBusinessType] = useState('salud')
  const [shopName, setShopName] = useState('')
  const [slug, setSlug]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [err, setErr]           = useState('')
  const [loading, setLoading]   = useState(false)

  const handleShopNameChange = e => {
    const val = e.target.value
    setShopName(val)
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''))
  }

  async function submit(e) {
    e?.preventDefault()
    setErr('')
    if (!shopName || !slug || !email || !password) { setErr('Todos los campos son obligatorios.'); return }
    if (password.length < 6) { setErr('La contraseña debe tener al menos 6 caracteres.'); return }
    setLoading(true)
    try {
      await apiPost('/api/auth/register', { email, password, shopName, slug, businessType })
      nav('/admin')
    } catch (e) {
      if (e.data?.error === 'EMAIL_EXISTS')   setErr('Ese correo ya está registrado.')
      else if (e.data?.error === 'SLUG_EXISTS') setErr(`Ese link ya está en uso. Prueba con "${slug}-vip".`)
      else setErr('Error al crear la cuenta. Intenta de nuevo.')
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

  const focusHandler = e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)' }
  const blurHandler  = e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, position: 'relative', overflow: 'hidden',
    }}>
      {/* Fondo decorativo */}
      <div style={{
        position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 65%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)', padding: '32px 28px',
        width: '100%', maxWidth: 380,
        boxShadow: 'var(--shadow-popover)',
        position: 'relative', zIndex: 1, overflow: 'hidden',
      }}>
        {/* Línea dorada top */}
        <div style={{
          position: 'absolute', top: 0, left: '10%', right: '10%', height: 2,
          background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
        }} />

        {/* ── LOGO ── */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            margin: '0 auto 10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img 
              src="/logo-icon.png" 
              alt="Logo" 
              style={{ 
                width: 76, 
                height: 76, 
                objectFit: 'contain',
                filter: 'drop-shadow(0 10px 20px rgba(37, 99, 235, 0.45)) drop-shadow(0 4px 8px rgba(245, 160, 32, 0.25))',
                animation: 'float 3.5s ease-in-out infinite alternate',
              }} 
            />
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>
            ENLACE <span style={{ background: 'linear-gradient(90deg, var(--accent), var(--primary-hover))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{T.label}</span>
          </div>

          {/* Badge 30 días gratis */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8,
            background: 'var(--primary-subtle)', border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)', padding: '4px 10px',
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 6px #4ADE80' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#4ADE80' }}>30 días gratis de Plan PRO</span>
          </div>
        </div>

        {/* ── ERROR ── */}
        {err && (
          <div style={{
            background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.20)',
            borderRadius: 'var(--radius-md)', padding: '10px 14px',
            fontSize: 13, fontWeight: 600, color: 'var(--red)',
            marginBottom: 18, display: 'flex', gap: 8,
          }}>
            <span>⚠️</span> {err}
          </div>
        )}

        {/* ── FORM ── */}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>

          {/* Selector de Especialidad */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              ¿Cuál es tu especialidad o giro?
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div
                onClick={() => setBusinessType('salud')}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  border: businessType === 'salud' ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: businessType === 'salud' ? 'var(--primary-subtle)' : 'var(--card-bg-2, var(--bg))',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'var(--transition)',
                }}
              >
                <span style={{ fontSize: 18 }}>🩺</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)' }}>Salud / Médico</span>
              </div>

              <div
                onClick={() => setBusinessType('asesoria')}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  border: businessType === 'asesoria' ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: businessType === 'asesoria' ? 'var(--primary-subtle)' : 'var(--card-bg-2, var(--bg))',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'var(--transition)',
                }}
              >
                <span style={{ fontSize: 18 }}>💼</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)' }}>Asesoría / Legal</span>
              </div>
            </div>
          </div>

          {/* Nombre */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Nombre de tu centro o consulta
            </label>
            <input
              placeholder={businessType === 'asesoria' ? 'Ej: Consultora Legal & Tributaria' : 'Ej: Centro Médico San Andrés'}
              value={shopName} onChange={handleShopNameChange}
              style={inputStyle} onFocus={focusHandler} onBlur={blurHandler}
            />
          </div>

          {/* Slug */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Tu link de reservas
            </label>
            <div style={{
              display: 'flex', alignItems: 'stretch',
              background: 'var(--card-bg-2, var(--bg))',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', overflow: 'hidden',
              transition: 'var(--transition)',
            }}>
              <span style={{
                padding: '13px 12px', fontSize: 12, color: 'var(--text-muted)',
                background: 'var(--border)', display: 'flex', alignItems: 'center',
                fontWeight: 700, whiteSpace: 'nowrap', borderRight: '1px solid var(--border)',
              }}>
                /b/
              </span>
              <input
                placeholder={businessType === 'peluqueria' ? 'peluqueria-glamour' : 'kings-barber'}
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                style={{ ...inputStyle, borderRadius: 0, border: 'none', background: 'transparent', flex: 1 }}
              />
            </div>
            {slug && (
              <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
                🔗 Tu link: /b/{slug}
              </span>
            )}
          </div>

          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Email
            </label>
            <input
              type="email" placeholder="tu@correo.com"
              value={email} onChange={e => setEmail(e.target.value)}
              style={inputStyle} onFocus={focusHandler} onBlur={blurHandler}
            />
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={password} onChange={e => setPassword(e.target.value)}
                style={{ ...inputStyle, paddingRight: 44 }}
                onFocus={focusHandler} onBlur={blurHandler}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 15, padding: 4,
              }}>
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
            {/* Indicador fuerza */}
            {password.length > 0 && (
              <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 2.5, borderRadius: 2,
                    background: password.length >= i * 2
                      ? (password.length >= 8 ? '#4ADE80' : 'var(--accent)')
                      : 'var(--border)',
                    transition: 'var(--transition)',
                  }} />
                ))}
              </div>
            )}
          </div>

          <button
            type="submit" disabled={loading}
            style={{
              marginTop: 8, padding: '14px 20px',
              borderRadius: 'var(--radius-md)', border: 'none',
              background: loading ? 'var(--border)' : 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
              color: loading ? 'var(--text-muted)' : 'var(--bg)',
              fontWeight: 800, fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : 'var(--shadow-btn)',
              fontFamily: 'var(--font-body)', letterSpacing: '-0.01em',
              transition: 'var(--transition)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading ? (
              <>
                <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite' }} />
                Creando cuenta...
              </>
            ) : (businessType === 'peluqueria' ? 'Crear Peluquería y Empezar →' : 'Crear Barbería y Empezar →')}
          </button>
        </form>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <div style={{ height: 1, background: 'var(--border)', marginBottom: 14 }} />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>¿Ya tienes cuenta? </span>
          <span onClick={() => nav('/admin/login')} style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)', cursor: 'pointer' }}>
            Inicia sesión aquí
          </span>
        </div>

        <div style={{ textAlign: 'center', marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <img src="/enlace-logo.png" alt="Enlace" style={{ height: 16, opacity: 0.5, objectFit: 'contain' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Enlace Agenda Pro</span>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes float {
          0% { transform: translateY(0px); }
          100% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}
