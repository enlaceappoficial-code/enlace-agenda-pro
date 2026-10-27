import { useAppTheme } from '../context/ThemeContext'

export default function ThemeSelectorModal({ isOpen, onClose }) {
  const { theme, setTheme, themes } = useAppTheme()

  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          width: '100%',
          maxWidth: 540,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-popover)',
          overflow: 'hidden',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 22px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🎨</span>
              <h2 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--text-main)',
                margin: 0,
              }}>
                Paleta de Colores
              </h2>
            </div>
            <p style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              marginTop: 4,
              marginBottom: 0,
            }}>
              Elige el estilo visual que mejor se adapte a tu marca o gusto personal.
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'var(--hover)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        {/* Lista de Paletas */}
        <div style={{
          padding: '16px 20px',
          overflowY: 'auto',
          display: 'grid',
          gap: 12,
        }}>
          {themes.map(t => {
            const isSelected = theme === t.id
            return (
              <div
                key={t.id}
                onClick={() => setTheme(t.id)}
                style={{
                  padding: '14px 16px',
                  borderRadius: 14,
                  cursor: 'pointer',
                  border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: isSelected ? 'var(--primary-subtle)' : 'var(--card-bg-2, var(--hover))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 14,
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? '0 0 16px var(--primary-glow)' : 'none',
                }}
              >
                {/* Lado izquierdo: Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 15,
                      fontWeight: 700,
                      color: 'var(--text-main)',
                    }}>
                      {t.name}
                    </span>

                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                      color: isSelected ? '#000' : 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}>
                      {t.subtitle}
                    </span>
                  </div>

                  <p style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    margin: 0,
                    lineHeight: 1.3,
                  }}>
                    {t.description}
                  </p>
                </div>

                {/* Lado derecho: Muestra de colores + Check */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  {/* Swatches de colores */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 6px',
                    borderRadius: 20,
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}>
                    {t.colors.map((c, idx) => (
                      <div
                        key={idx}
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          background: c,
                          border: '1px solid rgba(255,255,255,0.25)',
                          boxShadow: idx === 2 ? `0 0 6px ${c}` : 'none',
                        }}
                      />
                    ))}
                  </div>

                  {/* Indicador Activo */}
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: isSelected ? 'var(--accent)' : 'transparent',
                    border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--text-soft)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#000',
                    fontSize: 12,
                    fontWeight: 900,
                  }}>
                    {isSelected ? '✓' : ''}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--border)',
          background: 'var(--card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Se guarda automáticamente para tu sesión.
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: 10,
              background: 'var(--accent)',
              color: '#000',
              fontWeight: 700,
              fontSize: 12,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 10px var(--primary-glow)',
            }}
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  )
}
