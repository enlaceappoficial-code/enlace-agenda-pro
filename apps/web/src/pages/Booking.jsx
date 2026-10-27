import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiGet, apiPost } from '../lib/api'

export default function Booking() {
  const { slug } = useParams()
  const nav = useNavigate()
  const [shop, setShop] = useState(null)
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)

  const [step, setStep] = useState(1) // 1: Servicio, 2: Fecha, 3: Hora, 4: Datos, 5: Pago (Si aplica)
  const [activeCategory, setActiveCategory] = useState('Todas')
  const [selService, setSelService] = useState(null)
  const [selDate, setSelDate] = useState(null)
  const [selTime, setSelTime] = useState(null)
  const [availableSlots, setAvailableSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  })
  const [receiptBase64, setReceiptBase64] = useState('')
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [copiedField, setCopiedField] = useState(null)
  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 1500)
  }

  useEffect(() => {
    Promise.all([
      apiGet(`/public/shops/${slug}`),
      apiGet(`/public/shops/${slug}/services`)
    ]).then(([s, servs]) => {
      setShop(s.shop)
      setServices(servs.services)
    })
    .catch(() => {})
    .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    if (step === 3 && selDate && selService) {
      setLoadingSlots(true)
      apiGet(`/public/shops/${slug}/availability?date=${selDate.iso}&serviceId=${selService.id}`)
        .then(r => setAvailableSlots(r.slots))
        .catch(() => {})
        .finally(() => setLoadingSlots(false))
    }
  }, [step, selDate, selService, slug])

  const nextStep = () => setStep(step + 1)
  const prevStep = () => setStep(step - 1)

  const handleConfirm = async () => {
    try {
      const res = await apiPost(`/public/shops/${slug}/appointments`, {
        serviceId: selService.id,
        date: selDate.iso,
        time: selTime,
        name: form.name,
        phone: form.phone,
        email: form.email,
        notes: form.notes,
        depositReceiptUrl: receiptBase64 || null
      })
      nav(`/b/${slug}/confirm/${res.appointmentId}`)
    } catch (e) {
      if (e.data?.error === 'SLOT_TAKEN') {
        alert('📅 ¡Atención! Al parecer este horario acaba de ser reservado por otra persona. Por favor, selecciona un horario diferente para tu atención.')
      } else {
        alert('Ocurrió un inconveniente al procesar tu reserva. Por favor, intenta nuevamente.')
      }
    }
  }

  const handleReceiptUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadingReceipt(true)
    const reader = new FileReader()
    reader.onload = (ev) => {
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
        setReceiptBase64(base64)
        setUploadingReceipt(false)
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Cargando...</div>
  if (!shop) return <div style={{ padding: 40, textAlign: 'center' }}>Negocio no encontrado</div>

  // Dates generator (Next 28 days, filtering activeDays)
  const availableDates = []
  const today = new Date()
  const activeDays = Array.isArray(shop.activeDays) ? shop.activeDays : []
  for (let i = 0; i < 28; i++) {
    const d = new Date()
    d.setDate(today.getDate() + i)
    if (activeDays.includes(d.getDay())) {
      availableDates.push({
        iso: d.toISOString().split('T')[0],
        day: d.getDate(),
        month: d.toLocaleDateString('es-ES', { month: 'short' }),
        weekday: d.toLocaleDateString('es-ES', { weekday: 'short' })
      })
    }
    if (availableDates.length >= 16) break
  }

  const headerStyle = {
    background: 'linear-gradient(135deg, #2563eb, #1a4fd8)',
    padding: '20px 16px', color: 'white', textAlign: 'center'
  }

  // Experience Gating Logic based on Barber settings
  const isMandatoryDeposit = shop.depositEnabled && selService?.depositRequired
  const isSuggestedPrepayment = shop.prepaymentEnabled && !isMandatoryDeposit
  const hasStep5 = isMandatoryDeposit || isSuggestedPrepayment

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      
      {/* HEADER */}
      <div style={headerStyle}>
        {shop.logoUrl ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', background: 'white', marginBottom: 10, border: '2px solid rgba(255,255,255,0.2)' }}>
              <img src={shop.logoUrl} alt={shop.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>{shop.name}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: 12, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6, border: '1.5px solid rgba(255,255,255,0.2)' }}>
               <img src="/logo-icon_1.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <span style={{ fontSize: 20, fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>ENLACE</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: -4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
                {shop.businessType === 'asesoria' ? 'ASESORÍA' : 'AGENDA'}
              </span>
              <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent)' }}>PRO</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8, opacity: 0.9 }}>{shop.name}</div>
          </div>
        )}
      </div>

      {/* PROGRESS BAR */}
      <div style={{ background: 'rgba(37, 99, 235, 0.1)', height: 4, display: 'flex' }}>
        <div style={{ background: 'var(--accent)', width: `${(step / (hasStep5 ? 5 : 4)) * 100}%`, transition: 'width 0.3s' }} />
      </div>

      <div style={{ flex: 1, padding: 16 }}>

        {/* STEP 1: SERVICIOS */}
        {step === 1 && (() => {
          const categories = ['Todas', ...Array.from(new Set(services.map(s => s.category).filter(Boolean)))]
          const filteredServices = activeCategory === 'Todas' ? services : services.filter(s => s.category === activeCategory)

          return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>1. Elige una atención o servicio</h2>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>{filteredServices.length} opciones</span>
              </div>

              {/* CATEGORY FILTER PILLS */}
              {categories.length > 2 && (
                <div style={{ 
                  display: 'flex', 
                  gap: 8, 
                  overflowX: 'auto', 
                  paddingBottom: 10, 
                  marginBottom: 14, 
                  scrollbarWidth: 'none',
                  WebkitOverflowScrolling: 'touch'
                }}>
                  {categories.map(cat => {
                    const isSelected = activeCategory === cat
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveCategory(cat)}
                        style={{
                          whiteSpace: 'nowrap',
                          padding: '8px 16px',
                          borderRadius: 20,
                          border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                          background: isSelected ? 'var(--accent)' : 'var(--card)',
                          color: isSelected ? 'white' : 'var(--text)',
                          fontWeight: isSelected ? 800 : 600,
                          fontSize: 12,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          flexShrink: 0
                        }}
                      >
                        {cat}
                      </button>
                    )
                  })}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredServices.map(s => (
                  <div 
                    key={s.id} 
                    onClick={() => { setSelService(s); nextStep() }}
                    style={{ background: 'var(--card)', padding: 16, borderRadius: 14, border: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <div style={{ flex: 1, paddingRight: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: 15 }}>{s.name}</span>
                        <span style={{
                          background: s.modality === 'ONLINE' ? 'rgba(59, 130, 246, 0.12)' : s.modality === 'ENCARGO' ? 'rgba(168, 85, 247, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                          color: s.modality === 'ONLINE' ? '#3b82f6' : s.modality === 'ENCARGO' ? '#a855f7' : '#22c55e',
                          padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800
                        }}>
                          {s.modality === 'ONLINE' ? '💻 Online' : s.modality === 'ENCARGO' ? '📦 Encargo' : '🏢 Presencial'}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                        {s.description || (s.modality === 'ENCARGO' ? 'Producto personalizado por encargo' : `${s.durationMin} min`)}
                      </div>

                      {s.instructions && (
                        <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>ℹ️</span> <span>{s.instructions}</span>
                        </div>
                      )}

                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span>{s.modality === 'ENCARGO' ? `📦 Retiro: ~${s.durationMin} min` : `⏱️ ${s.durationMin} min`}</span>
                        {shop.depositEnabled && s.depositRequired && (
                          <span style={{ background: 'rgba(245, 160, 32, 0.1)', color: 'var(--orange)', padding: '2px 6px', borderRadius: 6, fontSize: 10, fontWeight: 800 }}>
                            ⚡ Requiere Seña (${s.depositAmount?.toLocaleString('es-CL') || '50%'})
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 17, whiteSpace: 'nowrap' }}>${s.price.toLocaleString('es-CL')}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* STEP 2: FECHA */}
        {step === 2 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <button onClick={prevStep} style={{ border: 'none', background: 'transparent', fontSize: 22, cursor: 'pointer', color: 'var(--text)', padding: 0 }}>←</button>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
                {selService?.modality === 'ENCARGO' ? '2. Día de retiro o entrega' : '2. Selecciona el día'}
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {availableDates.map(d => {
                const isSelected = selDate?.iso === d.iso
                return (
                  <button 
                    key={d.iso}
                    type="button"
                    onClick={() => { setSelDate(d); nextStep() }}
                    style={{
                      background: isSelected ? 'var(--accent)' : 'var(--card)',
                      color: isSelected ? '#ffffff' : 'var(--text)',
                      border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                      borderRadius: 14, padding: '14px 6px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer',
                      boxShadow: isSelected ? '0 4px 14px rgba(245, 160, 32, 0.4)' : '0 2px 6px rgba(0,0,0,0.2)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: isSelected ? '#ffffff' : 'var(--muted)' }}>
                      {d.weekday}
                    </span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: isSelected ? '#ffffff' : 'var(--text)', lineHeight: 1.2 }}>
                      {d.day}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'capitalize', color: isSelected ? '#ffffff' : 'var(--muted)' }}>
                      {d.month}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* STEP 3: HORA */}
        {step === 3 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <button onClick={prevStep} style={{ border: 'none', background: 'transparent', fontSize: 22, cursor: 'pointer', color: 'var(--text)', padding: 0 }}>←</button>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
                {selService?.modality === 'ENCARGO' ? '3. Hora estimada de retiro' : '3. Elige la hora'}
              </h2>
            </div>
            {loadingSlots ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Cargando horas...</div>
            ) : availableSlots.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>No hay horas disponibles para este día</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {availableSlots.map(t => {
                  const isSelected = selTime === t
                  return (
                    <button 
                      key={t}
                      type="button"
                      onClick={() => { setSelTime(t); nextStep() }}
                      style={{
                        background: isSelected ? 'var(--accent)' : 'var(--card)',
                        color: isSelected ? '#ffffff' : 'var(--text)',
                        border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                        borderRadius: 14, padding: '16px 8px',
                        fontWeight: 800, fontSize: 15, cursor: 'pointer',
                        boxShadow: isSelected ? '0 4px 14px rgba(245, 160, 32, 0.4)' : '0 2px 6px rgba(0,0,0,0.2)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 4: DATOS */}
        {step === 4 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <button onClick={prevStep} style={{ border: 'none', background: 'transparent', fontSize: 22, cursor: 'pointer', color: 'var(--text)', padding: 0 }}>←</button>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>4. Tus datos</h2>
            </div>

            <div style={{ background: 'var(--card)', borderRadius: 14, border: '0.5px solid var(--border)', padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>RESUMEN</span>
                <span style={{
                  background: selService?.modality === 'ONLINE' ? 'rgba(59, 130, 246, 0.12)' : selService?.modality === 'ENCARGO' ? 'rgba(168, 85, 247, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                  color: selService?.modality === 'ONLINE' ? '#3b82f6' : selService?.modality === 'ENCARGO' ? '#a855f7' : '#22c55e',
                  padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800
                }}>
                  {selService?.modality === 'ONLINE' ? '💻 Online / Remoto' : selService?.modality === 'ENCARGO' ? '📦 Encargo personalizado' : '🏢 Presencial'}
                </span>
              </div>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>{selService.name}</div>
              <div style={{ fontSize: 14, color: 'var(--text)', marginTop: 4 }}>
                {selService?.modality === 'ENCARGO' ? '📦 Fecha de retiro: ' : '📅 '}
                {new Date(selDate.iso + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)', marginTop: 4 }}>
                {selService?.modality === 'ENCARGO' ? `Hora estimada: ${selTime} hrs` : `${selTime} hrs`}
              </div>

              {selService?.instructions && (
                <div style={{ background: 'rgba(37, 99, 235, 0.06)', border: '1px solid rgba(37, 99, 235, 0.2)', padding: 10, borderRadius: 10, marginTop: 10, fontSize: 12, color: 'var(--text)' }}>
                  <strong style={{ color: 'var(--accent)' }}>📌 Indicaciones: </strong>
                  <span>{selService.instructions}</span>
                </div>
              )}
              
              {isMandatoryDeposit && (
                <div style={{ background: 'rgba(245, 160, 32, 0.08)', border: '1px solid var(--orange)', color: 'var(--orange)', padding: 8, borderRadius: 8, fontSize: 11, fontWeight: 800, marginTop: 10, textAlign: 'center' }}>
                  ⚡ Requiere Seña de ${selService.depositAmount.toLocaleString('es-CL')} para {selService.modality === 'ENCARGO' ? 'iniciar fabricación' : 'agendar'}
                </div>
              )}
              {isSuggestedPrepayment && (
                <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid var(--accent)', color: 'var(--accent)', padding: 8, borderRadius: 8, fontSize: 11, fontWeight: 800, marginTop: 10, textAlign: 'center' }}>
                  💎 Sugerencia: Puedes pagar tu servicio por adelantado opcionalmente
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input 
                placeholder="Nombre completo *" 
                style={{ padding: 16, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: 15 }}
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
              <input 
                placeholder="WhatsApp (ej: 56912345678) *" 
                style={{ padding: 16, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: 15 }}
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
              <input 
                placeholder="Correo electrónico (opcional)" 
                style={{ padding: 16, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: 15 }}
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />

              {selService?.modality === 'ENCARGO' ? (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', display: 'block', marginBottom: 4 }}>
                    ✍️ ESPECIFICACIONES DE TU PEDIDO / TIMBRE *
                  </label>
                  <textarea 
                    placeholder="Escribe el texto exacto del timbre (Nombre, Rut, Cargo), color de tinta (negro/azul/rojo), dibujo o detalles específicos..." 
                    style={{ width: '100%', padding: 14, borderRadius: 12, border: '2px solid var(--accent)', background: 'var(--card)', color: 'var(--text)', fontSize: 14, minHeight: 90, boxSizing: 'border-box' }}
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                  />
                  <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginTop: 4 }}>
                    💡 Con estos datos prepararemos tu diseño o fabricación antes de tu entrega.
                  </span>
                </div>
              ) : (
                <textarea 
                  placeholder="Notas o comentarios adicionales (opcional)" 
                  style={{ padding: 16, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: 15, minHeight: 80 }}
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                />
              )}

              {/* OPTION C: MOSTRAR DATOS POST-PAGO RAPIDO */}
              {shop.fastPaymentEnabled && (
                <div style={{ 
                  background: 'rgba(16, 185, 129, 0.05)', 
                  border: '1px dashed var(--green)', 
                  padding: 14, 
                  borderRadius: 14, 
                  fontSize: 12, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 6,
                  marginTop: 4,
                  marginBottom: 4
                }}>
                  <div style={{ fontWeight: 800, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    📱 Pago Rápido Post-Servicio Sugerido
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0, lineHeight: 1.4 }}>
                    Para que tu experiencia en tu atención sea súper rápida, te sugerimos guardar nuestra cuenta para transferencias en tu app del banco:
                  </p>
                  <div style={{ background: 'var(--card)', padding: 12, borderRadius: 12, fontSize: 11, fontWeight: 700, display: 'flex', flexDirection: 'column', gap: 6, border: '0.5px solid var(--border)' }}>
                    <div>🏦 Banco: <strong>{shop.barberBankName}</strong></div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>💳 Cuenta: <strong>{shop.barberBankAccountType} N° {shop.barberBankAccountNumber}</strong></span>
                      <button 
                        onClick={() => handleCopy(shop.barberBankAccountNumber, 'account-fast')}
                        style={{ border: 'none', background: 'var(--accent)', color: 'white', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, cursor: 'pointer' }}
                      >
                        {copiedField === 'account-fast' ? '✓' : '📋'}
                      </button>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>🆔 RUT: <strong>{shop.barberBankRut}</strong></span>
                      <button 
                        onClick={() => handleCopy(shop.barberBankRut, 'rut-fast')}
                        style={{ border: 'none', background: 'var(--accent)', color: 'white', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, cursor: 'pointer' }}
                      >
                        {copiedField === 'rut-fast' ? '✓' : '📋'}
                      </button>
                    </div>
                    
                    <div>👤 Nombre: <strong>{shop.barberBankOwnerName}</strong></div>
                  </div>
                </div>
              )}

              <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border)', padding: 12, borderRadius: 10, fontSize: 12, color: 'var(--text)', lineHeight: 1.4 }}>
                <strong style={{ color: 'var(--accent)' }}>Política:</strong> {shop.cancellationPolicy}
              </div>

              <button 
                onClick={() => {
                  if (!form.name.trim()) {
                    alert('👤 ¡Opa! Olvidaste ingresar tu nombre completo para registrar tu cita.')
                    return
                  }
                  if (!form.phone.trim()) {
                    alert('📱 Por favor, ingresa tu número de WhatsApp para enviarte la confirmación.')
                    return
                  }
                  if (selService?.modality === 'ENCARGO' && !form.notes.trim()) {
                    alert('✍️ Por favor, ingresa las especificaciones de tu encargo (ej: texto del timbre, color de tinta o modelo) en el campo de especificaciones.')
                    return
                  }
                  if (hasStep5) {
                    nextStep()
                  } else {
                    handleConfirm()
                  }
                }}
                style={{ 
                  marginTop: 10, padding: 18, borderRadius: 14, border: 'none', 
                  background: 'var(--accent)', 
                  color: 'white', fontWeight: 800, fontSize: 16, cursor: 'pointer'
                }}
              >
                {hasStep5 ? 'Siguiente ➔' : (selService?.modality === 'ENCARGO' ? 'Confirmar Pedido de Encargo' : 'Confirmar Reserva')}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: DEPOSITO (SEÑA OBLIGATORIA O PAGO ANTICIPADO SUGERIDO) */}
        {step === 5 && hasStep5 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <button onClick={prevStep} style={{ border: 'none', background: 'transparent', fontSize: 22, cursor: 'pointer', color: 'var(--text)', padding: 0 }}>←</button>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
                {isMandatoryDeposit ? '⚡ 5. Depositar Seña' : '💎 5. Pago Anticipado'}
              </h2>
            </div>

            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              {isMandatoryDeposit 
                ? 'Transfiere el monto de la seña obligatoria para asegurar tu hora. Tu reserva quedará pre-confirmada al adjuntar la captura.'
                : 'Si deseas ahorrar tiempo en tu cita, puedes realizar transferencia por adelantado y adjuntar tu comprobante ahora.'}
            </p>

            <div style={{ background: 'var(--card)', borderRadius: 16, border: '1.5px solid var(--orange)', padding: 16, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              
              {isMandatoryDeposit ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.5px' }}>1. SEÑA MÍNIMA REQUERIDA</span>
                      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--orange)', marginTop: 2 }}>${selService.depositAmount.toLocaleString('es-CL')}</div>
                    </div>
                    <span style={{ fontSize: 28 }}>🛡️</span>
                  </div>
                  <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.5px' }}>2. VALOR TOTAL DEL SERVICIO (OPCIONAL)</span>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)', marginTop: 2 }}>${selService.price.toLocaleString('es-CL')}</div>
                    </div>
                    <span style={{ fontSize: 20 }}>💎</span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.5px' }}>VALOR TOTAL DEL SERVICIO</span>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)', marginTop: 2 }}>${selService.price.toLocaleString('es-CL')}</div>
                  </div>
                  <span style={{ fontSize: 28 }}>💎</span>
                </div>
              )}

              <p style={{ background: 'rgba(37, 99, 235, 0.05)', padding: 10, borderRadius: 10, fontSize: 11, color: 'var(--text)', lineHeight: 1.4, margin: 0, border: '0.5px solid rgba(37, 99, 235, 0.15)' }}>
                {isMandatoryDeposit ? (
                  <span>💡 <strong>¿Eres cliente habitual?</strong> Puedes transferir la seña mínima o el valor completo de <strong>${selService.price.toLocaleString('es-CL')}</strong> para ahorrar tiempo.</span>
                ) : (
                  <span>💡 <strong>Pago opcional:</strong> Puedes transferir por adelantado ahora o pagar presencialmente al terminar tu servicio. Adjunta tu comprobante solo si decides transferir ahora.</span>
                )}
              </p>
            </div>

            {/* BARBER BANK ACCOUNT DETAILS */}
            <div style={{ background: 'var(--card)', borderRadius: 16, border: '0.5px solid var(--border)', padding: 16, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 4 }}>DATOS DE TRANSFERENCIA</div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>Banco:</span>
                <span style={{ fontWeight: 700 }}>{shop.barberBankName}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>Tipo Cuenta:</span>
                <span style={{ fontWeight: 700 }}>{shop.barberBankAccountType}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, background: 'rgba(37, 99, 235, 0.03)', padding: '6px 10px', borderRadius: 10, border: '0.5px solid rgba(37, 99, 235, 0.1)' }}>
                <span style={{ color: 'var(--muted)' }}>N° Cuenta:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{shop.barberBankAccountNumber}</span>
                  <button 
                    onClick={() => handleCopy(shop.barberBankAccountNumber, 'account')}
                    style={{ border: 'none', background: 'var(--accent)', color: 'white', fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    {copiedField === 'account' ? '¡Copiado! ✓' : '📋 Copiar'}
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, background: 'rgba(37, 99, 235, 0.03)', padding: '6px 10px', borderRadius: 10, border: '0.5px solid rgba(37, 99, 235, 0.1)' }}>
                <span style={{ color: 'var(--muted)' }}>RUT:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>{shop.barberBankRut}</span>
                  <button 
                    onClick={() => handleCopy(shop.barberBankRut, 'rut')}
                    style={{ border: 'none', background: 'var(--accent)', color: 'white', fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    {copiedField === 'rut' ? '¡Copiado! ✓' : '📋 Copiar'}
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>Nombre:</span>
                <span style={{ fontWeight: 700 }}>{shop.barberBankOwnerName}</span>
              </div>
              
              {shop.barberBankEmail && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, background: 'rgba(37, 99, 235, 0.03)', padding: '6px 10px', borderRadius: 10, border: '0.5px solid rgba(37, 99, 235, 0.1)' }}>
                  <span style={{ color: 'var(--muted)' }}>Email:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700 }}>{shop.barberBankEmail}</span>
                    <button 
                      onClick={() => handleCopy(shop.barberBankEmail, 'email')}
                      style={{ border: 'none', background: 'var(--accent)', color: 'white', fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      {copiedField === 'email' ? '¡Copiado! ✓' : '📋 Copiar'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* SCREENSHOT FILE UPLOADER */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>COMPROBANTE DE TRANSFERENCIA</label>
              <div 
                style={{ 
                  borderRadius: 14, border: '2px dashed var(--border)', background: 'var(--card)', padding: 20, textAlign: 'center', cursor: 'pointer',
                  position: 'relative', overflow: 'hidden', minHeight: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                }}
                onClick={() => document.getElementById('receipt-upload').click()}
              >
                {receiptBase64 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 24 }}>📄</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--green)' }}>¡Comprobante adjuntado!</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>Toca para cambiar la imagen</div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 28, marginBottom: 4 }}>📷</div>
                    <div style={{ fontSize: 12, fontWeight: 800 }}>Subir captura de comprobante</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>Formatos: JPG, PNG, screenshot</div>
                  </div>
                )}
                <input 
                  id="receipt-upload" 
                  type="file" 
                  accept="image/*" 
                  onChange={handleReceiptUpload} 
                  style={{ display: 'none' }} 
                />
              </div>
            </div>

            <button 
              onClick={() => {
                if (uploadingReceipt) return
                if (isMandatoryDeposit && !receiptBase64) {
                  alert('📷 ¡Falta un detalle! Por favor, adjunta la captura de tu comprobante de transferencia para verificar tu seña obligatoria. ⚡')
                  return
                }
                handleConfirm()
              }}
              style={{ 
                width: '100%', padding: 18, borderRadius: 14, border: 'none', 
                background: 'var(--accent)', 
                color: 'white', fontWeight: 800, fontSize: 16, cursor: 'pointer'
              }}
            >
              {uploadingReceipt ? 'Procesando captura...' : (isMandatoryDeposit ? (selService?.modality === 'ENCARGO' ? 'Finalizar Encargo con Abono ✓' : 'Finalizar Reserva con Seña ✓') : 'Finalizar con Pago Anticipado ✓')}
            </button>

            {/* SKIP BUTTON FOR OPTIONAL PREPAYMENT (OPTION B) */}
            {isSuggestedPrepayment && (
              <button
                onClick={handleConfirm}
                style={{
                  width: '100%', padding: 14, borderRadius: 14, border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--text)', fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', marginTop: 10
                }}
              >
                Omitir y Pagar al Momento de la Atención ➔
              </button>
            )}
          </div>
        )}

      </div>
      
      {/* FOOTER WATERMARK */}
      <div style={{ padding: 20, textAlign: 'center', opacity: 0.5, marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <img src="/enlace-logo.png" alt="Enlace" style={{ width: 16, height: 16, objectFit: 'contain' }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
          Funciona con Enlace Agenda Pro
        </div>
      </div>

    </div>
  )
}
