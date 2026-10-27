import { useEffect, useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { apiGet, apiPost, apiPatch } from '../../lib/api'

export default function Planes() {
  const { shop, setShop } = useOutletContext()
  const nav = useNavigate()
  const [billingPeriod, setBillingPeriod] = useState('ANUAL') // 'MENSUAL' | 'SEMESTRAL' | 'ANUAL'
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showBankModal, setShowBankModal] = useState(false)
  const [selectedUpgrade, setSelectedUpgrade] = useState(null)
  const [couponCode, setCouponCode] = useState('')

  const loadStatus = () => {
    setLoading(true)
    apiGet('/api/enlace/status')
      .then(r => setStatus(r))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const currentPlanId = shop?.planId || 'BASIC'

  const pricing = {
    BASIC: {
      SEMESTRAL: { price: '$29.990', raw: 29990, label: 'por semestre', subLabel: 'equivale a $5.000/mes' },
      ANUAL: { price: '$49.990', raw: 49990, label: 'al año', subLabel: 'equivale a $4.166/mes', highlight: true }
    },
    PRO: {
      SEMESTRAL: { price: '$45.990', raw: 45990, label: 'por semestre', subLabel: 'equivale a $7.665/mes' },
      ANUAL: { price: '$79.990', raw: 79900, label: 'al año', subLabel: 'equivale a $6.665/mes (¡Ahorra 16%!)', highlight: true }
    },
    PREMIUM: {
      SEMESTRAL: { price: '$85.990', raw: 85990, label: 'por semestre', subLabel: 'equivale a $14.330/mes' },
      ANUAL: { price: '$149.990', raw: 149990, label: 'al año', subLabel: 'equivale a $12.499/mes (¡Ahorra 16%!)', highlight: true }
    }
  }

  const handleOpenBankModal = (planName) => {
    setSelectedUpgrade(planName)
    setShowBankModal(true)
  }

  const handleSendTransferReceipt = () => {
    const shopName = shop?.name || 'Mi Barbería'
    const text = encodeURIComponent(`Hola Enlace, acabo de realizar la transferencia para activar el plan ${selectedUpgrade} (${billingPeriod}) para mi negocio: "${shopName}". Adjunto el comprobante de transferencia.`)
    window.open(`https://wa.me/56936306500?text=${text}`, '_blank')
  }

  const handleInstantActivate = async (targetPlanId) => {
    try {
      const res = await apiPatch('/api/shop', { planId: targetPlanId })
      setShop(res.shop)
      alert(`🎉 ¡Plan ${targetPlanId === 'PRO' ? 'Premium (PRO)' : 'Pro (PLUS)'} activado instantáneamente para pruebas (Modo Demo)!`)
      setShowBankModal(false)
      loadStatus()
    } catch (e) {
      alert(e.message || 'Error al actualizar el plan')
    }
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 60, overflowY: 'auto', height: '100%' }}>
      
      {/* HEADER */}
      <div style={{ textAlign: 'center', margin: '10px 0' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Planes y Suscripción</h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          Sube de nivel tu negocio y monetiza con herramientas de alto impacto.
        </p>
      </div>

      {/* PLAN ACTUAL BANNER */}
      <div style={{ 
        background: 'linear-gradient(135deg, var(--hover) 0%, var(--card) 100%)', 
        padding: 16, 
        borderRadius: 16, 
        border: '1.5px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)' }}>TU PLAN ACTUAL</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            {currentPlanId === 'BASIC' ? 'Básico / Starter' : currentPlanId === 'PLUS' ? 'Pro' : 'Premium'}
            <span style={{ 
              fontSize: 10, 
              padding: '3px 8px', 
              background: status?.connected ? 'var(--green)' : 'var(--orange)', 
              color: 'white', 
              borderRadius: 12,
              fontWeight: 800
            }}>
              {status?.connected ? '🔗 Vinculado' : 'Local'}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            {status?.connected 
              ? 'Disfrutas del Plan Starter Gratis de por vida por ser miembro Enlace.' 
              : 'Vincula tu cuenta de Red Enlace para desbloquear el Plan Starter Gratis.'}
          </p>
        </div>
        {!status?.connected && (
          <button 
            onClick={() => nav('/admin/enlace')}
            style={{ 
              background: 'var(--orange)', 
              color: 'white', 
              border: 'none', 
              padding: '10px 14px', 
              borderRadius: 12, 
              fontWeight: 800, 
              fontSize: 12, 
              cursor: 'pointer' 
            }}
          >
            Vincular Gratis
          </button>
        )}
      </div>

      {/* CÓDIGO DE BENEFICIO */}
      <div style={{ 
        background: 'var(--card)', 
        padding: 16, 
        borderRadius: 16, 
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>¿Tienes un código de beneficio?</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input 
            type="text" 
            placeholder="Ingresa tu código aquí" 
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            style={{ 
              flex: 1, 
              padding: '10px 14px', 
              borderRadius: 10, 
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
              fontSize: 14
            }}
          />
          <button 
            onClick={async () => {
              if (!couponCode) return alert('Ingresa un código');
              try {
                const res = await apiPost('/api/shop/apply-code', { code: couponCode });
                alert(`🎉 ¡Código aplicado con éxito! Tu plan ahora es ${res.planId}.`);
                window.location.reload();
              } catch (e) {
                alert(e.message || 'Error al aplicar el código');
              }
            }}
            style={{ 
              background: 'var(--accent)', 
              color: 'white', 
              border: 'none', 
              padding: '10px 16px', 
              borderRadius: 10, 
              fontWeight: 800, 
              fontSize: 13, 
              cursor: 'pointer' 
            }}
          >
            Aplicar
          </button>
        </div>
      </div>

      {/* INTERVAL SELECTOR */}
      <div style={{ 
        display: 'flex', 
        background: 'var(--hover)', 
        padding: 4, 
        borderRadius: 14, 
        alignSelf: 'center',
        width: '100%',
        maxWidth: 320,
        border: '0.5px solid var(--border)'
      }}>
        {['SEMESTRAL', 'ANUAL'].map((p) => (
          <button
            key={p}
            onClick={() => setBillingPeriod(p)}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 11,
              border: 'none',
              fontWeight: 800,
              fontSize: 11,
              cursor: 'pointer',
              background: billingPeriod === p ? 'var(--card)' : 'transparent',
              color: billingPeriod === p ? 'var(--text)' : 'var(--muted)',
              transition: 'all 0.2s ease',
              boxShadow: billingPeriod === p ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            {p === 'ANUAL' ? 'Anual 💎' : p === 'SEMESTRAL' ? 'Semestral' : 'Mensual'}
          </button>
        ))}
      </div>

      {/* PLAN CARDS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* CARD STARTER */}
        <div style={{ 
          background: 'var(--card)', 
          borderRadius: 20, 
          border: '0.5px solid var(--border)', 
          padding: 20, 
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>Starter</h3>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Ideal para emprendedores individuales</p>
              <p style={{ fontSize: 11, color: 'var(--orange)', fontWeight: 700, marginTop: 4, background: 'rgba(245, 158, 11, 0.1)', padding: '4px 8px', borderRadius: 6 }}>🎁 Si eres parte de los emprendedores pioneros de Enlace, obtén tu plan básico GRATIS por 6 meses.</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>
                {pricing.BASIC[billingPeriod].price}
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>{pricing.BASIC[billingPeriod].label}</div>
            </div>
          </div>
          {pricing.BASIC[billingPeriod].subLabel && (
            <div style={{ fontSize: 10, color: 'var(--orange)', fontWeight: 700, marginTop: 4, textAlign: 'right' }}>
              {pricing.BASIC[billingPeriod].subLabel}
            </div>
          )}
          <div style={{ borderBottom: '1px solid var(--border)', margin: '14px 0' }} />
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, listStyle: 'none', padding: 0, marginBottom: 16 }}>
            <li style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>🟢 1 Barbero (Profesional)</li>
            <li style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>🟢 Reservas Básicas con link de cliente</li>
            <li style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>🟢 Caja diaria y Gastos básicos</li>
            <li style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>🟢 Base de clientes básica</li>
            <li style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)' }}>🔴 Sin CRM de retención</li>
            <li style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)' }}>🔴 Sin estadísticas avanzadas ni fórmulas</li>
          </ul>
          {currentPlanId !== 'BASIC' && (
            <button 
              onClick={() => handleInstantActivate('BASIC')}
              style={{ 
                width: '100%', 
                padding: 14, 
                borderRadius: 12, 
                border: '1px solid var(--border)', 
                background: 'var(--bg)', 
                color: 'var(--text)', 
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              Volver a Plan Starter (Demo)
            </button>
          )}
        </div>

        {/* CARD PRO */}
        <div style={{ 
          background: 'var(--card)', 
          borderRadius: 20, 
          border: currentPlanId === 'PLUS' ? '2px solid var(--accent)' : '0.5px solid var(--border)', 
          padding: 20,
          boxShadow: currentPlanId === 'PLUS' ? '0 8px 24px rgba(0, 102, 255, 0.08)' : 'none'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800 }}>Pro</h3>
                <span style={{ fontSize: 9, padding: '2px 6px', background: 'var(--accent)', color: 'white', borderRadius: 8, fontWeight: 800 }}>MÁS POPULAR</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Lleva tu salón a otro nivel</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>
                {pricing.PRO[billingPeriod].price}
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>{pricing.PRO[billingPeriod].label}</div>
            </div>
          </div>
          {pricing.PRO[billingPeriod].subLabel && (
            <div style={{ fontSize: 10, color: 'var(--orange)', fontWeight: 700, marginTop: 4, textAlign: 'right' }}>
              {pricing.PRO[billingPeriod].subLabel}
            </div>
          )}
          <div style={{ borderBottom: '1px solid var(--border)', margin: '14px 0' }} />
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, listStyle: 'none', padding: 0, marginBottom: 16 }}>
            <li style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>🟢 Hasta 3 Barberos (Profesionales)</li>
            <li style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>🟢 CRM Inteligente de Retención de Clientes</li>
            <li style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>🟢 Fórmulas de Coloración y notas avanzadas</li>
            <li style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>🟢 Estadísticas de ganancias netas y reportes</li>
            <li style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>🟢 Personalizar app con tu propio Logo</li>
            <li style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>🟢 Galería de fotos para compartir en Enlace</li>
          </ul>
          <button 
            onClick={() => handleOpenBankModal('Pro')}
            style={{ 
              width: '100%', 
              padding: 14, 
              borderRadius: 12, 
              border: 'none', 
              background: currentPlanId === 'PLUS' ? 'rgba(34, 197, 94, 0.1)' : 'var(--accent)', 
              color: currentPlanId === 'PLUS' ? 'var(--green)' : 'white', 
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            {currentPlanId === 'PLUS' ? '✓ Plan Pro Activo' : 'Activar Plan Pro'}
          </button>
        </div>

        {/* CARD PREMIUM */}
        <div style={{ 
          background: 'var(--card)', 
          borderRadius: 20, 
          border: currentPlanId === 'PRO' ? '2px solid var(--orange)' : '0.5px solid var(--border)', 
          padding: 20,
          boxShadow: currentPlanId === 'PRO' ? '0 8px 24px rgba(245, 160, 32, 0.08)' : 'none'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>Premium</h3>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>El poder total para tu marca</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--orange)' }}>
                {pricing.PREMIUM[billingPeriod].price}
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>{pricing.PREMIUM[billingPeriod].label}</div>
            </div>
          </div>
          {pricing.PREMIUM[billingPeriod].subLabel && (
            <div style={{ fontSize: 10, color: 'var(--orange)', fontWeight: 700, marginTop: 4, textAlign: 'right' }}>
              {pricing.PREMIUM[billingPeriod].subLabel}
            </div>
          )}
          <div style={{ borderBottom: '1px solid var(--border)', margin: '14px 0' }} />
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, listStyle: 'none', padding: 0, marginBottom: 16 }}>
            <li style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>🟢 Barberos Ilimitados (Sin límite de personal)</li>
            <li style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>⚡ Depósito Opcional Anti No-Show para reservar</li>
            <li style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>⚡ Dominio propio personalizado (tumarca.redenlace.cl)</li>
            <li style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>🟢 WhatsApp API automático para confirmaciones</li>
            <li style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>🟢 Notificaciones Push ilimitadas</li>
            <li style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>🟢 Todo lo incluido en el Plan Pro</li>
          </ul>
          <button 
            onClick={() => handleOpenBankModal('Premium')}
            style={{ 
              width: '100%', 
              padding: 14, 
              borderRadius: 12, 
              border: 'none', 
              background: currentPlanId === 'PRO' ? 'rgba(34, 197, 94, 0.1)' : 'linear-gradient(135deg, var(--orange) 0%, #d97706 100%)', 
              color: currentPlanId === 'PRO' ? 'var(--green)' : 'white', 
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            {currentPlanId === 'PRO' ? '✓ Plan Premium Activo' : 'Activar Plan Premium'}
          </button>
        </div>

      </div>

      {/* BANK TRANSFER MODAL / DRAWER */}
      {showBankModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: 16
        }}>
          <div style={{
            background: 'var(--card)',
            borderRadius: 24,
            width: '100%',
            maxWidth: 400,
            padding: 24,
            border: '1px solid var(--border)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>Datos de Transferencia</h3>
              <button 
                onClick={() => setShowBankModal(false)}
                style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}
              >
                ✕
              </button>
            </div>
            
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              Realiza la transferencia por tu plan <strong>{selectedUpgrade} ({billingPeriod})</strong> e infórmanos al instante para activarte la cuenta.
            </p>

            <div style={{ 
              background: 'var(--hover)', 
              padding: 16, 
              borderRadius: 16, 
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>Banco:</span>
                <span style={{ fontWeight: 700 }}>Banco Estado</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>Tipo Cuenta:</span>
                <span style={{ fontWeight: 700 }}>Cuenta Corriente</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>N° Cuenta:</span>
                <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>12003405678</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>RUT:</span>
                <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>77.123.456-K</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>Nombre:</span>
                <span style={{ fontWeight: 700 }}>Red Social Enlace SpA</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--muted)' }}>Email:</span>
                <span style={{ fontWeight: 700 }}>pagos@redenlace.cl</span>
              </div>
            </div>

            {/* INSTANT ACTIVATION BADGE FOR TESTING */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px dashed var(--accent)',
              borderRadius: 14,
              padding: 12,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)' }}>🧪 MODO DEMO / TESTING</div>
              <button
                onClick={() => handleInstantActivate(selectedUpgrade === 'Premium' ? 'PRO' : 'PLUS')}
                style={{
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 14px',
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                ⚡ Activar Plan Instantáneamente
              </button>
            </div>

            <button 
              onClick={handleSendTransferReceipt}
              style={{
                background: '#25D366',
                color: 'white',
                border: 'none',
                padding: 16,
                borderRadius: 14,
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              💬 Enviar Comprobante por WhatsApp
            </button>
            
            <button 
              onClick={() => setShowBankModal(false)}
              style={{
                background: 'transparent',
                color: 'var(--muted)',
                border: '1px solid var(--border)',
                padding: 12,
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
