import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPatch } from '../../lib/api'
import { useAppTheme } from '../../context/ThemeContext'
import ThemeSelectorModal from '../../components/ThemeSelectorModal'

// ─── CONFIGURACIÓN POR TEMA ────────────────────────────────────────────────
const SLUG = import.meta.env.VITE_APP_SLUG || 'agenda_pro'

const THEME_CONFIG = {
  peluqueria: {
    name: 'ENLACE', label: 'BARBERÍA', labelHighlight: 'PRO',
    labelColor: '#C89B3C', highlightColor: '#c89b3c',
    tutorialTitle: '¡Bienvenido a Enlace Barbería PRO! 💈',
  },
  bienestar: {
    name: 'ENLACE', label: 'BIENESTAR', labelHighlight: 'PRO',
    labelColor: '#6FA67A', highlightColor: '#6FA67A',
    tutorialTitle: '¡Bienvenido a Enlace Bienestar PRO! 🌿',
  },
  mascotas: {
    name: 'ENLACE', label: 'MASCOTAS', labelHighlight: 'PRO',
    labelColor: '#FF7A00', highlightColor: '#5B8DEF',
    tutorialTitle: '¡Bienvenido a Enlace Mascotas PRO! 🐾',
  },
  agenda_pro: {
    name: 'ENLACE', label: 'AGENDA', labelHighlight: 'PRO',
    labelColor: '#2563EB', highlightColor: '#16A34A',
    tutorialTitle: '¡Bienvenido a Enlace Agenda PRO! 📅',
  },
}
const THEME = THEME_CONFIG[SLUG] || THEME_CONFIG.agenda_pro
// ──────────────────────────────────────────────────────────────────────────

const TABS = [
  { to: '/admin',          label: 'Inicio',   icon: HomeIcon,    exact: true },
  { to: '/admin/agenda',   label: 'Agenda',   icon: CalendarIcon },
  { to: '/admin/clientes', label: 'Clientes', icon: UsersIcon    },
  { to: '/admin/caja',     label: 'Caja',     icon: CashIcon     },
  { to: '/admin/more',     label: 'Más',      icon: GridIcon     },
]

