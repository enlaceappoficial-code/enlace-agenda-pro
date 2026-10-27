import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { apiGet } from '../../lib/api'

const SLUG = import.meta.env.VITE_APP_SLUG || 'peluqueria'

export default function Dashboard() {
  const { shop } = useOutletContext()
  const nav = useNavigate()
  const [data, setData] = useState({ appointments: [], upcomingAppointments: [], clients: [], services: [], loading: true })

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    Promise.all([
      apiGet(`/api/appointments?date=${today}`),
      apiGet('/api/appointments/upcoming?limit=3'),
      apiGet('/api/clients'),
      apiGet('/api/services')
    ])
      .then(([rApps, rUp, rCli, rServ]) => setData({
        appointments: rApps.appointments || [],
        upcomingAppointments: rUp.appointments || [],
        clients: rCli.clients || [],
        services: rServ.services || [],
        loading: false
      }))
      .catch(() => setData({ appointments: [], upcomingAppointments: [], clients: [], services: [], loading: false }))
  }, [today])

  if (data.loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '60vh', gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '2px solid var(--border)',
          borderTopColor: 'var(--accent)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Cargando...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const apps = data.appointments
  const completed = apps.filter(a => a.status === 'COMPLETED')
  const confirmed = apps.filter(a => a.status === 'CONFIRMED')
  const pending   = apps.filter(a => ['PENDING', 'IN_PROGRESS'].includes(a.status))
  const income    = completed.reduce((sum, a) => sum + (a.price || 0), 0)
  const online    = apps.filter(a => a.clientId !== null).length
  const dailyGoal = 120000
  const goalPct   = Math.min(100, Math.round((income / dailyGoal) * 100))

  const nextApp = apps
    .filter(a => ['PENDING', 'CONFIRMED'].includes(a.status))
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))[0]
    || data.upcomingAppointments[0]

  const formatTime = iso => new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })
  const formatDateFull = () => new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  const isToday = iso => new Date(iso).toDateString() === new Date().toDateString()

  const getStatusColor = s => {
    if (s === 'COMPLETED')   return '#4ADE80'
    if (s === 'CONFIRMED')   return 'var(--accent)'
    if (s === 'PENDING')     return '#FB923C'
    if (s === 'IN_PROGRESS') return '#FB923C'
    return 'var(--text-muted)'
  }
  const getStatusLabel = s => ({
    COMPLETED: 'Lista', CONFIRMED: 'Confirmada',
    PENDING: 'Pendiente', IN_PROGRESS: 'En curso', CANCELED: 'Cancelada'
  }[s] || s)

  // Clientes en riesgo (no vuelven en 21+ días)
  const atRisk = data.clients.filter(c => {
    const cApps = (c.appointments || []).filter(a => a.status === 'COMPLETED')
    if (!cApps.length) return false
    return Math.floor((Date.now() - new Date(cApps[0].startsAt)) / 86400000) > 21
  }).length

  return (
    <div style={{ padding: '16px', paddingBottom: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── GREETING ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-heading)', fontSize: 22,
              fontWeight: 700, color: 'var(--text-main)',
              letterSpacing: '-0.02em',
            }}>
              Hola, {shop?.name || 'Bienvenido'}
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, textTransform: 'capitalize', fontWeight: 500 }}>
              {formatDateFull()}
            </p>
          </div>
          {/* Indicador dia */}
          <div style={{
            background: 'var(--primary-subtle)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 10px',
            fontSize: 11, fontWeight: 800, color: 'var(--accent)',
            letterSpacing: '0.04em',
          }}>
            HOY
          </div>
        </div>

        {/* Badge trial */}
        {shop?.subscriptionEndsAt && new Date(shop.subscriptionEndsAt) > new Date() && (
          <div style={{
            marginTop: 10,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--primary-subtle)',
            border: '1px solid var(--border-strong)',
            padding: '5px 10px', borderRadius: 'var(--radius-sm)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', boxShadow: 'var(--shadow-glow)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>
              Prueba {shop.planId} · {Math.ceil((new Date(shop.subscriptionEndsAt) - new Date()) / 86400000)} días restantes
            </span>
          </div>
        )}
      </div>

      {/* ── KPI GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {[
          { label: 'Citas hoy', value: apps.length,      unit: '',    color: 'var(--accent)' },
          { label: 'Online',    value: online,            unit: '',    color: 'var(--accent)' },
          { label: 'Listas',    value: completed.length,  unit: '',    color: '#4ADE80' },
          { label: 'Ingresos',  value: `$${(income/1000).toFixed(1)}k`, unit: '', color: '#4ADE80' },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 8px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-card)',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Línea superior decorativa */}
            <div style={{
              position: 'absolute', top: 0, left: '15%', right: '15%', height: 1.5,
              background: kpi.color, opacity: 0.4, borderRadius: '0 0 2px 2px',
            }} />
            <div style={{ fontSize: 20, fontWeight: 800, color: kpi.color, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', marginTop: 3, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── RENDIMIENTO + BARRA DE META ── */}
      {apps.length > 0 && (() => {
        const total = apps.length
        const cPct = Math.round(completed.length / total * 100)
        const cfPct = Math.round(confirmed.length / total * 100)
        const pPct = Math.round(pending.length / total * 100)
        return (
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: 16,
            boxShadow: 'var(--shadow-card)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                Flujo del día
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                {completed.length}/{total} completadas
              </span>
            </div>

            {/* Barra segmentada */}
            <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', gap: 1, marginBottom: 12 }}>
              {cPct  > 0 && <div style={{ flex: cPct,  background: 'linear-gradient(90deg, #22c55e, #4ADE80)', borderRadius: 2 }} />}
              {cfPct > 0 && <div style={{ flex: cfPct, background: 'linear-gradient(90deg, var(--primary), var(--primary-hover))', borderRadius: 2 }} />}
              {pPct  > 0 && <div style={{ flex: pPct,  background: 'rgba(251,146,60,0.5)', borderRadius: 2 }} />}
              {(100 - cPct - cfPct - pPct) > 0 && <div style={{ flex: Math.max(0,100-cPct-cfPct-pPct), background: 'var(--border)', borderRadius: 2 }} />}
            </div>

            {/* Leyenda */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 14 }}>
              {[
                { label: 'Listas',    count: completed.length, color: '#4ADE80',             pct: cPct  },
                { label: 'Confirm.',  count: confirmed.length, color: 'var(--accent)',        pct: cfPct },
                { label: 'Pend.',     count: pending.length,   color: 'rgba(251,146,60,0.8)', pct: pPct  },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 8.5, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-main)' }}>
                      {item.count} <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>({item.pct}%)</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Meta del día */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Meta diaria
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, color: goalPct >= 100 ? '#4ADE80' : 'var(--accent)' }}>
                  {goalPct}% · ${income.toLocaleString('es-CL')}
                </span>
              </div>
              <div style={{
                height: 6, borderRadius: 3,
                background: 'var(--border)',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${goalPct}%`, height: '100%',
                  background: 'linear-gradient(90deg, var(--primary), var(--primary-hover))',
                  borderRadius: 3,
                  transition: 'width 0.8s var(--motion-ease)',
                  boxShadow: goalPct > 0 ? 'var(--shadow-glow)' : 'none',
                }} />
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── BANNER COMPARTIR LINK ── */}
      <div
        onClick={() => nav('/admin/booking-link')}
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 16px',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 14,
          position: 'relative', overflow: 'hidden',
          boxShadow: 'var(--shadow-card)',
          transition: 'var(--transition)',
        }}
      >
        {/* Fondo decorativo dorado */}
        <div style={{
          position: 'absolute', right: -20, top: -20,
          width: 100, height: 100, borderRadius: '50%',
          background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'var(--primary-subtle)',
          border: '1px solid var(--border-strong)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0,
        }}>
          🔗
        </div>
        <div style={{ flex: 1, zIndex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-main)' }}>Compartir link de reservas</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Tus clientes agendan solos, 24/7</div>
        </div>
        <div style={{ color: 'var(--accent)', fontSize: 18, zIndex: 1 }}>→</div>
      </div>

      {/* ── ALERTA CLIENTES EN RIESGO ── */}
      {atRisk > 0 && (
        <div
          onClick={() => nav('/admin/clientes')}
          style={{
            background: 'rgba(251, 146, 60, 0.06)',
            border: '1px solid rgba(251,146,60,0.25)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 16px',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 12,
          }}
        >
          <div style={{ fontSize: 22 }}>⚠️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#FB923C' }}>
              {atRisk} cliente{atRisk > 1 ? 's' : ''} sin visitar en 3+ semanas
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Toca para ver quiénes son</div>
          </div>
          <div style={{ color: '#FB923C' }}>→</div>
        </div>
      )}

      {/* ── PRÓXIMA CITA ── */}
      {nextApp && (
        <div
          onClick={() => nav('/admin/agenda')}
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 16px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-card)',
            position: 'relative', overflow: 'hidden',
          }}
        >
          {/* Línea lateral dorada */}
          <div style={{
            position: 'absolute', left: 0, top: '15%', bottom: '15%',
            width: 3, borderRadius: '0 3px 3px 0',
            background: 'linear-gradient(180deg, var(--primary), var(--primary-hover))',
            boxShadow: 'var(--shadow-glow)',
          }} />

          <div style={{ paddingLeft: 10 }}>
            <div style={{
              fontSize: 10, fontWeight: 800, color: 'var(--accent)',
              letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8,
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span>Próxima cita</span>
              <span style={{ color: 'var(--text-soft)', fontWeight: 500 }}>Ver agenda →</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)' }}>
                  {nextApp.guestName || nextApp.client?.fullName}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {nextApp.service?.name} · {nextApp.service?.durationMin} min
                </div>
              </div>
              <div style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 24, fontWeight: 700, color: 'var(--accent)',
                letterSpacing: '-0.02em',
              }}>
                {formatTime(nextApp.startsAt)}
              </div>
            </div>

            {(nextApp.guestPhone || nextApp.client?.phone) && (
              <a
                href={`https://wa.me/${(nextApp.guestPhone || nextApp.client?.phone).replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${nextApp.guestName || nextApp.client?.fullName}! Te recordamos tu cita hoy a las ${formatTime(nextApp.startsAt)}. ¡Te esperamos!`)}`}
                target="_blank" rel="noreferrer"
                onClick={e => e.stopPropagation()}
                style={{
                  marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: 'rgba(37, 211, 102, 0.10)',
                  border: '1px solid rgba(37,211,102,0.25)',
                  color: '#25D366', textDecoration: 'none',
                  padding: '9px', borderRadius: 'var(--radius-sm)',
                  fontWeight: 700, fontSize: 13,
                  transition: 'var(--transition)',
                }}
              >
                <span>📩</span>
                <span>Recordar por WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── LISTA CITAS DEL DÍA ── */}
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}>
        <div
          onClick={() => nav('/admin/agenda')}
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
            {apps.length === 0 ? 'Próximas citas' : 'Agenda de hoy'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>Ver todo →</span>
        </div>

        {apps.length === 0 && data.upcomingAppointments.length === 0 ? (
          <div style={{
            padding: '28px 16px', textAlign: 'center',
            color: 'var(--text-muted)', fontSize: 13, fontWeight: 500,
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
            Sin citas próximas
          </div>
        ) : (
          (apps.length > 0 ? apps : data.upcomingAppointments)
            .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
            .map((a, idx, arr) => (
              <div
                key={a.id}
                onClick={() => nav('/admin/agenda')}
                style={{
                  padding: '11px 16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer',
                  transition: 'background var(--transition-speed) var(--motion-ease)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{
                  fontSize: 12, fontWeight: 800,
                  color: 'var(--accent)',
                  width: 52, flexShrink: 0,
                  letterSpacing: '-0.01em',
                }}>
                  {isToday(a.startsAt)
                    ? formatTime(a.startsAt)
                    : new Date(a.startsAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {a.guestName || a.client?.fullName}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{a.service?.name}</div>
                </div>
                <div style={{
                  fontSize: 9.5, fontWeight: 800, padding: '3px 8px',
                  borderRadius: 'var(--radius-xs)',
                  background: getStatusColor(a.status) + '18',
                  color: getStatusColor(a.status),
                  letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>
                  {getStatusLabel(a.status)}
                </div>
              </div>
            ))
        )}
      </div>

      {/* ── AVISO SERVICIOS DE EJEMPLO ── */}
      {data.services?.some(s => s.name === 'Corte Clásico' || s.name === 'Perfilado') && (
        <div style={{
          background: 'var(--primary-subtle)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <div style={{ fontSize: 18, flexShrink: 0 }}>💡</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, lineHeight: '1.55' }}>
            Tienes servicios de ejemplo activos. Edítalos o elimínalos en <b style={{ color: 'var(--accent)' }}>Más → Servicios</b>.
          </div>
        </div>
      )}

      {/* ── BOTONES DE ACCIÓN ── */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => nav('/admin/agenda?nueva=1')}
          style={{
            flex: 1, height: 50,
            borderRadius: 'var(--radius-md)', border: 'none',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
            color: 'var(--bg)', fontWeight: 800, fontSize: 14,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-btn)',
            letterSpacing: '-0.01em',
            transition: 'var(--transition)',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-glow)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-btn)' }}
        >
          + Nueva cita
        </button>
        <button
          onClick={() => nav('/admin/agenda?walkin=1')}
          style={{
            flex: 1, height: 50,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            background: 'var(--card)',
            color: 'var(--text-muted)', fontWeight: 700, fontSize: 14,
            cursor: 'pointer',
            transition: 'var(--transition)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--accent)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          Sin cita previa
        </button>
      </div>

    </div>
  )
}
