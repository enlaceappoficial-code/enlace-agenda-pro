import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPatch } from '../../lib/api'
import { useAppTheme } from '../../context/ThemeContext'
import ThemeSelectorModal from '../../components/ThemeSelectorModal'

// ─── CONFIGURACIÓN POR TEMA ────────────────────────────────────────────────
const SLUG = import.meta.env.VITE_APP_SLUG || 'peluqueria'

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
    tutorialTitle: '¡Bienvenido a Enlace Agenda PRO! 🩺',
  },
}
const THEME = THEME_CONFIG[SLUG] || THEME_CONFIG.peluqueria
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
              <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <img src="/logo-icon_1.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
                  src="/logo-icon_1.png"
                  alt="Enlace Barbería"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
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
          <Outlet context={{ shop, setShop, enlace, setEnlace }} />
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
    { title: THEME.tutorialTitle, content: 'Estamos felices de tenerte. Vamos a darte un recorrido rápido por las herramientas que llevarán tu negocio al siguiente nivel.' },
    { title: '📊 Dashboard de Control', content: 'Aquí verás el rendimiento del día, tus ingresos estimados, porcentaje de ocupación y las próximas citas de manera rápida.' },
    { title: '📅 Agenda Inteligente', content: 'Visualiza tus citas del día, semana o mes. Puedes agendar manualmente, mover citas y bloquear horarios.' },
    { title: '💰 Control de Caja y Gastos', content: 'Registra tus ingresos diarios, propinas, y lleva un control estricto de tus gastos fijos y extras para saber exactamente tu ganancia neta.' },
    { title: '👥 Fidelización de Clientes', content: 'Accede a tu base de datos de clientes con su historial completo de visitas, notas especiales y contacto directo por WhatsApp.' },
    { title: '🔗 Tu Link de Reservas', content: '¡Tu arma secreta! Comparte tu link único en Instagram o WhatsApp. Tus clientes agendarán solos las 24 horas del día.' },
    { title: '🚀 ¡Hora de empezar!', content: 'Tu primer paso es crear tus servicios reales. Ve a la sección "Más" y luego a "Servicios". ¡Mucho éxito en tu negocio!' },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20,
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        background: 'var(--card)',
        padding: 28,
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-strong)',
        boxShadow: 'var(--shadow-popover)',
        maxWidth: 380, width: '100%',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Línea dorada decorativa */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
        }} />

        {/* Paso indicator */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 2, borderRadius: 2,
              background: i <= step ? 'var(--accent)' : 'var(--border)',
              transition: 'var(--transition)',
            }} />
          ))}
        </div>

        <h2 style={{
          fontFamily: 'var(--font-heading)', fontSize: 18,
          fontWeight: 700, marginBottom: 10, color: 'var(--text-main)',
        }}>
          {steps[step].title}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: '1.65', marginBottom: 24 }}>
          {steps[step].content}
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-soft)', fontWeight: 600 }}>
            {step + 1} / {steps.length}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                style={{
                  background: 'var(--btn-secondary)', color: 'var(--btn-secondary-text)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Atrás
              </button>
            )}
            <button
              onClick={() => step < steps.length - 1 ? setStep(step + 1) : onClose()}
              style={{
                background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
                color: 'var(--bg)',
                border: 'none', borderRadius: 'var(--radius-sm)',
                padding: '8px 20px', fontSize: 13, fontWeight: 800,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-btn)',
              }}
            >
              {step < steps.length - 1 ? 'Siguiente →' : '¡Empezar!'}
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
