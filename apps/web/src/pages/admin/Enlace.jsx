import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { apiGet, apiPost } from '../../lib/api'

export default function EnlacePage() {
  const { entitlements } = useOutletContext()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [telefono, setTelefono] = useState('')
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('Disponible ahora')
  const [publishForm, setPublishForm] = useState({
    photos: [],
    description: '',
    title: '',
    location: '',
    price: '',
    onlyGallery: false
  })
  const [err, setErr] = useState('')

  const load = () => {
    setLoading(true)
    apiGet('/api/enlace/status')
      .then(r => {
        setStatus(r)
        setMsg(r.msg || 'Disponible ahora')
      })
      .catch(() => setErr('Error al conectar con la API'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleVincular = async () => {
    console.log('[Enlace] Intentando vincular:', { telefono, code })

    if (!telefono.trim()) {
      alert('Por favor, ingresa tu número de WhatsApp.')
      return
    }
    if (code.length !== 6) {
      alert('El código de vinculación debe tener exactamente 6 dígitos.')
      return
    }

    try {
      const resultado = await apiPost('/api/enlace/link', { telefono, code })
      if (resultado.ok) {
        load()
      }
    } catch (e) {
      console.warn('[Enlace] error de vinculación recibido:', e)
      const serverErr = e?.data?.error
      const serverDetalle = e?.data?.detalle
      
      if (serverErr === 'TELEFONO_NO_ENCONTRADO') {
        alert(`❌ Teléfono no registrado:\n\n"${serverDetalle || 'No se encontró perfil con ese número'}"\n\nRecomendaciones:\n1. Asegúrate de haberte registrado previamente en la Red Social Enlace con este número.\n2. Verifica el formato de país (ej: +56912345678).`);
      } else if (serverErr === 'codigo_invalido' || serverErr === 'CODIGO_INVALIDO') {
        alert('❌ Código incorrecto:\n\nEl código de 6 dígitos ingresado no coincide con el generado en tu aplicación móvil Enlace.');
      } else if (serverErr === 'codigo_expirado' || serverErr === 'CODIGO_EXPIRADO') {
        alert('❌ Código vencido:\n\nEl código de vinculación ha expirado (los códigos duran un máximo de 10 minutos). Genera uno nuevo desde la red social e intenta nuevamente.');
      } else {
        alert(`❌ Error al vincular:\n\n${serverDetalle || serverErr || 'No se pudo vincular. Revisa los datos o inténtalo más tarde.'}`);
      }
    }
  }

  const handleUnlink = async () => {
    if (!confirm('¿Desvincular de la red Enlace?')) return
    try {
      await apiPost('/api/enlace/unlink', {})
      load()
    } catch (e) { alert(e.message) }
  }

  const handleSync = async () => {
    try {
      await apiPost('/api/enlace/sync-catalog', {})
      alert('Sincronización de catálogo encolada exitosamente.')
      load()
    } catch (e) { alert(e.message) }
  }

  const handleToggleDisponible = async () => {
    const nextVal = !status?.disponible
    try {
      await apiPost('/api/enlace/toggle', { disponible: nextVal, msg })
      load()
    } catch (e) { alert(e.message) }
  }

  const handleMsgChange = async (newMsg) => {
    setMsg(newMsg)
    if (status?.connected) {
      try {
        await apiPost('/api/enlace/toggle', { disponible: status.disponible, msg: newMsg })
        load()
      } catch (e) { console.error(e) }
    }
  }

  const handlePublishPhoto = async () => {
    if (publishForm.photos.length === 0) {
      alert('Debes seleccionar al menos una foto de tu trabajo.')
      return
    }
    try {
      await apiPost('/api/enlace/publish-photo', { 
        photos: publishForm.photos, 
        description: publishForm.description,
        title: publishForm.title || null,
        location: publishForm.location || null,
        price: publishForm.price ? Number(publishForm.price) : null,
        onlyGallery: publishForm.onlyGallery
      })
      alert('¡Excelente! Tu publicación ha sido encolada para subirse a la Red Enlace.')
      setPublishForm({
        photos: [],
        description: '',
        title: '',
        location: '',
        price: '',
        onlyGallery: false
      })
      load()
    } catch (e) { alert(e.message) }
  }

  const handleMultipleFilesChange = (e) => {
    const files = Array.from(e.target.files)
    if (publishForm.photos.length + files.length > 5) {
      alert('Puedes subir un máximo de 5 imágenes.')
      return
    }

    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX_WIDTH = 600
          const MAX_HEIGHT = 600
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
          const base64 = canvas.toDataURL('image/jpeg', 0.75)
          
          setPublishForm(p => {
            if (p.photos.length >= 5) return p
            return {
              ...p,
              photos: [...p.photos, base64]
            }
          })
        }
        img.src = event.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      
      <div style={{ background: 'var(--card)', padding: 20, borderRadius: 16, border: '0.5px solid var(--border)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Conexión Enlace</h2>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Gestiona la visibilidad de tu local en la red social.</p>
        
        {loading ? <div style={{ padding: 20, textAlign: 'center' }}>Cargando...</div> : (
          <div style={{ marginTop: 20 }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
              <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>ESTADO</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: status?.connected ? 'var(--green)' : 'var(--red)' }}>
                  {status?.connected ? 'CONECTADO' : 'DESCONECTADO'}
                </div>
              </div>
              <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>DISPONIBILIDAD</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: status?.disponible ? 'var(--green)' : 'var(--muted)' }}>
                  {status?.disponible ? 'ON' : 'OFF'}
                </div>
              </div>
              <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>COLA OUTBOX</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: status?.queue > 0 ? 'var(--orange)' : 'var(--muted)' }}>{status?.queue || 0} pend.</div>
              </div>
            </div>

            {!status?.connected ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                    Tu número de WhatsApp registrado en Enlace
                  </label>
                  <input 
                    type="tel"
                    placeholder="Ej: +56912345678" 
                    style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)', fontSize: 14 }}
                    value={telefono} 
                    onChange={e => setTelefono(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                    Código de vinculación de 6 dígitos
                  </label>
                  <input 
                    placeholder="Ej: 123456" 
                    maxLength={6}
                    style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)', fontSize: 14, fontFamily: 'monospace', letterSpacing: '2px' }}
                    value={code} 
                    onChange={e => setCode(e.target.value)}
                  />
                </div>

                <button 
                  onClick={handleVincular}
                  style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', background: 'var(--accent)', color: 'white', fontWeight: 800, cursor: 'pointer', marginTop: 6 }}
                >
                  Vincular ahora
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                
                {/* Toggle Disponibilidad */}
                <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>Visibilidad en el Mapa</div>
                    <button 
                      onClick={handleToggleDisponible}
                      style={{ 
                        padding: '8px 16px', borderRadius: 20, border: 'none', fontWeight: 800, cursor: 'pointer',
                        background: status.disponible ? 'var(--green)' : 'var(--muted)', color: 'white'
                      }}
                    >
                      {status.disponible ? 'APAGAR' : 'ENCENDER'}
                    </button>
                  </div>
                  <select 
                    style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)', fontSize: 14 }}
                    value={msg}
                    onChange={e => handleMsgChange(e.target.value)}
                  >
                    <option value="Disponible ahora">Disponible ahora</option>
                    <option value="Disponible hoy">Disponible hoy</option>
                    <option value="Acepto urgencias">Acepto urgencias</option>
                    <option value="Con agenda disponible">Con agenda disponible</option>
                  </select>
                </div>

                {/* Nueva Publicación (Estilo Red Social) */}
                <div style={{ 
                  background: 'var(--bg)', 
                  padding: 20, 
                  borderRadius: 14, 
                  border: '1px solid var(--border)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 16 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      ✨ Nueva Publicación
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, background: 'rgba(37, 99, 235, 0.08)', color: 'var(--accent)', padding: '4px 10px', borderRadius: 20 }}>
                      Negocio Vinculado
                    </span>
                  </div>

                  {/* IMÁGENES */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Imágenes ({publishForm.photos.length}/5)
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      {publishForm.photos.map((ph, idx) => (
                        <div key={idx} style={{ position: 'relative', width: 74, height: 74, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                          <img src={ph} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button 
                            type="button"
                            onClick={() => setPublishForm(p => ({ ...p, photos: p.photos.filter((_, i) => i !== idx) }))}
                            style={{ position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {publishForm.photos.length < 5 && (
                        <label style={{ width: 74, height: 74, borderRadius: 10, border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--card)', color: 'var(--muted)', fontSize: 11, gap: 2, transition: 'all 0.2s' }}>
                          <span style={{ fontSize: 18, fontWeight: 300 }}>+</span>
                          <span style={{ fontSize: 9, fontWeight: 700 }}>Añadir</span>
                          <input type="file" accept="image/*" multiple onChange={handleMultipleFilesChange} style={{ display: 'none' }} />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* TÍTULO */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Título de la Publicación
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ej: Impresionante cambio de look! Corte degradado..." 
                      style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: '13.5px', outline: 'none' }}
                      value={publishForm.title}
                      onChange={e => setPublishForm({ ...publishForm, title: e.target.value })}
                    />
                  </div>

                  {/* DESCRIPCIÓN */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Descripción
                    </label>
                    <textarea 
                      placeholder="Escribe la descripción de tu publicación aquí (detalles, técnicas, etc.)..." 
                      maxLength={500}
                      rows={3}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: '13.5px', resize: 'none', outline: 'none' }}
                      value={publishForm.description}
                      onChange={e => setPublishForm({ ...publishForm, description: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {/* UBICACIÓN */}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Ubicación
                      </label>
                      <input 
                        type="text" 
                        placeholder="Ej: La Serena, Chile" 
                        style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: '13.5px', outline: 'none' }}
                        value={publishForm.location}
                        onChange={e => setPublishForm({ ...publishForm, location: e.target.value })}
                      />
                    </div>

                    {/* PRECIO */}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Precio (Opcional)
                      </label>
                      <input 
                        type="number" 
                        placeholder="Ej: 15000" 
                        style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: '13.5px', outline: 'none' }}
                        value={publishForm.price}
                        onChange={e => setPublishForm({ ...publishForm, price: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* SOLO EN MI GALERÍA TOGGLE */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    background: 'var(--card)', 
                    padding: '12px 14px', 
                    borderRadius: 12, 
                    border: '1px solid var(--border)' 
                  }}>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700 }}>Solo en mi galería</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>No se enviará al muro principal de Enlace.</div>
                    </div>
                    <div 
                      onClick={() => setPublishForm(p => ({ ...p, onlyGallery: !p.onlyGallery }))}
                      style={{
                        width: 44,
                        height: 22,
                        borderRadius: 11,
                        background: publishForm.onlyGallery ? 'var(--green)' : 'var(--border)',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                      }}
                    >
                      <div style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: 'white',
                        position: 'absolute',
                        top: 3,
                        left: publishForm.onlyGallery ? 25 : 3,
                        transition: 'all 0.3s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                      }} />
                    </div>
                  </div>

                  <button 
                    onClick={handlePublishPhoto}
                    style={{ 
                      padding: 14, 
                      borderRadius: 10, 
                      border: 'none', 
                      background: 'var(--accent)', 
                      color: 'white', 
                      fontWeight: 800, 
                      fontSize: 14,
                      cursor: 'pointer',
                      marginTop: 4,
                      transition: 'background 0.2s'
                    }}
                  >
                    Publicar en la Red Social
                  </button>
                </div>

                {/* Sincronizar Catálogo */}
                <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Catálogo de Servicios</div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 12px 0' }}>Sincroniza tus servicios y precios con tu perfil en la app móvil.</p>
                  <button 
                    onClick={handleSync}
                    style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--accent)', background: 'var(--card)', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Actualizar mi perfil Enlace
                  </button>
                </div>

                {/* Info / Desvincular */}
                <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 10, fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span><strong>ID Perfil:</strong> {status.enlaceProfileId}</span>
                  <button 
                    onClick={handleUnlink}
                    style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#fee2e2', color: '#ef4444', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Desvincular
                  </button>
                </div>

              </div>
            )}

          </div>
        )}
      </div>

      <div style={{ padding: 10, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
        Sincronización automática cada 30 segundos.
      </div>

    </div>
  )
}
