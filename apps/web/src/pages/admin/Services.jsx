import { useEffect, useMemo, useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { apiGet, apiPost, apiPatch } from '../../lib/api'

export default function Services() {
  const { shop } = useOutletContext()
  const nav = useNavigate()
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ 
    name: '', 
    category: 'General', 
    durationMin: 30, 
    price: 0, 
    modality: 'PRESENCIAL',
    instructions: '',
    costMaterials: '', 
    costEquipment: '', 
    active: true,
    depositRequired: false,
    depositAmount: ''
  })
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const grouped = useMemo(() => {
    const map = new Map()
    for (const s of services) {
      if (!map.has(s.category)) map.set(s.category, [])
      map.get(s.category).push(s)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [services])

  const load = () => {
    setLoading(true)
    apiGet('/api/services')
      .then(r => setServices(r.services || []))
      .catch(() => setServices([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!form.name || !form.name.trim()) {
      alert('Por favor, ingresa el nombre de la atención, clase o encargo (ej: Asesoría de Portafolio, Timbre Automático).')
      return
    }
    if (Number(form.price) < 0) {
      alert('💰 El precio no puede ser menor a $0.')
      return
    }

    try {
      const payload = {
        ...form,
        durationMin: Number(form.durationMin),
        price: Number(form.price),
        depositAmount: form.depositRequired ? (Number(form.depositAmount) || 0) : 0
      }

      if (editingId) {
        await apiPatch(`/api/services/${editingId}`, payload)
      } else {
        await apiPost('/api/services', payload)
      }

      setForm({ 
        name: '', 
        category: 'General', 
        durationMin: 30, 
        price: 0, 
        modality: 'PRESENCIAL',
        instructions: '',
        costMaterials: '', 
        costEquipment: '', 
        active: true,
        depositRequired: false,
        depositAmount: ''
      })
      setEditingId(null)
      setShowForm(false)
      load()
    } catch (e) { 
      alert(e.data?.error || 'Tuvimos un inconveniente al guardar el servicio. Inténtalo de nuevo.') 
    }
  }

  const toggle = async (id, active) => {
    try {
      await apiPatch(`/api/services/${id}`, { active })
      setServices(prev => prev.map(s => s.id === id ? { ...s, active } : s))
    } catch (e) { 
      alert('No pudimos cambiar el estado del servicio en este momento. Inténtalo nuevamente.') 
    }
  }

  const handleEdit = (s) => {
    setForm({
      name: s.name,
      category: s.category,
      durationMin: s.durationMin,
      price: s.price,
      modality: s.modality || 'PRESENCIAL',
      instructions: s.instructions || '',
      costMaterials: s.costMaterials || '',
      costEquipment: s.costEquipment || '',
      active: s.active,
      depositRequired: s.depositRequired || false,
      depositAmount: s.depositAmount || ''
    })
    setEditingId(s.id)
    setShowForm(true)
  }

  const isPremium = shop?.planId === 'PRO'

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', height: '100%', paddingBottom: 60 }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Servicios, Clases & Encargos</h2>
        <button 
          onClick={() => {
            setForm({ 
              name: '', 
              category: 'General', 
              durationMin: 30, 
              price: 0, 
              modality: 'PRESENCIAL',
              instructions: '',
              costMaterials: '', 
              costEquipment: '', 
              active: true,
              depositRequired: false,
              depositAmount: ''
            })
            setEditingId(null)
            setShowForm(true)
          }}
          style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 12, padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}
        >
          + Nuevo
        </button>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Cargando...</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {grouped.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, background: 'var(--card)', borderRadius: 16, border: '1px dashed var(--border)', color: 'var(--muted)' }}>
              No tienes servicios creados. Haz clic en + Nuevo para agregar uno.
            </div>
          ) : grouped.map(([cat, items]) => (
            <div key={cat}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase' }}>{cat}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(s => (
                  <div key={s.id} style={{ background: 'var(--card)', padding: 16, borderRadius: 14, border: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => handleEdit(s)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</span>
                        <span style={{ 
                          background: s.modality === 'ONLINE' ? 'rgba(59, 130, 246, 0.12)' : s.modality === 'ENCARGO' ? 'rgba(168, 85, 247, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                          color: s.modality === 'ONLINE' ? '#3b82f6' : s.modality === 'ENCARGO' ? '#a855f7' : '#22c55e',
                          padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800
                        }}>
                          {s.modality === 'ONLINE' ? '💻 Online' : s.modality === 'ENCARGO' ? '📦 Encargo' : '🏢 Presencial'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <span>⏱️ {s.durationMin} min</span>
                        <span>·</span>
                        <span style={{ fontWeight: 700 }}>${s.price.toLocaleString('es-CL')}</span>
                        {s.depositRequired && (
                          <span style={{ background: 'rgba(245, 160, 32, 0.1)', color: 'var(--orange)', padding: '2px 6px', borderRadius: 6, fontSize: 10, fontWeight: 800 }}>
                            ⚡ Seña: ${s.depositAmount.toLocaleString('es-CL')}
                          </span>
                        )}
                      </div>
                      {s.instructions && (
                        <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>ℹ️</span> <span>{s.instructions}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        onClick={() => handleEdit(s)}
                        style={{ border: '1px solid var(--border)', background: 'var(--bg)', borderRadius: 10, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => toggle(s.id, !s.active)}
                        style={{ 
                          border: 'none', borderRadius: 10, padding: '6px 12px', fontSize: 11, fontWeight: 800, cursor: 'pointer',
                          background: s.active ? 'rgba(34, 197, 94, 0.1)' : 'var(--btn-secondary)',
                          color: s.active ? 'var(--green)' : 'var(--btn-secondary-text)'
                        }}
                      >
                        {s.active ? 'Activo' : 'Pausado'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ 
            background: 'var(--card)', 
            width: '100%', 
            borderTopLeftRadius: 24, 
            borderTopRightRadius: 24, 
            padding: 24, 
            boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
            maxHeight: '90%',
            overflowY: 'auto'
          }}>
            <h3 style={{ marginBottom: 16, fontWeight: 800 }}>{editingId ? 'Editar Servicio / Encargo' : 'Nuevo Servicio / Encargo'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              
              {/* MODALITY SELECTOR */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>MODALIDAD DE ATENCIÓN O ENTREGA</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, modality: 'PRESENCIAL' })}
                    style={{
                      padding: '10px 4px',
                      borderRadius: 10,
                      border: form.modality === 'PRESENCIAL' ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: form.modality === 'PRESENCIAL' ? 'rgba(34, 197, 94, 0.12)' : 'var(--bg)',
                      color: form.modality === 'PRESENCIAL' ? 'var(--green)' : 'var(--muted)',
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span>🏢 Presencial</span>
                    <span style={{ fontSize: 9, opacity: 0.8, fontWeight: 600 }}>En el local</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, modality: 'ONLINE' })}
                    style={{
                      padding: '10px 4px',
                      borderRadius: 10,
                      border: form.modality === 'ONLINE' ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: form.modality === 'ONLINE' ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg)',
                      color: form.modality === 'ONLINE' ? '#3b82f6' : 'var(--muted)',
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span>💻 Online</span>
                    <span style={{ fontSize: 9, opacity: 0.8, fontWeight: 600 }}>Meet / Zoom</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, modality: 'ENCARGO' })}
                    style={{
                      padding: '10px 4px',
                      borderRadius: 10,
                      border: form.modality === 'ENCARGO' ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: form.modality === 'ENCARGO' ? 'rgba(168, 85, 247, 0.12)' : 'var(--bg)',
                      color: form.modality === 'ENCARGO' ? '#a855f7' : 'var(--muted)',
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span>📦 Encargo</span>
                    <span style={{ fontSize: 9, opacity: 0.8, fontWeight: 600 }}>Retiro / Entrega</span>
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                  {form.modality === 'ENCARGO' ? 'NOMBRE DEL PRODUCTO / ENCARGO' : 'NOMBRE DE LA ATENCIÓN / CLASE'}
                </label>
                <input 
                  placeholder={form.modality === 'ENCARGO' ? 'Ej: Timbre Automático Personalizado, Sello de Bolsillo...' : 'Ej: Asesoría de Portafolio Docente, Clase Particular...'} 
                  style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)' }}
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>CATEGORÍA / ÁREA</label>
                <input 
                  placeholder="Ej: Clases, Asesorías, Timbres & Sellos, Papelería..." 
                  style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)' }}
                  value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>INSTRUCCIONES O NOTA PARA EL CLIENTE (OPCIONAL)</label>
                <input 
                  placeholder={
                    form.modality === 'ENCARGO' 
                      ? 'Ej: Al reservar, detalla texto y dibujo deseado. Fabricación demora 24-48 hrs hábiles.'
                      : form.modality === 'ONLINE'
                      ? 'Ej: Se enviará el enlace Meet/Zoom al correo o WhatsApp 15 min antes.'
                      : 'Ej: Traer materiales o documentos requeridos para la sesión.'
                  }
                  style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)', fontSize: 13 }}
                  value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                    {form.modality === 'ENCARGO' ? 'TIEMPO ESTIMADO RETIRO (MIN)' : 'DURACIÓN DE LA CITA (MIN)'}
                  </label>
                  <input 
                    type="number" step="5"
                    style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)' }}
                    value={form.durationMin} onChange={e => setForm({ ...form, durationMin: e.target.value })}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>PRECIO ($)</label>
                  <input 
                    type="number"
                    style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)' }}
                    value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                  />
                </div>
              </div>

              {/* ANTI NO-SHOW DEPOSIT (PREMIUM ONLY) */}
              <div style={{
                background: 'rgba(245, 160, 32, 0.04)',
                border: isPremium ? '1px solid var(--border)' : '1px dashed var(--orange)',
                borderRadius: 14,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                position: 'relative'
              }}>
                {!isPremium && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0, 8, 20, 0.7)',
                    borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: 11, fontWeight: 800, padding: 8, textAlign: 'center', cursor: 'pointer'
                  }} onClick={() => { setShowForm(false); nav('/admin/planes'); }}>
                    👑 Seña Anti No-Show disponible en Plan Premium
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                    ⚡ ¿Habilitar seña para este servicio?
                  </label>
                  {isPremium && (
                    <input 
                      type="checkbox" 
                      checked={form.depositRequired}
                      onChange={e => setForm({ ...form, depositRequired: e.target.checked })}
                      style={{ width: 32, height: 18, cursor: 'pointer' }}
                    />
                  )}
                </div>

                {form.depositRequired && isPremium && (
                  <div style={{ marginTop: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>MONTO DE LA SEÑA ($)</label>
                    <input 
                      type="number"
                      placeholder="Ej: 5000"
                      style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)' }}
                      value={form.depositAmount}
                      onChange={e => setForm({ ...form, depositAmount: e.target.value })}
                    />
                    <span style={{ fontSize: 10, color: 'var(--muted)', display: 'block', marginTop: 4 }}>
                      El cliente deberá transferir este monto al reservar para asegurar su hora.
                    </span>
                  </div>
                )}
              </div>

              {/* COST CONFIGURATION */}
              <div style={{ marginTop: 4, padding: 14, borderRadius: 14, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <h4 style={{ fontWeight: 800, margin: '0 0 4px 0', fontSize: 13 }}>💰 Costos del servicio</h4>
                <p style={{ margin: '0 0 12px 0', fontSize: 11, color: 'var(--muted)' }}>Cuánto te cuesta prestar este servicio</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Insumos ($)</label>
                      <input 
                        type="number"
                        placeholder="Ej: tinte..."
                        style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)' }}
                        value={form.costMaterials}
                        onChange={e => setForm({ ...form, costMaterials: e.target.value === '' ? '' : Number(e.target.value) })}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Equipos ($)</label>
                      <input 
                        type="number"
                        placeholder="Ej: cuchilla..."
                        style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)' }}
                        value={form.costEquipment}
                        onChange={e => setForm({ ...form, costEquipment: e.target.value === '' ? '' : Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  {(() => {
                    const price = Number(form.price) || 0;
                    const cMat = Number(form.costMaterials) || 0;
                    const cEq = Number(form.costEquipment) || 0;
                    const totalCost = cMat + cEq;
                    const margin = price - totalCost;
                    const marginPct = price > 0 ? Math.round((margin / price) * 100) : 0;
                    const color = margin >= 0 ? 'var(--green)' : 'var(--red)';

                    return (
                      <div style={{ marginTop: 4, padding: 10, background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)', fontSize: 12 }}>
                        <div style={{ fontWeight: 700, marginBottom: 2 }}>Costo total: ${totalCost.toLocaleString('es-CL')}</div>
                        <div style={{ fontWeight: 800, color }}>Margen bruto: ${margin.toLocaleString('es-CL')} ({marginPct}%)</div>
                      </div>
                    )
                  })()}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                <button 
                  onClick={handleSave}
                  style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', background: 'var(--accent)', color: 'white', fontWeight: 800, cursor: 'pointer' }}
                >
                  {editingId ? 'Guardar Cambios' : 'Crear Servicio'}
                </button>
                <button 
                  onClick={() => setShowForm(false)}
                  style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: 'var(--btn-secondary)', color: 'var(--btn-secondary-text)', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
