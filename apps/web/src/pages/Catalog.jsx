import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

const APPS = [
  {
    id: 'PELUQUERIA',
    title: 'Enlace Peluquería',
    sector: 'Servicios',
    desc: 'Agenda de turnos, historial de clientes, control de caja y recordatorios.',
    status: { label: 'Prioridad 1', tone: 'warn' },
    href: '/b/mi-barberia',
  },
  {
    id: 'RESTORAN',
    title: 'Enlace Restorán',
    sector: 'Gastronomía',
    desc: 'Gestión de mesas, pedidos, carta QR, control de stock básico y cierre de caja.',
    status: { label: 'Prioridad 2', tone: 'warn' },
    href: null,
  },
  {
    id: 'CONSTRUCTOR_PRO',
    title: 'Enlace Constructor Pro',
    sector: 'Construcción',
    desc: 'Presupuestos, APU, licitaciones y contratos para contratistas.',
    status: { label: 'En producción', tone: 'ok' },
    href: null,
  },
  {
    id: 'AGENDA_PRO',
    title: 'Enlace Agenda Pro',
    sector: 'Servicios',
    desc: 'Para gasfiteros, electricistas, técnicos y cualquier servicio a domicilio.',
    status: { label: 'Prioridad 3', tone: 'warn' },
    href: null,
  },
  {
    id: 'ALMACEN',
    title: 'Enlace Almacén',
    sector: 'Comercio',
    desc: 'Control de inventario simple, punto de venta básico, gestión de fiados y cuentas.',
    status: { label: 'Planificado', tone: 'muted' },
    href: null,
  },
  {
    id: 'FOOD_TRUCK',
    title: 'Enlace Food Truck',
    sector: 'Gastronomía',
    desc: 'Carta digital, pedidos, control operativo y cierre de caja.',
    status: { label: 'Planificado', tone: 'muted' },
    href: null,
  },
  {
    id: 'BIENESTAR',
    title: 'Enlace Bienestar',
    sector: 'Bienestar',
    desc: 'Para masajistas, kinesiólogos, yoga, pilates y terapias. Agenda y ficha.',
    status: { label: 'Planificado', tone: 'muted' },
    href: null,
  },
  {
    id: 'BOUTIQUE',
    title: 'Enlace Boutique',
    sector: 'Comercio',
    desc: 'Catálogo visual, tallas/colores, stock básico y ventas.',
    status: { label: 'Planificado', tone: 'muted' },
    href: null,
  },
  {
    id: 'CLASES',
    title: 'Enlace Clases',
    sector: 'Educación',
    desc: 'Control de alumnos, asistencia, agenda y pagos.',
    status: { label: 'Planificado', tone: 'muted' },
    href: null,
  },
]

const SECTORES = ['Todas', 'Servicios', 'Gastronomía', 'Comercio', 'Construcción', 'Bienestar', 'Educación']

function toneClass(tone) {
  if (tone === 'ok') return 'badge ok'
  if (tone === 'warn') return 'badge warn'
  return 'badge'
}

export default function Catalog() {
  const [sector, setSector] = useState('Todas')

  const apps = useMemo(() => {
    if (sector === 'Todas') return APPS
    return APPS.filter((a) => a.sector === sector)
  }, [sector])

  return (
    <div className="page">
      <div className="card">
        <div className="rowBetween">
          <div>
            <div className="title">Enlace · Red social de emprendedores</div>
            <div className="muted">App madre · Perfil · Geolocalización · Reputación</div>
          </div>
          <span className="badge ok">App madre</span>
        </div>
      </div>

      <div className="card">
        <div className="muted" style={{ marginBottom: 10 }}>
          Filtrar por sector
        </div>
        <div className="chips">
          {SECTORES.map((s) => (
            <button key={s} type="button" className={sector === s ? 'chip on' : 'chip'} onClick={() => setSector(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="gridCards">
        {apps.map((a) => {
          const CardTag = a.href ? Link : 'div'
          const props = a.href ? { to: a.href, className: 'appCard on' } : { className: 'appCard' }
          return (
            <CardTag key={a.id} {...props}>
              <div className="appTitle">{a.title}</div>
              <div className="muted">{a.sector}</div>
              <div className="appDesc">{a.desc}</div>
              <div className="appFoot">
                <span className={toneClass(a.status.tone)}>{a.status.label}</span>
                {a.href ? <span className="link">Abrir</span> : <span className="muted">Próximamente</span>}
              </div>
            </CardTag>
          )
        })}
      </div>

      <div className="card">
        <div className="h2">Niveles de producto</div>
        <div className="muted">
          Básico: versión gratuita/regalo con lo esencial. Pro: desbloquea módulos extra (reportes, recordatorios,
          exportación, etc.).
        </div>
      </div>
    </div>
  )
}

