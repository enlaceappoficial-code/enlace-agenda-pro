import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { apiDelete, apiGet, apiPost } from '../../lib/api'

export default function Gallery() {
  const { entitlements } = useOutletContext()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ category: 'Cortes', description: '', photosText: '' })

  const load = () => {
    setLoading(true)
    apiGet('/api/gallery')
      .then(r => setItems(r.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    const photos = form.photosText.split(/[\n,]/g).map(x => x.trim()).filter(Boolean)
    if (!photos.length) return alert('Sube al menos una foto')
    try {
      await apiPost('/api/gallery', { ...form, photos })
      setForm({ category: 'Cortes', description: '', photosText: '' })
      setShowForm(false)
      load()
    } catch (e) { alert(e.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta publicación?')) return
    try {
      await apiDelete(`/api/gallery/${id}`)
      load()
    } catch (e) { alert(e.message) }
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Galería</h2>
        <button 
          onClick={() => setShowForm(true)}
          style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 12, padding: '10px 16px', fontWeight: 700 }}
        >
          + Publicar
        </button>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 40 }}>Cargando...</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {items.map(it => (
            <div key={it.id} style={{ background: 'var(--card)', borderRadius: 16, border: '0.5px solid var(--border)', overflow: 'hidden', position: 'relative' }}>
              <img 
                src={it.photos[0]} 
                alt="" 
                style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover' }} 
              />
              <div style={{ padding: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{it.description}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{it.category}</div>
              </div>
              <button 
                onClick={() => handleDelete(it.id)}
                style={{ position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', fontSize: 14 }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100 }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--card)', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
            <h3 style={{ marginBottom: 16, fontWeight: 800 }}>Publicar Trabajo</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input 
                placeholder="Categoría" 
                style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border)' }}
                value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              />
              <input 
                placeholder="Descripción (ej: Degradado con barba)" 
                style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border)' }}
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              />
              <textarea 
                placeholder="URLs de fotos (separadas por coma o línea)" 
                style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border)', minHeight: 80 }}
                value={form.photosText} onChange={e => setForm({ ...form, photosText: e.target.value })}
              />
              <button 
                onClick={handleSave}
                style={{ padding: 16, borderRadius: 14, border: 'none', background: 'var(--accent)', color: 'white', fontWeight: 800, marginTop: 10 }}
              >
                Publicar en Galería
              </button>
              <button 
                onClick={() => setShowForm(false)}
                style={{ padding: 14, borderRadius: 14, border: 'none', background: 'var(--btn-secondary)', color: 'var(--btn-secondary-text)', fontWeight: 700 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
