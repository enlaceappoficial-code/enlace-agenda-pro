import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import ThemeSelectorModal from '../../components/ThemeSelectorModal'
import { apiPatch } from '../../lib/api'

const SLUG = import.meta.env.VITE_APP_SLUG || 'agenda_pro'
const APP_LABEL = 'Agenda Pro'

const MENU_GROUPS = [
  {
    group: 'Negocio & Atención',
    items: [
      { title: 'Link de Reservas', sub: 'Comparte y tus clientes/pacientes agendan solos', icon: '🔗', to: '/admin/booking-link', highlight: true },
      { title: 'Servicios & Atenciones', sub: 'Precios, duraciones y modalidades', icon: '📋', to: '/admin/services' },
      { title: 'Profesionales / Especialistas', sub: 'Gestiona tu equipo y sus agendas', icon: '👥', to: '/admin/professionals' },
      { title: 'Instalaciones & Fotos', sub: 'Muestra tus espacios y consultorios', icon: '🖼️', to: '/admin/gallery' },
    ]
  },
  {
    group: 'Finanzas',
    items: [
      { title: 'Estadísticas', sub: 'Reportes mensuales y análisis', icon: '📊', to: '/admin/estadisticas' },
      { title: 'Gastos Fijos', sub: 'Arriendo, suministros y costos operativos', icon: '🏢', to: '/admin/gastos-fijos' },
      { title: 'Mi Plan y Suscripción', sub: 'Gestiona tu plan Starter, Pro o Premium', icon: '💳', to: '/admin/planes' },
    ]
  },
  {
    group: 'Configuración',
    items: [
      { title: 'Paleta de Colores', sub: 'Personaliza los colores y tema de la app', icon: '🎨', action: 'theme', highlight: true },
      { title: 'Conexión Enlace', sub: 'Visibilidad en mapa y red social', icon: '🌐', to: '/admin/enlace' },
      { title: 'Personalizar App', sub: 'Logo, nombre y apariencia', icon: '⚙️', to: '/admin/configuracion' },
    ]
  }
]

