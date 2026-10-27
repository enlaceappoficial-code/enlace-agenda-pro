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
  const modality = appointment.service?.modality || 'PRESENCIAL'
  const isEncargo = modality === 'ENCARGO'
  const isOnline = modality === 'ONLINE'

  const dateStr = new Date(appointment.date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
  const dateWithWeekday = new Date(appointment.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  let waMsg = ''
  if (isEncargo) {
    waMsg = `Hola ${shop.name}! Confirmé mi pedido de encargo para ${appointment.service.name} (Retiro: ${dateStr} a las ${appointment.time} hrs).`
    if (appointment.notes) {
      waMsg += ` Mis especificaciones: "${appointment.notes}".`
    }
  } else if (isOnline) {
    waMsg = `Hola ${shop.name}! Confirmé mi cita online para ${appointment.service.name} el ${dateStr} a las ${appointment.time} hrs.`
  } else {
    waMsg = `Hola ${shop.name}! Confirmé mi cita para ${appointment.service.name} el ${dateStr} a las ${appointment.time} hrs.`
  }

  const waUrl = `https://wa.me/${(shop.phone || '').replace(/\D/g,'')}?text=${encodeURIComponent(waMsg)}`

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      
      <div style={{ fontSize: 64, marginBottom: 20 }}>
        {isEncargo ? '📦' : isOnline ? '💻' : '🎉'}
      </div>
      
      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
        {isEncargo ? '¡Pedido de encargo confirmado!' : isOnline ? '¡Cita online confirmada!' : '¡Reserva confirmada!'}
      </h1>
      
      <p style={{ color: 'var(--muted)', fontSize: 15, marginBottom: 32 }}>
        {isEncargo ? `Te esperamos para el retiro en ${shop.name}` : isOnline ? `Nos conectaremos en el horario acordado con ${shop.name}` : `Te esperamos en ${shop.name}`}
      </p>

      <div style={{ background: 'var(--card)', borderRadius: 16, border: '0.5px solid var(--border)', padding: 20, width: '100%', marginBottom: 24, textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)' }}>
            {isEncargo ? 'DETALLES DE TU ENCARGO' : isOnline ? 'DETALLES DE TU SESIÓN ONLINE' : 'DETALLES DE TU CITA'}
          </span>
          <span style={{
            background: isOnline ? 'rgba(59, 130, 246, 0.12)' : isEncargo ? 'rgba(168, 85, 247, 0.12)' : 'rgba(34, 197, 94, 0.12)',
            color: isOnline ? '#3b82f6' : isEncargo ? '#a855f7' : '#22c55e',
            padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800
          }}>
            {isOnline ? '💻 Online' : isEncargo ? '📦 Encargo' : '🏢 Presencial'}
          </span>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>
              {isEncargo ? 'PRODUCTO / SERVICIO' : 'SERVICIO / CLASE'}
            </div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{appointment.service.name}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>
              {isEncargo ? 'FECHA Y HORA ESTIMADA DE RETIRO' : 'FECHA Y HORA'}
            </div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{dateWithWeekday}</div>
            <div style={{ fontWeight: 800, fontSize: 22, color: 'var(--accent)', marginTop: 2 }}>{appointment.time} hrs</div>
          </div>

          {appointment.notes && (
            <div style={{ paddingTop: 10, borderTop: '0.5px solid #eee' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>
                {isEncargo ? 'ESPECIFICACIONES DEL ENCARGO' : 'NOTAS DEL CLIENTE'}
              </div>
              <div style={{ fontSize: 13, marginTop: 4, fontStyle: 'italic', color: 'var(--text)', background: 'rgba(0,0,0,0.03)', padding: 10, borderRadius: 8 }}>
                "{appointment.notes}"
              </div>
            </div>
          )}

          {appointment.service?.instructions && (
            <div style={{ background: 'rgba(37, 99, 235, 0.08)', borderRadius: 12, padding: 12, border: '1px solid rgba(37, 99, 235, 0.2)', fontSize: 13, marginTop: 4 }}>
              <div style={{ fontWeight: 800, color: 'var(--accent)', marginBottom: 2 }}>📌 Indicaciones importantes:</div>
              <div style={{ color: 'var(--text)' }}>{appointment.service.instructions}</div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '0.5px solid #eee' }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Total a pagar</span>
            <span style={{ fontWeight: 800, fontSize: 16 }}>${appointment.price.toLocaleString('es-CL')}</span>
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
        <Link to={`/b/${slug}`} style={{ color: 'var(--accent)', fontWeight: 800, textDecoration: 'none' }}>← Volver al inicio</Link>
      </div>

    </div>
  )
}
