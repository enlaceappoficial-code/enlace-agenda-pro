import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiGet } from '../lib/api'

export default function BookingConfirm() {
  const { slug, id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet(`/public/shops/${slug}/appointments/${id}`)
      .then(r => { setData(r); setLoading(false) })
      .catch(() => setLoading(false))
  }, [slug, id])

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Cargando...</div>
  if (!data) return <div style={{ padding: 40, textAlign: 'center' }}>Reserva no encontrada</div>

  const { appointment, shop } = data
  const waMsg = `Hola ${shop.name}! Confirmé mi cita para ${appointment.service.name} el ${new Date(appointment.date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} a las ${appointment.time}.`
  const waUrl = `https://wa.me/${(shop.phone || '').replace(/\D/g,'')}?text=${encodeURIComponent(waMsg)}`

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      
      <div style={{ fontSize: 64, marginBottom: 20 }}>🎉</div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>¡Reserva confirmada!</h1>
      <p style={{ color: 'var(--muted)', fontSize: 15, marginBottom: 32 }}>Te esperamos en {shop.name}</p>

      <div style={{ background: 'var(--card)', borderRadius: 16, border: '0.5px solid var(--border)', padding: 20, width: '100%', marginBottom: 24, textAlign: 'left' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', marginBottom: 12 }}>DETALLES DE TU CITA</div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>SERVICIO</div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{appointment.service.name}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>FECHA Y HORA</div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>
              {new Date(appointment.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <div style={{ fontWeight: 800, fontSize: 22, color: 'var(--text)', marginTop: 2 }}>{appointment.time} hrs</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '0.5px solid #eee' }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Total a pagar</span>
            <span style={{ fontWeight: 800, fontSize: 16 }}>${appointment.price.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <a 
        href={waUrl} target="_blank" rel="noreferrer"
        style={{ 
          width: '100%', padding: 16, borderRadius: 14, border: 'none', 
          background: '#25D366', color: 'white', fontWeight: 800, fontSize: 16, 
          textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 30
        }}
      >
        <span>Notificar por WhatsApp</span>
      </a>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Link to={`/b/${slug}/cancel/${id}`} style={{ color: 'var(--muted)', fontSize: 14, textDecoration: 'none' }}>Cancelar esta reserva</Link>
        <Link to={`/b/${slug}`} style={{ color: 'var(--accent)', fontWeight: 800, textDecoration: 'none' }}>← Hacer otra reserva</Link>
      </div>

    </div>
  )
}
