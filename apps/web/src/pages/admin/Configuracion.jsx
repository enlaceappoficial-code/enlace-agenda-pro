import { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { apiPatch, apiDelete } from '../../lib/api'
import { useAppTheme } from '../../context/ThemeContext'
import ThemeSelectorModal from '../../components/ThemeSelectorModal'

export default function Configuracion() {
  const { shop, setShop } = useOutletContext()
  const nav = useNavigate()
  const { theme, setTheme, themes, currentThemeMeta } = useAppTheme()
  const [showThemeModal, setShowThemeModal] = useState(false)
  const [form, setForm] = useState({
    name: '',
    logoUrl: '',
    depositEnabled: false,
    prepaymentEnabled: false,
    fastPaymentEnabled: false,
    barberBankName: '',
    barberBankAccountType: 'Cuenta Corriente',
    barberBankAccountNumber: '',
    barberBankRut: '',
    barberBankOwnerName: '',
    barberBankEmail: '',
    businessType: 'barberia'
  })
  const [loading, setLoading] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteEmail, setDeleteEmail] = useState('')
  const [typeSaving, setTypeSaving] = useState(false)
  const [typeToast, setTypeToast] = useState('')

  useEffect(() => {
    if (shop) {
      setForm({
        name: shop.name || '',
        logoUrl: shop.logoUrl || '',
        depositEnabled: shop.depositEnabled || false,
        prepaymentEnabled: shop.prepaymentEnabled || false,
        fastPaymentEnabled: shop.fastPaymentEnabled || false,
        barberBankName: shop.barberBankName || '',
        barberBankAccountType: shop.barberBankAccountType || 'Cuenta Corriente',
        barberBankAccountNumber: shop.barberBankAccountNumber || '',
        barberBankRut: shop.barberBankRut || '',
        barberBankOwnerName: shop.barberBankOwnerName || '',
        barberBankEmail: shop.barberBankEmail || '',
        businessType: shop.businessType || localStorage.getItem('enlace_business_type') || 'barberia'
      })
    }
  }, [shop])

  const handleBusinessTypeSwitch = async (newType) => {
    if (form.businessType === newType || typeSaving) return
    const nextType = newType === 'peluqueria' ? 'peluqueria' : 'barberia'
    localStorage.setItem('enlace_business_type', nextType)
    setForm(prev => ({ ...prev, businessType: nextType }))
    if (setShop) setShop(prev => ({ ...(prev || {}), businessType: nextType }))
    window.dispatchEvent(new CustomEvent('enlace:businessType', { detail: nextType }))
    setTypeToast(nextType === 'peluqueria' ? '✨ ¡Listo! La app ahora es Peluquería Pro' : '💈 ¡Listo! La app ahora es Barbería Pro')
    setTimeout(() => setTypeToast(''), 3500)

    setTypeSaving(true)
    try {
      const res = await apiPatch('/api/shop', { businessType: nextType })
      if (res?.shop && setShop) setShop(prev => ({ ...prev, ...res.shop, businessType: nextType }))
    } catch (e) {
      console.warn('[Enlace] Modo guardado localmente en cliente:', e)
    } finally {
      setTypeSaving(false)
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
        setForm({ ...form, logoUrl: base64 })
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert('Por favor, ingresa el nombre de tu negocio.')
      return
    }

    const anyEnabled = form.depositEnabled || form.prepaymentEnabled || form.fastPaymentEnabled
    if (anyEnabled) {
      if (!form.barberBankName?.trim() || 
          !form.barberBankAccountNumber?.trim() || 
          !form.barberBankRut?.trim() || 
          !form.barberBankOwnerName?.trim()) {
        alert('⚠️ Para activar cualquiera de las opciones de pago (Seña, Pago Anticipado o Pago Rápido), debes rellenar obligatoriamente todos los datos de tu cuenta bancaria (Banco, Número, RUT y Nombre de Titular).')
        return
      }
    }

    setLoading(true)
    try {
      const res = await apiPatch('/api/shop', form)
      setShop(res.shop)
      alert('Configuración guardada correctamente.')
    } catch (e) {
      alert(e.data?.error || e.message || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteEmail !== shop?.admins?.[0]?.email) {
      alert('El correo ingresado no coincide con tu cuenta.')
      return
    }

    try {
      await apiDelete('/api/account', { email: deleteEmail })
      alert('Tu cuenta ha sido eliminada. Serás redirigido.')
      nav('/admin/login')
    } catch (e) {
      alert(e.data?.error || e.message || 'Error al eliminar cuenta')
    }
  }

  const isPremium = shop?.planId === 'PRO'

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 80 }}>
      
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Personalizar mi App</h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          Esta información se mostrará en tu página pública de reservas para que tus clientes reconozcan tu marca.
        </p>
      </div>

      {/* SECTION: SWITCH RÁPIDO IDENTIDAD BARBERÍA / PELUQUERÍA */}
      <div style={{
        background: 'var(--card)',
        padding: '20px 24px',
        borderRadius: 16,
        border: '2px solid var(--accent)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{
              fontSize: 11,
              fontWeight: 800,
              color: 'var(--accent)',
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}>
              MODO / GIRO DE LA APLICACIÓN
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{form.businessType === 'peluqueria' ? '💇‍♀️' : '💈'}</span>
              <span>{form.businessType === 'peluqueria' ? 'PELUQUERÍA PRO' : 'BARBERÍA PRO'}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Toca el botón para cambiar el nombre y giro de tu app en tiempo real.
            </div>
          </div>

          {/* CONTROL SWITCH TIPO PILL SLIDER */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'var(--bg)',
            padding: 5,
            borderRadius: 30,
            border: '1.5px solid var(--border)',
            gap: 6,
          }}>
            <button
              type="button"
              disabled={typeSaving}
              onClick={() => handleBusinessTypeSwitch('barberia')}
              style={{
                border: 'none',
                background: form.businessType === 'barberia' ? 'var(--accent)' : 'transparent',
                color: form.businessType === 'barberia' ? '#ffffff' : 'var(--text-muted)',
                padding: '10px 20px',
                borderRadius: 24,
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: form.businessType === 'barberia' ? '0 4px 15px rgba(245,160,32,0.4)' : 'none',
                transition: 'all 0.25s ease',
              }}
            >
              <span style={{ fontSize: 16 }}>💈</span> Barbería Pro
            </button>

            <button
              type="button"
              disabled={typeSaving}
              onClick={() => handleBusinessTypeSwitch('peluqueria')}
              style={{
                border: 'none',
                background: form.businessType === 'peluqueria' ? 'var(--accent)' : 'transparent',
                color: form.businessType === 'peluqueria' ? '#ffffff' : 'var(--text-muted)',
                padding: '10px 20px',
                borderRadius: 24,
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: form.businessType === 'peluqueria' ? '0 4px 15px rgba(236,72,153,0.4)' : 'none',
                transition: 'all 0.25s ease',
              }}
            >
              <span style={{ fontSize: 16 }}>💇‍♀️</span> Peluquería Pro
            </button>
          </div>
        </div>

        {/* FEEDBACK TOAST DE CONFIRMACIÓN */}
        {typeToast && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.15)',
            color: '#22c55e',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 10,
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            {typeToast}
          </div>
        )}
      </div>

      {/* SECTION: COLOR PALETTE */}
      <div style={{
        background: 'var(--card)',
        padding: 20,
        borderRadius: 16,
        border: '0.5px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        boxShadow: 'var(--shadow-card)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🎨</span> Paleta de Colores
            </h3>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              Personaliza el tema visual y ambiente de tu aplicación.
            </p>
          </div>
          <button
            onClick={() => setShowThemeModal(true)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: 'var(--primary-subtle)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Ver Todas
          </button>
        </div>

        {/* Paletas Grid Rápido */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 10,
        }}>
          {themes.map(t => {
            const isSelected = theme === t.id
            return (
              <div
                key={t.id}
                onClick={() => setTheme(t.id)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: isSelected ? 'var(--primary-subtle)' : 'var(--bg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>
                    {t.name}
                  </span>
                  {isSelected && <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 900 }}>✓</span>}
                </div>

                {/* Swatches */}
                <div style={{ display: 'flex', gap: 4 }}>
                  {t.colors.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        width: 12, height: 12, borderRadius: '50%',
                        background: c, border: '1px solid rgba(255,255,255,0.2)',
                      }}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* SECTION: BASIC DETAILS */}
      <div style={{ background: 'var(--card)', padding: 20, borderRadius: 16, border: '0.5px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Datos Básicos</h3>
        
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>LOGO DE TU NEGOCIO</label>
          <div 
            style={{ 
              width: 110, height: 110, borderRadius: '50%', border: '2px dashed var(--border)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              background: form.logoUrl ? 'transparent' : 'var(--bg)', cursor: 'pointer',
              position: 'relative', overflow: 'hidden', margin: '0 auto'
            }}
            onClick={() => document.getElementById('shop-logo-upload').click()}
          >
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 11, fontWeight: 700 }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>📷</div>
                Subir Logo
              </div>
            )}
            <input 
              id="shop-logo-upload" 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              style={{ display: 'none' }} 
            />
          </div>
          {form.logoUrl && (
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setForm({ ...form, logoUrl: '' })}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--red)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Quitar logo personalizado (usar logo por defecto)
              </button>
            </div>
          )}
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>
            TIPO DE NEGOCIO (IDENTIDAD DE LA APP)
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            <div
              onClick={() => handleBusinessTypeSwitch('barberia')}
              style={{
                padding: '14px 16px',
                borderRadius: 14,
                cursor: 'pointer',
                border: form.businessType === 'barberia' ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: form.businessType === 'barberia' ? 'var(--primary-subtle)' : 'var(--bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 26 }}>💈</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)' }}>Barbería</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cortes y barbas</div>
                </div>
              </div>
              {form.businessType === 'barberia' && (
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', background: 'var(--bg)', padding: '2px 8px', borderRadius: 12, border: '1px solid var(--accent)' }}>
                  ✓ ACTIVO
                </span>
              )}
            </div>

            <div
              onClick={() => handleBusinessTypeSwitch('peluqueria')}
              style={{
                padding: '14px 16px',
                borderRadius: 14,
                cursor: 'pointer',
                border: form.businessType === 'peluqueria' ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: form.businessType === 'peluqueria' ? 'var(--primary-subtle)' : 'var(--bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 26 }}>💇‍♀️</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)' }}>Peluquería</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Salón, color y estilo</div>
                </div>
              </div>
              {form.businessType === 'peluqueria' && (
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', background: 'var(--bg)', padding: '2px 8px', borderRadius: 12, border: '1px solid var(--accent)' }}>
                  ✓ ACTIVO
                </span>
              )}
            </div>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>NOMBRE PÚBLICO DEL NEGOCIO *</label>
          <input 
            placeholder="Ej: Barbería Los Cracks" 
            style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)' }}
            value={form.name} 
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
        </div>
      </div>

      {/* SECTION: PREMIUM SEÑAS / DEPOSITS */}
      <div style={{ 
        background: 'var(--card)', 
        padding: 20, 
        borderRadius: 16, 
        border: isPremium ? '0.5px solid var(--border)' : '1.5px dashed var(--orange)', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 16,
        position: 'relative'
      }}>
        
        {/* LOCK OVERLAY IF NOT PREMIUM */}
        {!isPremium && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 8, 20, 0.75)',
            backdropFilter: 'blur(3px)',
            borderRadius: 16,
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
            textAlign: 'center',
            color: 'white'
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
            <h4 style={{ fontSize: 16, fontWeight: 800, color: '#fbbf24' }}>Ecosistema de Pagos Digitales</h4>
            <p style={{ fontSize: 12, color: '#e2e8f0', marginTop: 4, maxWidth: 280, marginBottom: 16 }}>
              Habilita cobro de señas, pagos totales por adelantado, o accesos de pago rápido. Exclusivo para el Plan Premium.
            </p>
            <button 
              onClick={() => nav('/admin/planes')}
              style={{
                background: 'var(--orange)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 12,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(245, 160, 32, 0.3)'
              }}
            >
              🚀 Upgrade a Premium
            </button>
          </div>
        )}

        <div>
          <h3 style={{ fontSize: 15, fontWeight: 800 }}>Datos Bancarios del Negocio</h3>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            Registra tu cuenta bancaria para recibir transferencias. Rellenar esto es opcional, pero obligatorio si activas alguna de las opciones inferiores.
          </p>
        </div>

        {/* BANK FIELDS IN RESPONSIVE GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>BANCO</label>
            <input 
              placeholder="Ej: Banco Estado, Banco de Chile..." 
              style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)' }}
              value={form.barberBankName}
              onChange={e => setForm({ ...form, barberBankName: e.target.value })}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>TIPO CUENTA</label>
            <select 
              style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)', height: 48, fontSize: 13, fontWeight: 600 }}
              value={form.barberBankAccountType}
              onChange={e => setForm({ ...form, barberBankAccountType: e.target.value })}
            >
              <option value="Cuenta Vista">Cuenta Vista / RUT</option>
              <option value="Cuenta Corriente">Cuenta Corriente</option>
              <option value="Cuenta de Ahorro">Cuenta de Ahorro</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>N° CUENTA</label>
            <input 
              placeholder="Ej: 12345678" 
              style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)' }}
              value={form.barberBankAccountNumber}
              onChange={e => setForm({ ...form, barberBankAccountNumber: e.target.value })}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>RUT CUENTA</label>
            <input 
              placeholder="Ej: 19.123.456-7" 
              style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)' }}
              value={form.barberBankRut}
              onChange={e => setForm({ ...form, barberBankRut: e.target.value })}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>NOMBRE DE TITULAR</label>
            <input 
              placeholder="Ej: Alexis Sánchez" 
              style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)' }}
              value={form.barberBankOwnerName}
              onChange={e => setForm({ ...form, barberBankOwnerName: e.target.value })}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>EMAIL PARA COMPROBANTES (OPCIONAL)</label>
            <input 
              placeholder="Ej: mi-contacto@correo.com" 
              style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)' }}
              value={form.barberBankEmail}
              onChange={e => setForm({ ...form, barberBankEmail: e.target.value })}
            />
          </div>

        </div>

        <div style={{ borderTop: '1px solid var(--border)', margin: '10px 0' }} />

        {/* THREE OPTIONS / TOGGLES */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>🎛️ Opciones de Experiencia para Clientes</h3>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, marginBottom: 14 }}>
            Habilita cómo interactuarán tus clientes con tus datos bancarios durante su agendamiento.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            
            {/* OPTION 1: SEÑAS */}
            <div style={{ 
              background: 'var(--bg)', 
              padding: 12, 
              borderRadius: 12, 
              border: form.depositEnabled ? '1px solid var(--orange)' : '0.5px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                  ⚡ Opción A: Cobro de Seña Obligatoria
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  Exige transferir un monto mínimo (configurable por servicio) y subir captura para poder reservar.
                </div>
              </div>
              <input 
                type="checkbox"
                checked={form.depositEnabled}
                onChange={e => setForm({ ...form, depositEnabled: e.target.checked })}
                style={{ width: 22, height: 22, cursor: 'pointer' }}
              />
            </div>

            {/* OPTION 2: PAGO ANTICIPADO */}
            <div style={{ 
              background: 'var(--bg)', 
              padding: 12, 
              borderRadius: 12, 
              border: form.prepaymentEnabled ? '1px solid var(--accent)' : '0.5px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                  💎 Opción B: Sugerir Pago Total Anticipado
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  Al agendar, invita amigablemente al cliente a pagar el 100% del servicio por adelantado y subir su captura opcionalmente.
                </div>
              </div>
              <input 
                type="checkbox"
                checked={form.prepaymentEnabled}
                onChange={e => setForm({ ...form, prepaymentEnabled: e.target.checked })}
                style={{ width: 22, height: 22, cursor: 'pointer' }}
              />
            </div>

            {/* OPTION 3: PAGO RAPIDO POST */}
            <div style={{ 
              background: 'var(--bg)', 
              padding: 12, 
              borderRadius: 12, 
              border: form.fastPaymentEnabled ? '1px solid var(--green)' : '0.5px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                  📱 Opción C: Datos para Pago Rápido Post-Servicio
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  Recomienda registrar tus datos bancarios en su app bancaria durante el agendamiento para transferir rápido al salir.
                </div>
              </div>
              <input 
                type="checkbox"
                checked={form.fastPaymentEnabled}
                onChange={e => setForm({ ...form, fastPaymentEnabled: e.target.checked })}
                style={{ width: 22, height: 22, cursor: 'pointer' }}
              />
            </div>

          </div>
        </div>

      </div>

      {/* SAVE BUTTON */}
      <button 
        onClick={handleSave}
        disabled={loading}
        style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', background: 'var(--accent)', color: 'white', fontWeight: 800, cursor: 'pointer' }}
      >
        {loading ? 'Guardando...' : 'Guardar Cambios'}
      </button>

      {/* SECTION: DELETE ACCOUNT */}
      <div style={{ background: 'var(--card)', padding: 20, borderRadius: 16, border: '1px solid var(--red)', display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--red)' }}>Zona Peligrosa</h3>
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>
          Si eliminas tu cuenta, perderás todos tus datos, servicios y citas permanentemente. Esta acción no se puede deshacer.
        </p>
        <button 
          onClick={() => setShowDeleteModal(true)}
          style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: 'var(--red)', color: 'white', fontWeight: 800, cursor: 'pointer' }}
        >
          Eliminar mi cuenta
        </button>
      </div>

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--card)', padding: 24, borderRadius: 16, border: '0.5px solid var(--border)', maxWidth: 400, width: '100%' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12, color: 'var(--red)' }}>¿Estás seguro?</h2>
            <p style={{ fontSize: 14, color: 'var(--text)', opacity: 0.9, lineHeight: '1.6', marginBottom: 20 }}>
              Esta acción eliminará tu cuenta, servicios y datos permanentemente. No se puede deshacer.
            </p>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
              Por favor, escribe tu email (**{shop?.admins?.[0]?.email || 'tu correo'}**) para confirmar:
            </p>
            <input 
              placeholder="Escribe tu email aquí" 
              style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', marginBottom: 20 }}
              value={deleteEmail}
              onChange={e => setDeleteEmail(e.target.value)}
            />
            
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button 
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteEmail('')
                }}
                style={{ background: 'var(--btn-secondary)', color: 'var(--btn-secondary-text)', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleDeleteAccount}
                style={{ background: 'var(--red)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                Eliminar Permanentemente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* THEME SELECTOR MODAL */}
      <ThemeSelectorModal isOpen={showThemeModal} onClose={() => setShowThemeModal(false)} />

    </div>
  )
}
