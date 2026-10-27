import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

export default function BookingLink() {
  const { shop } = useOutletContext()
  const [copied, setCopied] = useState(false)

  const link = useMemo(() => {
    const origin = window.location.origin
    const slug = shop?.slug || 'mi-barberia'
    return `${origin}/b/${slug}`
  }, [shop?.slug])

  const waShare = useMemo(() => {
    const msg = `Reserva tu hora aquí → ${link}`
    return `https://wa.me/?text=${encodeURIComponent(msg)}`
  }, [link])

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      alert("Error al copiar al portapapeles")
    }
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 60, marginBottom: 10 }}>🔗</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Link de Reservas</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 8 }}>
          Tus clientes pueden agendar solos usando este enlace
        </p>
      </div>

      <div style={{ 
        background: 'var(--card)', 
        padding: 20, 
        borderRadius: 18, 
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}>
        <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>TU LINK PERSONALIZADO</label>
        <div style={{ 
          background: 'var(--bg)', 
          padding: 14, 
          borderRadius: 12, 
          border: '1px solid var(--border)',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--accent)',
          wordBreak: 'break-all',
          textAlign: 'center'
        }}>
          {link}
        </div>
        
        <button 
          onClick={copy}
          style={{ 
            background: 'var(--accent)', 
            color: 'white', 
            border: 'none', 
            borderRadius: 14, 
            padding: 16, 
            fontWeight: 800, 
            fontSize: 15,
            cursor: 'pointer',
            marginTop: 10
          }}
        >
          {copied ? '✅ ¡Link Copiado!' : '📋 Copiar link'}
        </button>

        <a 
          href={waShare} 
          target="_blank" 
          rel="noreferrer"
          style={{ 
            background: '#25D366', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: 14, 
            padding: 16, 
            fontWeight: 800, 
            fontSize: 15,
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}
        >
          <span>💬 Compartir por WhatsApp</span>
        </a>
      </div>

      <div style={{ 
        padding: 16, 
        borderRadius: 16, 
        background: 'rgba(245, 160, 32, 0.05)', 
        border: '1px dashed #f5a020',
        display: 'flex',
        gap: 12
      }}>
        <div style={{ fontSize: 20 }}>💡</div>
        <div style={{ fontSize: 13, color: '#9a6512', fontWeight: 500, lineHeight: '1.4' }}>
          <b>Tip:</b> Pon este link en tu biografía de Instagram o Facebook para que tus seguidores se conviertan en clientes.
        </div>
      </div>
    </div>
  )
}


