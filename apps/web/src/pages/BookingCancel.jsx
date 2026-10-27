import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiGet, apiPost } from '../lib/api'

export default function BookingCancel() {
  const { slug, id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [phone, setPhone] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    apiGet(`/public/shops/${slug}/appointments/${id}`)
      .then(r => { setData(r); setLoading(false) })
      .catch(() => setLoading(false))
  }, [slug, id])

  const handleCancel = async () => {
    setError(null)
    try {
      await apiPost(`/public/shops/${slug}/appointments/${id}/cancel`, { phone })
      setDone(true)
    } catch (e) {
      if (e.data?.error === 'PHONE_MISMATCH') {
        setError('📱 El número de teléfono ingresado no coincide con el registrado en esta cita. Por favor, revísalo.')
      } else {
        setError('❌ Ocurrió un problema al procesar tu cancelación. Inténtalo nuevamente o contáctanos.')
      }
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Cargando...</div>
  if (!data) return <div style={{ padding: 40, textAlign: 'center' }}>Reserva no encontrada</div>

  const { appointment, shop } = data
  const isCancellable = !['CANCELED', 'COMPLETED', 'NO_SHOW'].includes(appointment.status)

  if (done) {
    return (
      <div style={{ minHeight: '100%', background: 'var(--bg)', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>🗑️</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Reserva cancelada</h1>
        <p style={{ color: 'var(--muted)', marginBottom: 32 }}>Tu cita ha sido eliminada correctamente.</p>
        <Link to={`/b/${slug}`} style={{ color: 'var(--accent)', fontWeight: 800, textDecoration: 'none' }}>← Volver a reservar</Link>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)', padding: '24px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Cancelar Reserva</h1>
      
      <div style={{ background: 'var(--card)', borderRadius: 16, border: '0.5px solid var(--border)', padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', marginBottom: 12 }}>DETALLES DE LA CITA</div>
        <div style={{ fontWeight: 800, fontSize: 16 }}>{appointment.service.name}</div>
        <div style={{ fontSize: 14, marginTop: 4 }}>
          {new Date(appointment.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>{appointment.time} hrs</div>
        <div style={{ 
          marginTop: 10, fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 6, display: 'inline-block',
          background: appointment.status === 'CANCELED' ? '#f3f4f6' : 'var(--green)22',
          color: appointment.status === 'CANCELED' ? 'var(--muted)' : 'var(--green)'
        }}>
          ESTADO: {appointment.status}
        </div>
      </div>

      {!isCancellable ? (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', marginBottom: 20 }}>Esta reserva no puede ser cancelada porque ya ha sido procesada o cancelada previamente.</p>
          <Link to={`/b/${slug}`} style={{ color: 'var(--accent)', fontWeight: 800, textDecoration: 'none' }}>Volver</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.4 }}>
            Por seguridad, ingresa el número de WhatsApp que usaste para reservar para confirmar la cancelación:
          </p>
          <input 
            placeholder="Tu número (ej: 56912345678)" 
            style={{ padding: 16, borderRadius: 12, border: '1px solid var(--border)', fontSize: 15 }}
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
          {error && <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 700 }}>{error}</div>}
          <button 
            onClick={handleCancel}
            disabled={!phone}
            style={{ 
              padding: 18, borderRadius: 14, border: 'none', 
              background: !phone ? 'var(--border)' : 'var(--red)', 
              color: 'white', fontWeight: 800, fontSize: 16 
            }}
          >
            Confirmar Cancelación
          </button>
          <button 
            onClick={() => window.history.back()}
            style={{ border: 'none', background: 'transparent', color: 'var(--muted)', fontWeight: 700 }}
          >
            No, quiero mantener mi cita
          </button>
        </div>
      )}

    </div>
  )
}