export default function AdminShell() {
  const nav = useNavigate()
  const { currentThemeMeta } = useAppTheme()
  const [shop, setShop]             = useState(null)
  const [enlace, setEnlace]         = useState(null)
  const [showTutorial, setShowTutorial] = useState(false)
  const [showThemeModal, setShowThemeModal] = useState(false)

  useEffect(() => { load() }, [])
  useEffect(() => {
    const seen = localStorage.getItem('tutorial_seen')
    if (!seen) setShowTutorial(true)
  }, [])
  useEffect(() => {
    const handleTypeEvent = (e) => {
      const t = e.detail
      if (t) {
        setShop(prev => ({ ...(prev || {}), businessType: t }))
      }
    }
    window.addEventListener('enlace:businessType', handleTypeEvent)
    return () => window.removeEventListener('enlace:businessType', handleTypeEvent)
  }, [])

  const currentEffectiveType = shop?.businessType || localStorage.getItem('enlace_agenda_mode') || 'salud'

  useEffect(() => {
    const typeLabel = currentEffectiveType === 'salud' ? 'Salud & Consulta' : 'Asesoría & Profesional'
    document.title = shop?.name ? `${shop.name} · Enlace Agenda Pro (${typeLabel})` : `Enlace Agenda Pro`
  }, [currentEffectiveType, shop?.name])

  const load = async () => {
    try {
      const [rShop, rEnlace] = await Promise.all([
        apiGet('/api/shop'),
        apiGet('/api/enlace/status').catch(() => null)
      ])
      const savedType = localStorage.getItem('enlace_agenda_mode')
      const effectiveType = rShop?.shop?.businessType || savedType || 'salud'
      setShop({ ...(rShop?.shop || {}), businessType: effectiveType })
      setEnlace(rEnlace)
    } catch (e) {
      if (e.status === 401) nav('/admin/login')
    }
  }

  const toggleDisp = async () => {
    const n = !enlace?.disponible
    try {
      await apiPost('/api/enlace/toggle', { disponible: n, msg: enlace?.msg || 'Disponible ahora' })
      setEnlace(e => ({ ...e, disponible: n }))
    } catch {}
  }

  const handleDesktopTypeSwitch = async (newType) => {
    const nextType = newType === 'asesoria' || newType === 'profesional' ? 'asesoria' : 'salud'
    localStorage.setItem('enlace_business_type', nextType)
    localStorage.setItem('enlace_agenda_mode', nextType)
    setShop(prev => ({ ...(prev || {}), businessType: nextType }))
    window.dispatchEvent(new CustomEvent('enlace:businessType', { detail: nextType }))
    window.dispatchEvent(new CustomEvent('enlace:agendaMode', { detail: nextType }))

    try {
      const res = await apiPatch('/api/shop', { businessType: nextType })
      if (res?.shop) {
        setShop(prev => ({ ...prev, ...res.shop, businessType: nextType }))
      }
    } catch (e) {
      console.warn('[Enlace] Modo Agenda Pro guardado localmente en cliente:', e)
    }
  }

  const isHealth = currentEffectiveType === 'salud'
  const isPeluqueria = false

  return (
    <div className="app-shell-root">

      {/* ── DESKTOP SIDEBAR (Visible solo en pantallas >= 900px) ── */}
      <aside className="desktop-sidebar">
        {/* ENCABEZADO NEGOCIO */}
        <div style={{
          padding: '20px 18px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {shop?.logoUrl ? (
              <div style={{
                width: 44, height: 44, borderRadius: 12, border: '1.5px solid var(--border)',
                overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', flexShrink: 0,
              }}>
                <img src={shop.logoUrl} alt={shop?.name || 'Logo'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <div style={{
                width: 44, height: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', flexShrink: 0,
              }}>
                <img src="/logo-icon.png" alt="Enlace Agenda Pro" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(37,99,235,0.4))' }} />
              </div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700,
                color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {shop?.name || 'Mi Negocio'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: currentThemeMeta?.labelColor || 'var(--accent)', letterSpacing: '0.08em' }}>
                  AGENDA
                </span>
                <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--accent)' }}>
                  PRO
                </span>
              </div>
            </div>
          </div>

          {/* CONMUTADOR RÁPIDO MODO DIRECTO EN SIDEBAR */}
          <div style={{
            display: 'flex',
            background: 'var(--bg)',
            padding: 3,
            borderRadius: 20,
            border: '1px solid var(--border)',
            gap: 2,
          }}>
            <button
              type="button"
              onClick={() => handleDesktopTypeSwitch('salud')}
              style={{
                flex: 1, border: 'none',
                background: isHealth ? 'var(--accent)' : 'transparent',
                color: isHealth ? '#ffffff' : 'var(--text-muted)',
                padding: '6px 8px', borderRadius: 16, fontSize: 11, fontWeight: 800, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                transition: 'all 0.2s ease',
              }}
            >
              <span>🩺</span> Salud
            </button>
            <button
              type="button"
              onClick={() => handleDesktopTypeSwitch('asesoria')}
              style={{
                flex: 1, border: 'none',
                background: !isHealth ? 'var(--accent)' : 'transparent',
                color: !isHealth ? '#ffffff' : 'var(--text-muted)',
                padding: '6px 8px', borderRadius: 16, fontSize: 11, fontWeight: 800, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                transition: 'all 0.2s ease',
              }}
            >
              <span>💼</span> Asesoría
            </button>
          </div>
        </div>

        {/* NAVEGACIÓN LATERAL */}
        <div style={{ flex: 1, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.10em', textTransform: 'uppercase', padding: '0 10px', marginBottom: 6 }}>
              Principal
            </div>
            <NavLink to="/admin" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-icon">🏠</span>
              <span className="sidebar-label">Inicio / Dashboard</span>
            </NavLink>
            <NavLink to="/admin/agenda" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-icon">📅</span>
              <span className="sidebar-label">Agenda & Citas</span>
            </NavLink>
            <NavLink to="/admin/clientes" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-icon">👥</span>
              <span className="sidebar-label">{isHealth ? 'Pacientes / Ficha' : 'Clientes / CRM'}</span>
            </NavLink>
            <NavLink to="/admin/caja" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-icon">💵</span>
              <span className="sidebar-label">Caja & Cobros</span>
            </NavLink>
          </div>

          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.10em', textTransform: 'uppercase', padding: '0 10px', marginBottom: 6 }}>
              Operación
            </div>
            <NavLink to="/admin/services" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-icon">📋</span>
              <span className="sidebar-label">{isHealth ? 'Consultas & Atenciones' : 'Servicios & Tarifas'}</span>
            </NavLink>
            <NavLink to="/admin/professionals" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-icon">👥</span>
              <span className="sidebar-label">{isHealth ? 'Especialistas / Equipo' : 'Consultores / Equipo'}</span>
            </NavLink>
            <NavLink to="/admin/booking-link" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-icon">🔗</span>
              <span className="sidebar-label">Link de Reservas</span>
            </NavLink>
            <NavLink to="/admin/gallery" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-icon">🖼️</span>
              <span className="sidebar-label">Galería de Trabajos</span>
            </NavLink>
          </div>

          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.10em', textTransform: 'uppercase', padding: '0 10px', marginBottom: 6 }}>
              Finanzas
            </div>
            <NavLink to="/admin/estadisticas" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-icon">📊</span>
              <span className="sidebar-label">Estadísticas</span>
            </NavLink>
            <NavLink to="/admin/gastos-fijos" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-icon">🏢</span>
              <span className="sidebar-label">Gastos Fijos</span>
            </NavLink>
            <NavLink to="/admin/planes" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-icon">💳</span>
              <span className="sidebar-label">Mi Plan Pro</span>
            </NavLink>
          </div>

          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.10em', textTransform: 'uppercase', padding: '0 10px', marginBottom: 6 }}>
              Ajustes
            </div>
            <NavLink to="/admin/configuracion" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-icon">⚙️</span>
              <span className="sidebar-label">Personalizar App</span>
            </NavLink>
            <div onClick={() => setShowThemeModal(true)} className="sidebar-link" style={{ cursor: 'pointer' }}>
              <span className="sidebar-icon">🎨</span>
              <span className="sidebar-label">Paleta de Colores</span>
            </div>
            <NavLink to="/admin/enlace" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-icon">🌐</span>
              <span className="sidebar-label">Conexión Enlace</span>
            </NavLink>
          </div>
        </div>

        {/* PIE DE SIDEBAR */}
        <div style={{
          padding: '14px 18px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(0,0,0,0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/enlace-logo.png" alt="Red Enlace" style={{ height: 26, objectFit: 'contain' }} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
              Red Enlace Pro
            </div>
          </div>
          {enlace?.connected && (
            <button
              onClick={toggleDisp}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: enlace.disponible ? 'rgba(74, 222, 128, 0.12)' : 'var(--primary-subtle)',
                color: enlace.disponible ? '#4ADE80' : 'var(--text-muted)',
                border: `1px solid ${enlace.disponible ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`,
                borderRadius: 16, padding: '4px 8px', fontSize: 10, fontWeight: 800, cursor: 'pointer',
              }}
            >
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: enlace.disponible ? '#4ADE80' : 'var(--text-soft)' }} />
              {enlace.disponible ? 'ONLINE' : 'OFFLINE'}
            </button>
          )}
        </div>
      </aside>

      {/* ── HEADER MÓVIL (Visible solo en pantallas < 900px) ── */}
      <header className="mobile-header" style={{
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        paddingTop: 'var(--safe-t)',
        flexShrink: 0,
        position: 'relative',
        zIndex: 10,
        flexDirection: 'column',
      }}>
        {/* Línea dorada superior */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
          opacity: 0.8,
        }} />

        <div style={{
          height: 60,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          justifyContent: 'space-between',
          width: '100%',
        }}>
          {/* LOGO + NOMBRE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {shop?.logoUrl ? (
              <div style={{
                width: 38, height: 38,
                borderRadius: 10,
                border: '1.5px solid var(--border)',
                overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent',
                flexShrink: 0,
              }}>
                <img
                  src={shop.logoUrl}
                  alt={shop?.name || 'Logo'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ) : (
              <div style={{
                width: 38, height: 38,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent',
                flexShrink: 0,
              }}>
                <img
                  src="/logo-icon.png"
                  alt="Enlace Agenda Pro"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 2px 5px rgba(37,99,235,0.4))' }}
                />
              </div>
            )}
            <div>
              <div style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 17,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: 'var(--text-main)',
                lineHeight: 1.1,
              }}>
                {shop?.name || 'Mi Negocio'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                  color: currentThemeMeta?.labelColor || 'var(--accent)', textTransform: 'uppercase',
                }}>
                  {isHealth ? 'SALUD & CONSULTA' : 'AGENDA'}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
                  background: 'linear-gradient(90deg, var(--accent), var(--primary-hover))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  PRO
                </span>
              </div>
            </div>
          </div>

          {/* ACCIONES DERECHA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setShowThemeModal(true)}
              style={{
                background: 'var(--primary-subtle)',
                border: '1px solid var(--border)',
                borderRadius: 8, width: 34, height: 34,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15,
                transition: 'var(--transition)',
              }}
              title="Personalizar Paleta de Colores"
            >
              🎨
            </button>

            <button
              onClick={() => setShowTutorial(true)}
              style={{
                background: 'var(--primary-subtle)',
                border: '1px solid var(--border)',
                borderRadius: 8, width: 34, height: 34,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)',
                transition: 'var(--transition)',
              }}
              title="Ayuda"
            >
              <HelpIcon />
            </button>

            <img
              src="/enlace-logo.png"
              alt="Red Enlace"
              style={{ width: 34, height: 34, objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(37,99,235,0.25))' }}
              title="Ecosistema Red Enlace"
            />

            {enlace?.connected && (
              <button
                onClick={toggleDisp}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: enlace.disponible ? 'rgba(74, 222, 128, 0.08)' : 'var(--primary-subtle)',
                  color: enlace.disponible ? '#4ADE80' : 'var(--text-muted)',
                  border: `1px solid ${enlace.disponible ? 'rgba(74,222,128,0.25)' : 'var(--border)'}`,
                  borderRadius: 20,
                  padding: '5px 10px', fontSize: 10, fontWeight: 800, cursor: 'pointer',
                  letterSpacing: '0.06em',
                  transition: 'var(--transition)',
                }}
              >
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: enlace.disponible ? '#4ADE80' : 'var(--text-soft)',
                  boxShadow: enlace.disponible ? '0 0 8px #4ADE80' : 'none',
                }} />
                {enlace.disponible ? 'ONLINE' : 'OFFLINE'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── CONTENIDO PRINCIPAL VIEWPORT ── */}
      <div className="admin-main-viewport">
        {/* DESKTOP TOP HEADER (Visible solo en PC) */}
        <header className="desktop-top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)' }}>
              Panel de Administración
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>·</span>
            <span style={{
              fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 12,
              background: 'var(--primary-subtle)', color: 'var(--accent)',
              border: '1px solid var(--border)',
            }}>
              {isHealth ? '🩺 Salud & Consulta Pro' : '💼 Asesoría & Profesional Pro'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setShowThemeModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--primary-subtle)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 700,
                color: 'var(--text-main)', cursor: 'pointer',
              }}
            >
              <span>🎨</span> {currentThemeMeta?.name || 'Paleta de Colores'}
            </button>

            <button
              onClick={() => setShowTutorial(true)}
              style={{
                width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--primary-subtle)', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
              title="Ayuda"
            >
              <HelpIcon />
            </button>

            <img
              src="/enlace-logo.png"
              alt="Red Enlace"
              style={{ width: 34, height: 34, objectFit: 'contain' }}
              title="Ecosistema Red Enlace"
            />
          </div>
        </header>

        {/* CONTAINER CENTRADO PARA EL CONTENIDO */}
        <div className="admin-content-container">
          <Outlet context={{ shop, setShop, enlace, setEnlace, openTutorial: () => setShowTutorial(true) }} />
        </div>
      </div>

      {/* ── BOTTOM NAV MÓVIL (Visible solo en pantallas < 900px) ── */}
      <nav className="mobile-bottom-nav" style={{
        background: 'var(--card)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        flexShrink: 0,
        paddingBottom: 'var(--safe-b)',
        position: 'relative',
        zIndex: 10,
      }}>
        {TABS.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.exact}
            style={({ isActive }) => ({
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '10px 4px 8px',
              textDecoration: 'none',
              position: 'relative',
              color: isActive ? 'var(--accent)' : 'var(--text-soft)',
              transition: 'color var(--transition-speed) var(--motion-ease)',
            })}
          >
            {({ isActive }) => (
              <>
                {/* Indicador activo */}
                {isActive && (
                  <div style={{
                    position: 'absolute', top: 0, left: '20%', right: '20%', height: 2,
                    background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
                    borderRadius: '0 0 4px 4px',
                  }} />
                )}
                {/* Ícono */}
                <div style={{
                  width: 32, height: 32,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 8,
                  background: isActive ? 'var(--primary-subtle)' : 'transparent',
                  transition: 'var(--transition)',
                }}>
                  <t.icon active={isActive} />
                </div>
                <span style={{
                  fontSize: 9.5,
                  fontWeight: isActive ? 800 : 500,
                  letterSpacing: isActive ? '0.04em' : '0',
                }}>
                  {t.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* TUTORIAL MODAL */}
      {showTutorial && (
        <TutorialModal onClose={() => {
          localStorage.setItem('tutorial_seen', 'true')
          setShowTutorial(false)
        }} />
      )}

      {/* THEME SELECTOR MODAL */}
      <ThemeSelectorModal isOpen={showThemeModal} onClose={() => setShowThemeModal(false)} />
    </div>
  )
}

// ─── TUTORIAL MODAL ───────────────────────────────────────────────────────
function TutorialModal({ onClose }) {
  const [step, setStep] = useState(0)

  const steps = [
    {
      icon: '📅',
      badge: 'BIENVENIDO A ENLACE AGENDA PRO',
      title: 'Tu tiempo y negocio bajo control',
      content: 'Te damos la bienvenida a tu ecosistema de gestión integral. Agenda Pro está diseñada para adaptarse a tu estilo de trabajo: ya sea que atiendas citas presenciales, dictes clases o asesorías online, o fabriques y entregues productos por encargo.',
      tip: '💡 Pensado especialmente para profesores, terapeutas, consultores y emprendedores.'
    },
    {
      icon: '🏢 💻 📦',
      badge: '3 MODALIDADES EN 1 SOLA APP',
      title: 'Presencial, Online y Encargos',
      content: 'Configura tus servicios según la forma exacta en que atiendes:\n\n• 🏢 Presencial: Atenciones en tu local, consultorio o sala.\n• 💻 Online: Asesorías y clases con enlace directo a Google Meet o Zoom.\n• 📦 Encargo: Venta y confección de productos personalizados (timbres, sellos, papelería) con fecha estimada de entrega o retiro.',
      tip: '✨ Gestiona múltiples facetas de tu negocio en una sola plataforma.'
    },
    {
      icon: '✍️',
      badge: 'ESPECIFICACIONES DE ENCARGO',
      title: 'Cero enredos por WhatsApp',
      content: 'Cuando un cliente pide un producto personalizado (como un timbre o sello), el sistema le solicita obligatoriamente el texto exacto, RUT, cargo, color de tinta o notas de diseño antes de confirmar su pedido.',
      tip: '🎯 Recibes toda la información lista para comenzar a fabricar.'
    },
    {
      icon: '🏷️',
      badge: 'CATEGORÍAS & FILTROS RÁPIDOS',
      title: 'Tu link de reservas ordenado 24/7',
      content: 'Tus clientes verán tus servicios agrupados en pestañas interactivas (ej: Clases, Asesorías, Timbres). Podrán filtrar con un solo toque desde su celular y reservar a cualquier hora del día.',
      tip: '🔗 Comparte tu link único en Instagram, WhatsApp o tu bio.'
    },
    {
      icon: '⚡',
      badge: 'SEÑAS Y ABONOS DE FABRICACIÓN',
      title: 'Protege tus horas y asegura insumos',
      content: 'Evita cancelaciones pidiendo una seña obligatoria para citas o un abono (ej: 50%) para iniciar la confección de tus encargos. Tu cliente adjunta la captura de su transferencia y tú la verificas con un clic.',
      tip: '🛡️ Elimina los clientes fantasma (anti no-show) y cubre tus materiales.'
    },
    {
      icon: '📆',
      badge: 'AGENDA & CALENDARIO INTELIGENTE',
      title: 'Citas, clases y retiros en una sola vista',
      content: 'Visualiza tus compromisos del día o la semana. Puedes agendar citas manuales, bloquear horarios de descanso o almuerzo, y consultar los detalles de cada pedido de un vistazo.',
      tip: '⏰ Sincronización instantánea de horas ocupadas y disponibles.'
    },
    {
      icon: '📲',
      badge: 'WHATSAPP EN 1 TOQUE',
      title: 'Confirmaciones y recordatorios',
      content: 'Tanto tus clientes al reservar como tú desde la agenda pueden enviar mensajes automáticos de WhatsApp con el resumen de la cita, las especificaciones del encargo o el enlace de la reunión.',
      tip: '💬 Mensajes profesionales y amables listos con un solo toque.'
    },
    {
      icon: '💰',
      badge: 'CONTROL DE CAJA Y COSTOS',
      title: 'Conoce tu margen de ganancia real',
      content: 'Registra tus ingresos diarios, propinas, gastos operativos y costos de insumos por servicio. Conoce tu margen neto exacto y mantén el historial completo de cada cliente.',
      tip: '📊 Finanzas claras para hacer crecer tu emprendimiento.'
    },
    {
      icon: '🚀',
      badge: '¡LISTO PARA COMENZAR!',
      title: 'Crea tus primeros servicios',
      content: 'Tu primer paso es ir a la sección "Más" > "Servicios & Atenciones" y crear tus servicios reales con su modalidad (Presencial, Online o Encargo). ¡Mucho éxito con tu Agenda Pro!',
      tip: '🎉 ¡Siempre puedes volver a abrir este tutorial desde el botón de ayuda (?)!'
    }
  ]

  const curr = steps[step]

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.78)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        background: 'var(--card)',
        padding: '24px 22px',
        borderRadius: 20,
        border: '1px solid var(--border-strong)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
        maxWidth: 420, width: '100%',
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Línea decorativa superior */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
        }} />

        {/* Header con botón cerrar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{
            fontSize: 10, fontWeight: 800, color: 'var(--accent)',
            letterSpacing: '0.08em', textTransform: 'uppercase'
          }}>
            {curr.badge}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', color: 'var(--text-muted)',
              fontSize: 18, cursor: 'pointer', padding: 4, lineHeight: 1,
              borderRadius: 6
            }}
            title="Cerrar tutorial"
          >
            ✕
          </button>
        </div>

        {/* Indicador de pasos (barras de progreso) */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 18 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i <= step ? 'var(--accent)' : 'var(--border)',
              transition: 'all 0.25s ease',
            }} />
          ))}
        </div>

        {/* Icono y Título */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 50, height: 50, borderRadius: 14,
            background: 'rgba(37, 99, 235, 0.12)',
            border: '1px solid rgba(37, 99, 235, 0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, flexShrink: 0
          }}>
            {curr.icon}
          </div>
          <div>
            <h2 style={{
              fontSize: 17, fontWeight: 800, margin: 0,
              color: 'var(--text-main)', lineHeight: 1.3
            }}>
              {curr.title}
            </h2>
          </div>
        </div>

        {/* Contenido con saltos de línea */}
        <p style={{
          fontSize: 13.5, color: 'var(--text-muted)',
          lineHeight: '1.6', margin: '0 0 14px 0',
          whiteSpace: 'pre-line'
        }}>
          {curr.content}
        </p>

        {/* Caja de Consejo / Tip */}
        {curr.tip && (
          <div style={{
            background: 'rgba(37, 99, 235, 0.06)',
            border: '1px solid rgba(37, 99, 235, 0.2)',
            borderRadius: 12, padding: '10px 12px',
            fontSize: 12, color: 'var(--text-main)',
            marginBottom: 20, lineHeight: 1.4
          }}>
            {curr.tip}
          </div>
        )}

        {/* Navegación inferior */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
          <span style={{ fontSize: 11, color: 'var(--text-soft)', fontWeight: 700 }}>
            {step + 1} de {steps.length}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                style={{
                  background: 'var(--btn-secondary)', color: 'var(--btn-secondary-text)',
                  border: '1px solid var(--border)', borderRadius: 10,
                  padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Atrás
              </button>
            )}
            <button
              onClick={() => step < steps.length - 1 ? setStep(step + 1) : onClose()}
              style={{
                background: 'var(--accent)',
                color: 'white',
                border: 'none', borderRadius: 10,
                padding: '9px 18px', fontSize: 12.5, fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
              }}
            >
              {step < steps.length - 1 ? 'Siguiente →' : '¡Empezar a Configurar! 🚀'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ÍCONOS SVG PROPIOS (sin emojis, más premium) ────────────────────────
function HomeIcon({ active }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? 'var(--accent)' : 'none'}
      stroke={active ? 'var(--accent)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}
function CalendarIcon({ active }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={active ? 'var(--accent)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
function UsersIcon({ active }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={active ? 'var(--accent)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function CashIcon({ active }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={active ? 'var(--accent)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}
function GridIcon({ active }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={active ? 'var(--accent)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}
function HelpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}
