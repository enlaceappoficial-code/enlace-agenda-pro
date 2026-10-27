import { useEffect, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { apiGet, apiPost, apiPatch, apiDelete } from '../../lib/api'

export default function Agenda() {
  const { shop } = useOutletContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [appointments, setAppointments] = useState([])
  const [blockedSlots, setBlockedSlots] = useState([])
  const [services, setServices] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [professionals, setProfessionals] = useState([])
  const [selectedProfId, setSelectedProfId] = useState('all')
  const [showForm, setShowForm] = useState(searchParams.get('walkin') === '1')
  const [selectedApp, setSelectedApp] = useState(null)
  const [editingAppId, setEditingAppId] = useState(null)
  const [formError, setFormError] = useState('')
  const [showBlockForm, setShowBlockForm] = useState(false)
  const [blockForm, setBlockForm] = useState({ startTime: '12:00', endTime: '13:00', reason: '', repeat: 'once', professionalId: '' })
  
  // Form State
  const [formData, setFormData] = useState({
    serviceId: '',
    clientId: '',
    guestName: '',
    guestPhone: '',
    time: '09:00',
    price: 0,
    notes: '',
    tipo: searchParams.get('walkin') === '1' ? 'walkin' : 'manual',
    professionalId: ''
  })

  useEffect(() => {
    fetchData()
  }, [date])

  useEffect(() => {
    if (searchParams.get('nueva') === '1') {
      setShowForm(true)
      setFormData(prev => ({ ...prev, tipo: 'manual' }))
      setSearchParams({})
    }
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [appsRes, servRes, cliRes, blockRes, profRes] = await Promise.all([
        apiGet(`/api/appointments?date=${date}`),
        apiGet('/api/services'),
        apiGet('/api/clients'),
        apiGet(`/api/blocked-slots?date=${date}`),
        apiGet('/api/professionals')
      ])
      setAppointments(appsRes.appointments || [])
      setServices(servRes.services || [])
      setClients(cliRes.clients || [])
      setBlockedSlots(blockRes.slots || [])
      setProfessionals(profRes.professionals || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setFormError('')
    
    // Validaciones locales amigables y de alta fidelidad:
    if (!formData.serviceId) {
      setFormError('Por favor, selecciona un servicio o atención para continuar.')
      return
    }
    if (!formData.time) {
      setFormError('⏰ Por favor, ingresa la hora para la cita.')
      return
    }
    if (!formData.clientId) {
      if (!formData.guestName || !formData.guestName.trim()) {
        setFormError('👤 Por favor, ingresa el nombre de la persona.')
        return
      }
      if (!formData.guestPhone || !formData.guestPhone.trim()) {
        setFormError('📱 Por favor, ingresa el número de WhatsApp para enviarle las confirmaciones.')
        return
      }
    }

    try {
      if (editingAppId) {
        await apiPatch(`/api/appointments/${editingAppId}`, { ...formData, date })
      } else {
        await apiPost('/api/appointments', { ...formData, date })
        // Offer WhatsApp confirmation for new appointments
        const phone = formData.guestPhone || clients.find(c => c.id === formData.clientId)?.phone
        const clientName = formData.guestName || clients.find(c => c.id === formData.clientId)?.fullName
        const serviceName = services.find(s => s.id === formData.serviceId)?.name
        const dateObj = new Date(date + 'T12:00:00')
        const dateLabel = dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
        
        if (phone && clientName) {
          const sendWA = confirm(`✅ Cita creada!\n\n¿Enviar confirmación por WhatsApp a ${clientName}?`)
          if (sendWA) {
            const msg = encodeURIComponent(`Hola ${clientName.split(' ')[0]}! ✅ Tu cita está confirmada:\n\n📋 ${serviceName}\n📅 ${dateLabel}\n⏰ ${formData.time} hrs\n\n¡Te esperamos!`)
            window.open(`https://wa.me/${phone.replace(/\D/g,'')}?text=${msg}`, '_blank')
          }
        }
      }
      setShowForm(false)
      setEditingAppId(null)
      fetchData()
    } catch (e) {
      if (e.message === 'SLOT_TAKEN' || e.error === 'SLOT_TAKEN' || e.data?.error === 'SLOT_TAKEN') {
        setFormError('⏰ Ese horario ya está tomado por otra reserva. Por favor elige otra hora.')
      } else {
        alert('Ocurrió un inconveniente al guardar. Por favor intenta nuevamente.')
      }
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta cita?')) return
    try {
      await apiDelete(`/api/appointments/${id}`)
      setSelectedApp(null)
      fetchData()
    } catch (e) { alert(e.message) }
  }

  const handleSaveBlock = async () => {
    try {
      await apiPost('/api/blocked-slots', { ...blockForm, date })
      setShowBlockForm(false)
      fetchData()
    } catch (e) { alert(e.data?.error || e.message) }
  }

  const handleDeleteBlock = async (id) => {
    if (!confirm('¿Eliminar bloqueo?')) return
    try {
      await apiDelete(`/api/blocked-slots/${id}`)
      fetchData()
    } catch (e) { alert(e.message) }
  }

  const handleStatus = async (id, status) => {
    try {
      await apiPatch(`/api/appointments/${id}/status`, { status })
      setSelectedApp(prev => prev ? { ...prev, status } : null)
      
      if (status === 'COMPLETED' && selectedApp) {
        alert(`✅ Ingreso registrado en Caja: $${Number(selectedApp.price).toLocaleString('es-CL')}`)
      }
      
      fetchData()
    } catch (e) { alert(e.message) }
  }

  const toggleDepositPaid = async (app) => {
    try {
      const nState = !app.depositPaid
      await apiPatch(`/api/appointments/${app.id}`, { depositPaid: nState })
      setSelectedApp(prev => prev ? { ...prev, depositPaid: nState } : null)
      setAppointments(prev => prev.map(a => a.id === app.id ? { ...a, depositPaid: nState } : a))
    } catch (e) { alert(e.message) }
  }

  const handleRebooking = async (app) => {
    const nextDate = new Date(app.startsAt)
    nextDate.setDate(nextDate.getDate() + 14)
    const nextDateISO = nextDate.toISOString().split('T')[0]
    const time = new Date(app.startsAt).toTimeString().slice(0, 5)
    const formattedDate = nextDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    
    if (!confirm(`¿Re-agendar para el ${formattedDate} a las ${time}?`)) return

    try {
      await apiPost('/api/appointments', {
        serviceId: app.serviceId,
        clientId: app.clientId,
        guestName: app.guestName,
        guestPhone: app.guestPhone,
        date: nextDateISO,
        time,
        tipo: 'manual',
        professionalId: app.professionalId || ''
      })
      alert(`✅ Re-agendado para el ${formattedDate} a las ${time}`)
      setSelectedApp(null)
      fetchData()
    } catch (e) { alert(e.data?.error || e.message) }
  }

  // UI Helpers
  const [weekOffset, setWeekOffset] = useState(0)

  const getWeekDays = (offset) => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const mondayDiff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(now)
    monday.setDate(now.getDate() + mondayDiff + (offset * 7))
    
    const result = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      result.push(d)
    }
    return result
  }

  const days = getWeekDays(weekOffset)
  const todayISO = new Date().toISOString().split('T')[0]
  const isCurrentWeek = weekOffset === 0

  const weekMonthLabel = (() => {
    const first = days[0]
    const last = days[6]
    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
    if (first.getMonth() === last.getMonth()) {
      return `${first.getDate()} - ${last.getDate()} ${monthNames[first.getMonth()]} ${first.getFullYear()}`
    }
    return `${first.getDate()} ${monthNames[first.getMonth()].slice(0,3)} - ${last.getDate()} ${monthNames[last.getMonth()].slice(0,3)} ${last.getFullYear()}`
  })()

  const formatTime = (iso) => new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })

  const allItems = [
    ...appointments.map(a => ({ ...a, _type: 'appointment' })),
    ...blockedSlots.map(b => ({ ...b, _type: 'blocked', startsAt: `${b.date}T${b.startTime}:00`, endsAt: `${b.date}T${b.endTime}:00` }))
  ].filter(item => {
    if (selectedProfId === 'all') return true
    return item.professionalId === selectedProfId
  }).sort((a,b) => new Date(a.startsAt) - new Date(b.startsAt))

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      {/* PROFESIONAL SELECTOR */}
      {professionals.length > 0 && (
        <div style={{ 
          background: 'var(--card)', padding: '12px 16px 4px', 
          display: 'flex', gap: 12, overflowX: 'auto', WebkitOverflowScrolling: 'touch',
          borderBottom: '0.5px solid var(--border)'
        }}>
          <button 
            onClick={() => setSelectedProfId('all')}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', whiteSpace: 'nowrap',
              background: selectedProfId === 'all' ? 'var(--accent)' : 'var(--btn-secondary)',
              color: selectedProfId === 'all' ? 'white' : 'var(--btn-secondary-text)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer'
            }}
          >
            Todos
          </button>
          {professionals.map(p => (
            <button 
              key={p.id}
              onClick={() => setSelectedProfId(p.id)}
              style={{
                padding: '6px 14px', borderRadius: 20, border: 'none', whiteSpace: 'nowrap',
                background: selectedProfId === p.id ? 'var(--accent)' : 'var(--btn-secondary)',
                color: selectedProfId === p.id ? 'white' : 'var(--btn-secondary-text)',
                fontSize: 12, fontWeight: 700, cursor: 'pointer'
              }}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
      
      {/* WEEK NAVIGATION */}
      <div style={{ 
        background: 'var(--card)', borderBottom: '0.5px solid var(--border)', 
        position: 'sticky', top: 0, zIndex: 10
      }}>
        {/* Nav row: arrows + month label + today + actions */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', gap: 8 }}>
          <button 
            onClick={() => setWeekOffset(w => w - 1)}
            style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--card)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ←
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{weekMonthLabel}</div>
          </div>
          <button 
            onClick={() => setWeekOffset(w => w + 1)}
            style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--card)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            →
          </button>
          {!isCurrentWeek && (
            <button 
              onClick={() => { setWeekOffset(0); setDate(todayISO); }}
              style={{ padding: '5px 10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
            >
              Hoy
            </button>
          )}
          {/* Calendar jump */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => document.getElementById('agenda-date-picker').showPicker()}
              style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--card)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              📅
            </button>
            <input 
              id="agenda-date-picker"
              type="date" 
              value={date}
              onChange={e => {
                const picked = e.target.value
                if (!picked) return
                setDate(picked)
                // Calculate weekOffset for the picked date
                const pickedDate = new Date(picked + 'T12:00:00')
                const now = new Date()
                const nowDay = now.getDay()
                const nowMondayDiff = nowDay === 0 ? -6 : 1 - nowDay
                const nowMonday = new Date(now)
                nowMonday.setDate(now.getDate() + nowMondayDiff)
                nowMonday.setHours(0,0,0,0)
                const diffMs = pickedDate.getTime() - nowMonday.getTime()
                const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
                setWeekOffset(diffWeeks)
              }}
              style={{ position: 'absolute', top: 0, left: 0, width: 32, height: 32, opacity: 0, cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Days row */}
        <div style={{ display: 'flex', padding: '4px 8px 10px', gap: 4, alignItems: 'center' }}>
          <div style={{ display: 'flex', flex: 1, gap: 4 }}>
            {days.map((d, i) => {
              const iso = d.toISOString().split('T')[0]
              const isActive = iso === date
              const isToday = iso === todayISO
              const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
              return (
                <button 
                  key={i} 
                  onClick={() => setDate(iso)}
                  style={{
                    flex: 1, border: 'none', borderRadius: 10, padding: '8px 2px',
                    background: isActive ? 'var(--accent)' : 'transparent',
                    color: isActive ? 'white' : 'var(--muted)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 700 }}>{dayNames[d.getDay()]}</span>
                  <span style={{ fontSize: 16, fontWeight: 800 }}>{d.getDate()}</span>
                  {isToday && !isActive && (
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', opacity: 0.8 }} />
                  )}
                  {isActive && (
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'white', opacity: 0.8 }} />
                  )}
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              onClick={() => { setShowBlockForm(true); setBlockForm({ startTime: '12:00', endTime: '13:00', reason: '', repeat: 'once' }); }}
              style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--card)', border: '1px solid var(--border)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              🔒
            </button>
            <button 
              onClick={() => { setShowForm(true); setFormData({ ...formData, tipo: 'manual' }); setFormError(''); }}
              style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'var(--accent)', color: 'white', fontSize: 24, fontWeight: 300, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* LISTA DE CITAS */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 40 }}>Cargando...</div>
        ) : allItems.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 40 }}>No hay citas para este día</div>
        ) : (
          allItems.map(a => {
            if (a._type === 'blocked') {
              return (
                <div key={'b-'+a.id} style={{ background: '#333', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, color: 'white' }}>
                  <div style={{ width: 50 }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{a.startTime}</div>
                    <div style={{ fontSize: 11, color: '#aaa' }}>{a.endTime}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>🔒 Bloqueado</div>
                    <div style={{ fontSize: 12, color: '#aaa' }}>{a.reason || 'Sin motivo'}</div>
                  </div>
                  <button onClick={() => handleDeleteBlock(a.id)} style={{ background: 'transparent', border: 'none', color: '#ff4444', fontSize: 24, cursor: 'pointer' }}>×</button>
                </div>
              )
            }
            return (
              <div 
                key={a.id} 
                onClick={() => setSelectedApp(a)}
                style={{ 
                  background: 'var(--card)', borderRadius: 14, border: '0.5px solid var(--border)', 
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer'
                }}
              >
                <div style={{ width: 50 }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{formatTime(a.startsAt)}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{formatTime(a.endsAt)}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{a.guestName || a.client?.fullName}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{a.service?.name}</div>
                  {a.client?.colorFormula && (
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', marginTop: 2 }}>📋 {a.client.colorFormula}</div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>${a.price.toLocaleString()}</div>
                  <div style={{ 
                    fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, marginTop: 4,
                    display: 'inline-block',
                    background: (a.status === 'CONFIRMED' ? 'var(--green)' : a.status === 'PENDING' ? '#f59e0b' : a.status === 'COMPLETED' ? 'var(--green)' : 'var(--red)') + '22',
                    color: a.status === 'CONFIRMED' ? 'var(--green)' : a.status === 'PENDING' ? '#f59e0b' : a.status === 'COMPLETED' ? 'var(--green)' : 'var(--red)'
                  }}>
                    {a.status === 'CONFIRMED' ? 'Confirmada' : a.status === 'PENDING' ? 'Pendiente' : a.status === 'COMPLETED' ? 'Completada' : a.status === 'CANCELED' ? 'Cancelada' : a.status}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* PANEL DETALLE (Bottom Sheet) */}
      {selectedApp && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100 }} onClick={() => setSelectedApp(null)}>
          <div 
            style={{ 
              position: 'absolute', bottom: 0, left: 0, right: 0, 
              background: 'var(--card)', borderTopLeftRadius: 20, borderTopRightRadius: 20,
              padding: '20px 20px 40px', display: 'flex', flexDirection: 'column', gap: 16
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 40, height: 5, background: '#eee', borderRadius: 3, margin: '0 auto 10px' }} />
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>{selectedApp.guestName || selectedApp.client?.fullName}</h3>
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>{selectedApp.service?.name} · {formatTime(selectedApp.startsAt)} - {formatTime(selectedApp.endsAt)}</p>
              <div style={{ 
                display: 'inline-block', marginTop: 6, fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 6,
                background: (selectedApp.status === 'COMPLETED' ? '#22c55e' : selectedApp.status === 'CONFIRMED' ? '#3b82f6' : selectedApp.status === 'PENDING' ? '#f59e0b' : '#ef4444') + '22',
                color: selectedApp.status === 'COMPLETED' ? '#22c55e' : selectedApp.status === 'CONFIRMED' ? '#3b82f6' : selectedApp.status === 'PENDING' ? '#f59e0b' : '#ef4444'
              }}>
                {selectedApp.status === 'COMPLETED' ? '✅ Completada' : selectedApp.status === 'CONFIRMED' ? '✅ Confirmada' : selectedApp.status === 'PENDING' ? '⏳ Pendiente' : selectedApp.status === 'CANCELED' ? '❌ Cancelada' : selectedApp.status}
              </div>
            </div>

            {/* SEÑA / DEPÓSITO SECTION */}
            {selectedApp.depositReceiptUrl && (
              <div style={{ background: 'var(--bg)', borderRadius: 14, padding: 14, border: '0.5px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)' }}>⚡ SEÑA ANTI NO-SHOW</span>
                  <button 
                    onClick={() => toggleDepositPaid(selectedApp)}
                    style={{
                      background: selectedApp.depositPaid ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 160, 32, 0.12)',
                      color: selectedApp.depositPaid ? 'var(--green)' : 'var(--orange)',
                      border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 800, cursor: 'pointer'
                    }}
                  >
                    {selectedApp.depositPaid ? '✓ Seña Verificada' : '⏳ Verificar Seña'}
                  </button>
                </div>
                
                {/* COMPROBANTE IMAGE */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', cursor: 'pointer', background: '#333', flexShrink: 0 }} onClick={() => {
                    const win = window.open();
                    win.document.write(`<iframe src="${selectedApp.depositReceiptUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                  }}>
                    <img src={selectedApp.depositReceiptUrl} alt="Comprobante" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>Comprobante adjuntado</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, lineHeight: 1.3 }}>Haz clic en la miniatura para ver en pantalla completa.</div>
                  </div>
                </div>
              </div>
            )}

            {/* CAMBIAR ESTADO */}
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ key: 'CONFIRMED', label: 'Confirmar', icon: '✅' }, { key: 'COMPLETED', label: 'Completada', icon: '💈' }, { key: 'CANCELED', label: 'Cancelar', icon: '❌' }].map(s => (
                <button 
                  key={s.key}
                  onClick={() => handleStatus(selectedApp.id, s.key)}
                  style={{ 
                    flex: 1, padding: '10px 4px', borderRadius: 10, border: 'none', 
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    background: selectedApp.status === s.key ? 'var(--accent)' : 'var(--btn-secondary)',
                    color: selectedApp.status === s.key ? 'white' : 'var(--btn-secondary-text)'
                  }}
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>

            {/* WHATSAPP RECORDATORIO */}
            {(selectedApp.guestPhone || selectedApp.client?.phone) && (
              <a 
                href={`https://wa.me/${(selectedApp.guestPhone || selectedApp.client?.phone).replace(/\D/g,'')}?text=${encodeURIComponent(`Hola ${selectedApp.guestName || selectedApp.client?.fullName}! Te recordamos tu cita de ${selectedApp.service?.name} hoy a las ${formatTime(selectedApp.startsAt)}. ¡Te esperamos!`)}`}
                target="_blank" rel="noreferrer"
                style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: '#25D366', color: 'white', textDecoration: 'none', 
                  padding: 12, borderRadius: 10, fontWeight: 700, fontSize: 14
                }}
              >
                📩 Recordar por WhatsApp
              </a>
            )}

            {/* ACCIONES */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button 
                onClick={() => {
                  setFormData({
                    serviceId: selectedApp.serviceId,
                    clientId: selectedApp.clientId || '',
                    guestName: selectedApp.guestName || '',
                    guestPhone: selectedApp.guestPhone || '',
                    time: formatTime(selectedApp.startsAt),
                    price: selectedApp.price,
                    notes: selectedApp.notes || '',
                    tipo: 'manual',
                    professionalId: selectedApp.professionalId || ''
                  })
                  setEditingAppId(selectedApp.id)
                  setSelectedApp(null)
                  setShowForm(true)
                }}
                style={{ gridColumn: 'span 2', padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', fontWeight: 700 }}
              >
                ✏️ Editar Detalles
              </button>
              <button 
                onClick={() => handleRebooking(selectedApp)}
                style={{ padding: 12, borderRadius: 10, border: '1px solid var(--accent)', background: 'var(--card)', color: 'var(--accent)', fontWeight: 700 }}
              >
                📅 Re-agendar +14d
              </button>
              <button 
                onClick={() => handleDelete(selectedApp.id)}
                style={{ padding: 12, borderRadius: 10, border: 'none', background: 'rgba(255, 59, 59, 0.1)', color: 'var(--red)', fontWeight: 700 }}
              >
                🗑️ Eliminar
              </button>
            </div>
            
            <button 
              onClick={() => setSelectedApp(null)}
              style={{ padding: 12, borderRadius: 10, border: 'none', background: 'var(--btn-secondary)', color: 'var(--btn-secondary-text)', fontWeight: 700 }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* FORMULARIO NUEVA CITA */}
      {showForm && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 101 }}>
          <div style={{ 
            position: 'absolute', bottom: 0, left: 0, right: 0, 
            background: 'var(--card)', borderTopLeftRadius: 20, borderTopRightRadius: 20,
            padding: '20px', maxHeight: '90%', overflowY: 'auto'
          }}>
            <h3 style={{ marginBottom: 16, fontWeight: 800 }}>{editingAppId ? 'Editar Cita' : 'Nueva Cita'} - {date}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Servicio</label>
              <select 
                style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}
                value={formData.serviceId}
                onChange={e => {
                  const s = services.find(x => x.id === e.target.value)
                  setFormData({ ...formData, serviceId: e.target.value, price: s?.price || 0 })
                }}
              >
                <option value="">Seleccionar servicio...</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name} (${s.price})</option>)}
              </select>

              <label style={{ fontSize: 12, fontWeight: 700 }}>Profesional (Opcional)</label>
              <select 
                style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}
                value={formData.professionalId || ''}
                onChange={e => setFormData({ ...formData, professionalId: e.target.value })}
              >
                <option value="">Cualquiera / Sin asignar</option>
                {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <label style={{ fontSize: 12, fontWeight: 700 }}>Cliente</label>
              <select 
                style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}
                value={formData.clientId}
                onChange={e => setFormData({ ...formData, clientId: e.target.value })}
              >
                <option value="">Nuevo cliente / Invitado</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
              </select>

              {!formData.clientId && (
                <>
                  <input 
                    placeholder="Nombre del cliente" 
                    style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}
                    value={formData.guestName}
                    onChange={e => setFormData({ ...formData, guestName: e.target.value })}
                  />
                  <input 
                    placeholder="WhatsApp (ej: 569...)" 
                    style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}
                    value={formData.guestPhone}
                    onChange={e => setFormData({ ...formData, guestPhone: e.target.value })}
                  />
                </>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Hora</label>
                  <input 
                    type="time" 
                    style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}
                    value={formData.time}
                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Precio</label>
                  <input 
                    type="number" 
                    style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                  />
                </div>
              </div>

              <button 
                onClick={handleSave}
                style={{ padding: 14, borderRadius: 12, border: 'none', background: 'var(--accent)', color: 'white', fontWeight: 800, marginTop: 10 }}
              >
                {editingAppId ? '💾 Guardar Cambios' : formData.tipo === 'walkin' ? '💈 Iniciar Walk-in' : '✅ Confirmar Cita'}
              </button>
              {formError && (
                <div style={{ color: '#ef4444', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
                  {formError}
                </div>
              )}
              <button 
                onClick={() => setShowForm(false)}
                style={{ padding: 14, borderRadius: 12, border: 'none', background: 'var(--btn-secondary)', color: 'var(--btn-secondary-text)', fontWeight: 700 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORMULARIO BLOQUEO */}
      {showBlockForm && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 101 }}>
          <div style={{ 
            position: 'absolute', bottom: 0, left: 0, right: 0, 
            background: 'var(--card)', borderTopLeftRadius: 20, borderTopRightRadius: 20,
            padding: '20px', maxHeight: '90%', overflowY: 'auto'
          }}>
            <h3 style={{ marginBottom: 16, fontWeight: 800 }}>Bloquear Horario - {date}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Desde</label>
                  <input type="time" style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} value={blockForm.startTime} onChange={e => setBlockForm({ ...blockForm, startTime: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Hasta</label>
                  <input type="time" style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} value={blockForm.endTime} onChange={e => setBlockForm({ ...blockForm, endTime: e.target.value })} />
                </div>
              </div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Profesional (Opcional)</label>
              <select 
                style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} 
                value={blockForm.professionalId || ''} 
                onChange={e => setBlockForm({ ...blockForm, professionalId: e.target.value })}
              >
                <option value="">Toda la barbería</option>
                {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <label style={{ fontSize: 12, fontWeight: 700 }}>Motivo</label>
              <input placeholder="Almuerzo, Banco, Vacaciones..." style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} value={blockForm.reason} onChange={e => setBlockForm({ ...blockForm, reason: e.target.value })} />

              <label style={{ fontSize: 12, fontWeight: 700 }}>Repetición</label>
              <select style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)' }} value={blockForm.repeat} onChange={e => setBlockForm({ ...blockForm, repeat: e.target.value })}>
                <option value="once">Solo este día</option>
                <option value="daily_week">Todos los días (por 1 semana)</option>
                <option value="daily_month">Todos los días (por 1 mes)</option>
                <option value="weekly_month">Mismo día de la semana (por 1 mes)</option>
              </select>

              <button onClick={handleSaveBlock} style={{ padding: 14, borderRadius: 12, border: 'none', background: 'var(--accent)', color: 'white', fontWeight: 800, marginTop: 10 }}>
                Bloquear
              </button>
              <button onClick={() => setShowBlockForm(false)} style={{ padding: 14, borderRadius: 12, border: 'none', background: 'var(--btn-secondary)', color: 'var(--btn-secondary-text)', fontWeight: 700 }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