export default function More() {
  const nav = useNavigate()
  const { shop, setShop } = useOutletContext() || {}
  const [showThemeModal, setShowThemeModal] = useState(false)
  const [savingType, setSavingType] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const effectiveType = shop?.businessType || localStorage.getItem('enlace_business_type') || 'salud'
  const isAsesoria = effectiveType === 'asesoria'
  const currentAppLabel = isAsesoria ? 'Asesoría Pro' : 'Salud Pro'

  const handleToggleBusinessType = async (newType) => {
    if (effectiveType === newType || savingType) return
    const nextType = newType === 'asesoria' ? 'asesoria' : 'salud'
    localStorage.setItem('enlace_business_type', nextType)
    if (setShop) setShop(prev => ({ ...(prev || {}), businessType: nextType }))
    window.dispatchEvent(new CustomEvent('enlace:businessType', { detail: nextType }))
    setToastMsg(nextType === 'asesoria' ? '💼 Modo Asesoría & Consultoría activado' : '🩺 Modo Salud & Consulta Médica activado')
    setTimeout(() => setToastMsg(''), 3000)

    setSavingType(true)
    try {
      const res = await apiPatch('/api/shop', { businessType: nextType })
      if (res?.shop && setShop) setShop(prev => ({ ...prev, ...res.shop, businessType: nextType }))
    } catch (err) {
      console.warn('[Enlace] Modo guardado localmente en cliente:', err)
    } finally {
      setSavingType(false)
    }
  }

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 32 }}>

      {/* Header */}
      <div>
        <h1 style={{
          fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700,
          color: 'var(--text-main)', letterSpacing: 'var(--ls-heading)',
        }}>
          Configuración
        </h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, fontWeight: 500 }}>
          Herramientas avanzadas de tu agenda
        </p>
      </div>

      {/* SWITCH RÁPIDO IDENTIDAD SALUD / ASESORÍA */}
      <div style={{
        background: 'var(--card)',
        border: '1.5px solid var(--accent)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        boxShadow: '0 4px 18px rgba(0,0,0,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{
              fontSize: 10,
              fontWeight: 800,
              color: 'var(--accent)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              Especialidad de la Agenda
            </div>
            <div style={{
              fontSize: 16,
              fontWeight: 800,
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 2,
            }}>
              <span>{isAsesoria ? '💼' : '🩺'}</span>
              <span>{isAsesoria ? 'Asesoría & Consultoría' : 'Salud & Consulta Médica'}</span>
            </div>
          </div>

          {/* SWITCH CONTROLS */}
          <div style={{
            display: 'inline-flex',
            background: 'var(--bg)',
            padding: 3,
            borderRadius: 24,
            border: '1px solid var(--border)',
            gap: 4,
          }}>
            <button
              type="button"
              disabled={savingType}
              onClick={() => handleToggleBusinessType('salud')}
              style={{
                border: 'none',
                background: !isAsesoria ? 'var(--accent)' : 'transparent',
                color: !isAsesoria ? '#ffffff' : 'var(--text-muted)',
                padding: '8px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'all 0.2s ease',
              }}
            >
              <span>🩺</span> Salud
            </button>
            <button
              type="button"
              disabled={savingType}
              onClick={() => handleToggleBusinessType('asesoria')}
              style={{
                border: 'none',
                background: isAsesoria ? 'var(--accent)' : 'transparent',
                color: isAsesoria ? '#ffffff' : 'var(--text-muted)',
                padding: '8px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'all 0.2s ease',
              }}
            >
              <span>💼</span> Asesoría
            </button>
          </div>
        </div>

        {toastMsg && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.15)',
            color: '#22c55e',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 11,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            {toastMsg}
          </div>
        )}
      </div>

      {/* Grupos de menú */}
      {MENU_GROUPS.map((group, gi) => (
        <div key={gi}>
          <div style={{
            fontSize: 10, fontWeight: 800, color: 'var(--text-muted)',
            letterSpacing: '0.10em', textTransform: 'uppercase',
            marginBottom: 8, paddingLeft: 2,
          }}>
            {group.group}
          </div>

          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-card)',
          }}>
            {group.items.map((item, i) => (
              <div
                key={i}
                onClick={() => {
                  if (item.action === 'theme') setShowThemeModal(true)
                  else if (item.to) nav(item.to)
                }}
                style={{
                  padding: '13px 16px',
                  display: 'flex', alignItems: 'center', gap: 14,
                  borderBottom: i < group.items.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer',
                  background: item.highlight ? 'var(--primary-subtle)' : 'transparent',
                  transition: 'background var(--transition-speed) var(--motion-ease)',
                  position: 'relative', overflow: 'hidden',
                }}
                onMouseEnter={e => e.currentTarget.style.background = item.highlight ? 'rgba(200,155,60,0.12)' : 'var(--hover)'}
                onMouseLeave={e => e.currentTarget.style.background = item.highlight ? 'var(--primary-subtle)' : 'transparent'}
              >
                {/* Indicador lateral dorado en item destacado */}
                {item.highlight && (
                  <div style={{
                    position: 'absolute', left: 0, top: '20%', bottom: '20%',
                    width: 3, background: 'linear-gradient(180deg, var(--primary), var(--primary-hover))',
                    borderRadius: '0 3px 3px 0',
                  }} />
                )}

                {/* Ícono */}
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                  background: item.highlight ? 'rgba(200,155,60,0.15)' : 'var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>
                  {item.icon}
                </div>

                {/* Texto */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 700,
                    color: item.highlight ? 'var(--accent)' : 'var(--text-main)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1.5 }}>
                    {item.sub}
                  </div>
                </div>

                {/* Chevron */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke={item.highlight ? 'var(--accent)' : 'var(--text-soft)'}
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Footer */}
      <div style={{
        textAlign: 'center', paddingTop: 8,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      }}>
        <img src="/enlace-logo.png" alt="Red Enlace" style={{ height: 32, opacity: 0.5, objectFit: 'contain' }} />
        <div style={{ fontSize: 11, color: 'var(--text-soft)', fontWeight: 500 }}>
          Enlace {currentAppLabel} Pro · v2.1.0
        </div>
      </div>

      {/* THEME SELECTOR MODAL */}
      <ThemeSelectorModal isOpen={showThemeModal} onClose={() => setShowThemeModal(false)} />
    </div>
  )
}
