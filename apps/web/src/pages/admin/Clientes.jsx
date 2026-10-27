import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { apiGet, apiPost, apiPatch, apiDelete } from '../../lib/api'

export default function Clientes() {
  const { shop } = useOutletContext() || {}
  const effectiveType = shop?.businessType || localStorage.getItem('enlace_business_type') || 'salud'
  const isAsesoria = effectiveType === 'asesoria'
  const clientWord = isAsesoria ? 'Cliente' : 'Paciente'
  const clientPlural = isAsesoria ? 'Clientes' : 'Pacientes'
  const businessName = isAsesoria ? 'el centro de asesoría' : 'la consulta médica'
  const emoji = isAsesoria ? '💼' : '🩺'
  const serviceWord = isAsesoria ? 'tu próxima sesión' : 'tu próxima consulta'

  const [view, setView] = useState('lista')
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('todos') // todos, activo, riesgo, inactivo, perdido

  const [formData, setFormData] = useState({
    fullName: '', phone: '', email: '', notes: '', colorFormula: '', category: 'Regular'
  })

  useEffect(() => { fetchClients() }, [])

  const fetchClients = async () => {
    setLoading(true)
    try {
      const r = await apiGet('/api/clients')
      setClients(r.clients || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleSave = async () => {
    if (!formData.fullName || !formData.fullName.trim()) {
      alert('👤 ¡Opa! Por favor, ingresa el nombre completo del cliente.')
      return
    }
    if (!formData.phone || !formData.phone.trim()) {
      alert('📱 Por favor, ingresa el número de WhatsApp del cliente.')
      return
    }

    try {
      if (selectedClient && view === 'editar') {
        await apiPatch(`/api/clients/${selectedClient.id}`, formData)
      } else {
        await apiPost('/api/clients', formData)
      }
      setView('lista')
      fetchClients()
    } catch (e) { 
      alert(e.data?.error || '👤 ¡Ups! Tuvimos un inconveniente al guardar el cliente. Revisa los datos e intenta nuevamente.') 
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Seguro que deseas eliminar este cliente?')) return
    try {
      await apiDelete(`/api/clients/${selectedClient.id}`)
      setView('lista')
      fetchClients()
    } catch (e) { 
      alert('👤 ¡Ups! No pudimos eliminar el cliente en este momento. Inténtalo nuevamente.') 
    }
  }

  // CRM helpers
  const getClientStatus = (client) => {
    const apps = (client.appointments || []).filter(a => a.status === 'COMPLETED')
    if (apps.length === 0) return { label: 'Nuevo', color: '#3b82f6', bg: '#3b82f622', days: null, key: 'nuevo' }
    const lastVisit = new Date(apps[0].startsAt)
    const days = Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
    if (days <= 21) return { label: 'Activo', color: '#22c55e', bg: '#22c55e22', days, key: 'activo' }
    if (days <= 45) return { label: 'En riesgo', color: '#f59e0b', bg: '#f59e0b22', days, key: 'riesgo' }
    if (days <= 90) return { label: 'Inactivo', color: '#ef4444', bg: '#ef444422', days, key: 'inactivo' }
    return { label: 'Perdido', color: '#6b7280', bg: '#6b728022', days, key: 'perdido' }
  }

  const getRetentionMsg = (client, status) => {
    const name = client.fullName.split(' ')[0]
    if (status.key === 'riesgo') return `Hola ${name}! 👋 Te echamos de menos en ${businessName}. ¿Agendamos ${serviceWord}? ¡Te esperamos! ${emoji}`
    if (status.key === 'inactivo') return `Hola ${name}! Hace tiempo que no te vemos 😢 Queremos invitarte con un 15% de descuento en tu próximo servicio. ¿Qué dices? ${emoji}`
    if (status.key === 'perdido') return `Hola ${name}! 🎁 Ha pasado mucho tiempo y queremos reconquistarte. Te ofrecemos un servicio de cortesía junto con ${serviceWord}. ¡Vuelve, te extrañamos! ${emoji}`
    return `Hola ${name}! Gracias por tu preferencia ${emoji} ¿Agendamos ${serviceWord}?`
  }

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const enriched = clients.map(c => ({ ...c, _status: getClientStatus(c) }))
  
  const filtered = enriched
    .filter(c => c.fullName.toLowerCase().includes(search.toLowerCase()) || (c.phone || '').includes(search))
    .filter(c => filter === 'todos' || c._status.key === filter)

  // Stats
  const stats = {
    activo: enriched.filter(c => c._status.key === 'activo').length,
    riesgo: enriched.filter(c => c._status.key === 'riesgo').length,
    inactivo: enriched.filter(c => c._status.key === 'inactivo').length,
    perdido: enriched.filter(c => c._status.key === 'perdido').length,
  }

  // VISTA LISTA
  if (view === 'lista') {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 16, background: 'var(--card)', borderBottom: '0.5px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <input 
              placeholder="Buscar por nombre o teléfono..." 
              style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)' }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button 
              onClick={() => { setFormData({ fullName: '', phone: '', email: '', notes: '', colorFormula: '', category: 'Regular' }); setView('editar'); setSelectedClient(null) }}
              style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 12, padding: '0 16px', fontWeight: 700 }}
            >
              + Nuevo
            </button>
          </div>

          {/* CRM FILTER PILLS */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            {[
              { key: 'todos', label: `Todos (${enriched.length})`, color: 'var(--accent)' },
              { key: 'activo', label: `✅ ${stats.activo}`, color: '#22c55e' },
              { key: 'riesgo', label: `⚠️ ${stats.riesgo}`, color: '#f59e0b' },
              { key: 'inactivo', label: `😴 ${stats.inactivo}`, color: '#ef4444' },
              { key: 'perdido', label: `👻 ${stats.perdido}`, color: '#6b7280' },
            ].map(f => (
              <button 
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: '6px 12px', borderRadius: 20, border: 'none', whiteSpace: 'nowrap',
                  background: filter === f.key ? f.color : 'var(--btn-secondary)',
                  color: filter === f.key ? 'white' : 'var(--btn-secondary-text)',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 20 }}>Cargando...</div> :
           filtered.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 20 }}>No hay clientes en esta categoría</div> :
           filtered.map(c => (
            <div 
              key={c.id} 
              onClick={() => { setSelectedClient(c); setView('ficha') }}
              style={{ background: 'var(--card)', padding: 14, borderRadius: 14, border: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: c._status.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>
                {getInitials(c.fullName)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{c.fullName}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.phone || 'Sin teléfono'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: c._status.bg, color: c._status.color }}>
                  {c._status.label}
                </div>
                {c._status.days !== null && (
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>hace {c._status.days}d</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // VISTA FICHA
  if (view === 'ficha' && selectedClient) {
    const apps = selectedClient.appointments || []
    const completedApps = apps.filter(a => a.status === 'COMPLETED')
    const totalSpent = completedApps.reduce((s, a) => s + a.price, 0)
    const status = getClientStatus(selectedClient)
    const avgFreq = completedApps.length >= 2 
      ? Math.round((new Date(completedApps[completedApps.length-1].startsAt).getTime() - new Date(completedApps[0].startsAt).getTime()) / (1000*60*60*24) / (completedApps.length - 1)) * -1
      : null

    const retentionMsg = getRetentionMsg(selectedClient, status)
    const phone = selectedClient.phone?.replace(/\D/g, '')
    
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 40 }}>
        <button onClick={() => setView('lista')} style={{ alignSelf: 'flex-start', border: 'none', background: 'transparent', color: 'var(--accent)', fontWeight: 700 }}>← Volver</button>
        
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: status.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 32, margin: '0 auto 12px' }}>
            {getInitials(selectedClient.fullName)}
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>{selectedClient.fullName}</h2>
          <p style={{ color: 'var(--muted)' }}>{selectedClient.phone || 'Sin teléfono'}</p>
          <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 8, background: status.bg, color: status.color, fontSize: 12, fontWeight: 800, marginTop: 4 }}>
            {status.label} {status.days !== null ? `· hace ${status.days} días` : ''}
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, background: 'var(--card)', padding: 12, borderRadius: 12, textAlign: 'center', border: '0.5px solid var(--border)' }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{completedApps.length}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>Visitas</div>
          </div>
          <div style={{ flex: 1, background: 'var(--card)', padding: 12, borderRadius: 12, textAlign: 'center', border: '0.5px solid var(--border)' }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>${(totalSpent/1000).toFixed(1)}k</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>Gastado</div>
          </div>
          <div style={{ flex: 1, background: 'var(--card)', padding: 12, borderRadius: 12, textAlign: 'center', border: '0.5px solid var(--border)' }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{avgFreq ? `${avgFreq}d` : '-'}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>Frecuencia</div>
          </div>
        </div>

        {/* RETENCIÓN - Only show for at-risk, inactive, or lost clients */}
        {['riesgo', 'inactivo', 'perdido'].includes(status.key) && phone && (
          <div style={{ background: status.bg, border: `1px solid ${status.color}33`, borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: status.color, marginBottom: 8 }}>
              {status.key === 'riesgo' ? '⚠️ CLIENTE EN RIESGO' : status.key === 'inactivo' ? '😴 CLIENTE INACTIVO' : '👻 CLIENTE PERDIDO'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 12, lineHeight: 1.4, opacity: 0.8 }}>
              {status.key === 'riesgo' && 'Lleva más de 3 semanas sin venir. Un mensaje amigable puede traerlo de vuelta.'}
              {status.key === 'inactivo' && 'Lleva más de 45 días. Ofrécele un descuento para motivar su regreso.'}
              {status.key === 'perdido' && 'Lleva más de 3 meses sin venir. Un servicio de cortesía puede reconquistarlo.'}
            </div>
            <a
              href={`https://wa.me/${phone}?text=${encodeURIComponent(retentionMsg)}`}
              target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#25D366', color: 'white', textDecoration: 'none', padding: 12, borderRadius: 10, fontWeight: 700, fontSize: 14 }}
            >
              💬 {status.key === 'riesgo' ? 'Enviar recordatorio' : status.key === 'inactivo' ? 'Ofrecer descuento' : 'Enviar invitación especial'}
            </a>
          </div>
        )}

        {selectedClient.colorFormula && (
          <div style={{ background: isAsesoria ? '#eff6ff' : '#f0fdf4', border: `1px solid ${isAsesoria ? '#93c5fd' : '#86efac'}`, padding: 16, borderRadius: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: isAsesoria ? '#1e40af' : '#166534', marginBottom: 4 }}>
              {isAsesoria ? '💼 EXPEDIENTE / CASO' : '🩺 FICHA / ANTECEDENTES CLÍNICOS'}
            </div>
            <div style={{ fontSize: 14 }}>{selectedClient.colorFormula}</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            onClick={() => { setFormData({ ...selectedClient }); setView('editar') }}
            style={{ flex: 1, padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', fontWeight: 700 }}
          >
            ✏️ Editar
          </button>
          {phone && (
            <a 
              href={`https://wa.me/${phone}`}
              style={{ flex: 1, padding: 14, borderRadius: 12, border: 'none', background: '#25D366', color: 'white', fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}
            >
              💬 WhatsApp
            </a>
          )}
        </div>

        {/* HISTORIAL */}
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Historial de Atenciones</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {apps.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Sin atenciones registradas</div> :
            apps.map(a => (
              <div key={a.id} style={{ background: 'var(--card)', padding: 12, borderRadius: 12, border: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{a.service?.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{new Date(a.startsAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>${a.price.toLocaleString()}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: a.status === 'COMPLETED' ? '#22c55e' : a.status === 'CANCELED' ? '#ef4444' : '#f59e0b' }}>
                    {a.status === 'COMPLETED' ? 'Completada' : a.status === 'CANCELED' ? 'Cancelada' : a.status === 'PENDING' ? 'Pendiente' : a.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // VISTA EDITAR
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ fontWeight: 800 }}>{selectedClient ? `Editar ${clientWord}` : `Nuevo ${clientWord}`}</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input placeholder={`Nombre completo del ${clientWord.toLowerCase()} *`} style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border)' }} value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
        <input placeholder="WhatsApp (ej: 56912345678) *" style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border)' }} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
        <input placeholder="Email (opcional)" style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border)' }} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
        
        <label style={{ fontSize: 12, fontWeight: 700 }}>Categoría</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {['Regular', 'VIP', 'Nuevo', 'Inactivo'].map(cat => (
            <button key={cat} onClick={() => setFormData({ ...formData, category: cat })} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', fontSize: 11, fontWeight: 700, background: formData.category === cat ? 'var(--accent)' : 'var(--btn-secondary)', color: formData.category === cat ? 'white' : 'var(--btn-secondary-text)' }}>{cat}</button>
          ))}
        </div>

        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
          {isAsesoria ? '💼 Expediente / Antecedentes del Caso' : '🩺 Ficha Clínica / Antecedentes Médicos'}
        </label>
        <textarea 
          placeholder={isAsesoria ? "Ej: Empresa SpA, caso civil en tramitación, contrato de prestación..." : "Ej: Alergia a penicilina, tratamiento crónico, diagnósticos previos..."} 
          style={{ padding: 14, borderRadius: 12, border: '1px solid var(--accent)', background: 'var(--card)', minHeight: 80, color: 'var(--text)' }} 
          value={formData.colorFormula} 
          onChange={e => setFormData({ ...formData, colorFormula: e.target.value })} 
        />
        <textarea placeholder="Notas adicionales o seguimiento..." style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border)', minHeight: 60 }} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />

        <button onClick={handleSave} style={{ padding: 16, borderRadius: 14, border: 'none', background: 'var(--accent)', color: 'white', fontWeight: 800, marginTop: 10 }}>Guardar Cambios</button>
        {selectedClient && (
          <button onClick={handleDelete} style={{ padding: 14, borderRadius: 14, border: 'none', background: 'rgba(255, 59, 59, 0.1)', color: 'var(--red)', fontWeight: 700 }}>Eliminar {clientWord}</button>
        )}
        <button onClick={() => setView(selectedClient ? 'ficha' : 'lista')} style={{ padding: 14, borderRadius: 14, border: 'none', background: 'var(--btn-secondary)', color: 'var(--btn-secondary-text)', fontWeight: 700 }}>Cancelar</button>
      </div>
    </div>
  )
}
