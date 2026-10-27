import { useEffect, useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { apiGet, apiPost, apiPatch, apiDelete } from '../../lib/api'

export default function Professionals() {
  const { shop } = useOutletContext()
  const effectiveType = shop?.businessType || localStorage.getItem('enlace_business_type') || 'salud'
  const isAsesoria = effectiveType === 'asesoria'
  const defaultRole = isAsesoria ? 'Consultor / Asesor' : 'Especialista / Médico'
  const teamPlural = isAsesoria ? 'consultores y profesionales' : 'especialistas y profesionales'
  const nav = useNavigate()
  const [professionals, setProfessionals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', title: defaultRole, active: true, photo: '' })
  const [editingId, setEditingId] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const r = await apiGet('/api/professionals')
      setProfessionals(r.professionals || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!form.name || !form.name.trim()) {
      alert('👤 Por favor, ingresa el nombre del profesional para continuar.')
      return
    }

    try {
      if (editingId) {
        await apiPatch(`/api/professionals/${editingId}`, form)
      } else {
        await apiPost('/api/professionals', form)
      }
      setShowForm(false)
      setForm({ name: '', title: defaultRole, active: true, photo: '' })
      setEditingId(null)
      load()
    } catch (e) { 
      console.error(e)
      alert(e.data?.error || 'Tuvimos un inconveniente al guardar el profesional. Inténtalo nuevamente.') 
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Seguro que deseas desactivar a este profesional? Dejará de aparecer en la agenda de reservas.')) return
    try {
      await apiDelete(`/api/professionals/${id}`)
      load()
    } catch (e) { 
      alert('No pudimos desactivar al profesional. Por favor, intenta de nuevo.') 
    }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 300
        const MAX_HEIGHT = 300
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height
            height = MAX_HEIGHT
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const base64 = canvas.toDataURL('image/jpeg', 0.8)
        setForm({ ...form, photo: base64 })
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  const planId = shop?.planId || 'BASIC'
  const activeCount = professionals.filter(p => p.active).length

  const isLimitReached = !editingId && (
    (planId === 'BASIC' && activeCount >= 1) ||
    (planId === 'PLUS' && activeCount >= 3)
  )

  const limitText = planId === 'BASIC' 
    ? 'El plan Starter solo permite 1 profesional activo.' 
    : 'El plan Pro permite hasta 3 profesionales activos.'

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', height: '100%', paddingBottom: 60 }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Equipo</h2>
        <button 
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', title: defaultRole, active: true, photo: '' }); }}
          style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 12, padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}
        >
          + Añadir
        </button>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Cargando equipo...</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {professionals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, background: 'var(--card)', borderRadius: 16, border: '1px dashed var(--border)', color: 'var(--muted)' }}>
              Aún no has añadido {teamPlural} a tu equipo.
            </div>
          ) : professionals.map(p => (
            <div key={p.id} style={{ background: 'var(--card)', padding: 16, borderRadius: 16, border: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {p.photo ? (
                  <img src={p.photo} alt={p.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>
                    {p.name?.[0]?.toUpperCase() || 'P'}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.title || defaultRole}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button 
                  onClick={() => {
                    setEditingId(p.id);
                    setForm({ name: p.name, title: p.title || defaultRole, active: p.active, photo: p.photo || '' });
                    setShowForm(true);
                  }}
                  style={{ border: '1px solid var(--border)', background: 'var(--bg)', borderRadius: 10, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                >
                  Editar
                </button>
                <button 
                  onClick={() => handleDelete(p.id)}
                  style={{ border: 'none', background: 'rgba(255, 59, 59, 0.1)', color: 'var(--red)', borderRadius: 10, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                >
                  Eliminar
                </button>
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
            overflowY: 'auto',
            position: 'relative'
          }}>
            
            {/* PLAN LIMIT LOCK COVER */}
            {isLimitReached && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0, 8, 20, 0.85)',
                borderTopLeftRadius: 24, borderTopRightRadius: 24, zIndex: 10,
                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                padding: 24, textAlign: 'center', color: 'white'
              }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
                <h4 style={{ fontSize: 16, fontWeight: 800, color: '#fbbf24' }}>Límite de Equipo Alcanzado</h4>
                <p style={{ fontSize: 12, color: '#e2e8f0', marginTop: 4, maxWidth: 300, marginBottom: 20 }}>
                  {limitText} Sube de nivel tu suscripción para añadir más {teamPlural} y expandir tu negocio.
                </p>
                <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 300 }}>
                  <button 
                    onClick={() => { setShowForm(false); nav('/admin/planes') }}
                    style={{ flex: 1, padding: 14, borderRadius: 12, border: 'none', background: 'var(--orange)', color: 'white', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}
                  >
                    🚀 Ver Planes
                  </button>
                  <button 
                    onClick={() => setShowForm(false)}
                    style={{ flex: 1, padding: 14, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <h3 style={{ marginBottom: 16, fontWeight: 800 }}>{editingId ? 'Editar Miembro' : 'Nuevo Miembro'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>FOTO DE PERFIL</label>
                <div 
                  style={{ 
                    width: 90, height: 90, borderRadius: '50%', border: '2px dashed var(--border)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    background: form.photo ? 'transparent' : 'var(--bg)', cursor: 'pointer',
                    position: 'relative', overflow: 'hidden', margin: '0 auto'
                  }}
                  onClick={() => document.getElementById('prof-photo-upload').click()}
                >
                  {form.photo ? (
                    <img src={form.photo} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 10, fontWeight: 700 }}>
                      <div style={{ fontSize: 20, marginBottom: 2 }}>📷</div>
                      Subir Foto
                    </div>
                  )}
                  <input 
                    id="prof-photo-upload" 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    style={{ display: 'none' }} 
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>NOMBRE COMPLETO</label>
                <input 
                  placeholder={isAsesoria ? "Ej: Lic. Claudia Morales o Ing. Roberto Gómez" : "Ej: Dra. Valeria Soto o Lic. Matías Morales"}
                  style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)' }}
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>ESPECIALIDAD / CARGO</label>
                <input 
                  placeholder={isAsesoria ? "Ej: Consultor Tributario, Abogado, Asesor Financiero..." : "Ej: Médico General, Psicólogo Clínico, Kinesiólogo..."}
                  style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)' }}
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                <button 
                  onClick={handleSave}
                  disabled={!form.name}
                  style={{ 
                    width: '100%', padding: 16, borderRadius: 14, border: 'none', 
                    background: !form.name ? 'var(--border)' : 'var(--accent)', 
                    color: 'white', fontWeight: 800, cursor: 'pointer' 
                  }}
                >
                  {editingId ? 'Guardar Cambios' : 'Añadir al Equipo'}
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
