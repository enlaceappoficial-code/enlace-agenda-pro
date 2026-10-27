import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiDelete } from '../../lib/api'

export default function Caja() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [appointments, setAppointments] = useState([])
  const [extras, setExtras] = useState([])
  const [monthlyExpenses, setMonthlyExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  // Form for extras
  const [newExtra, setNewExtra] = useState({ concept: '', amount: '', type: 'ingreso' })

  useEffect(() => {
    fetchData()
  }, [date])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [rApps, rExp, rExt] = await Promise.all([
        apiGet(`/api/appointments?date=${date}`),
        apiGet(`/api/expenses`),
        apiGet(`/api/cash-extras?date=${date}`)
      ])
      setAppointments(rApps.appointments || [])
      setMonthlyExpenses(rExp.expenses || [])
      setExtras(rExt.extras || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const addExtra = async () => {
    if (!newExtra.concept || !newExtra.amount) return
    try {
      await apiPost('/api/cash-extras', {
        ...newExtra,
        date,
        amount: Number(newExtra.amount)
      })
      setNewExtra({ concept: '', amount: '', type: 'ingreso' })
      fetchData()
    } catch (e) { alert(e.message) }
  }

  const removeExtra = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return
    try {
      await apiDelete(`/api/cash-extras/${id}`)
      fetchData()
    } catch (e) { alert(e.message) }
  }

  const completedApps = appointments.filter(a => a.status === 'COMPLETED')
  const appsTotal = completedApps.reduce((s, a) => s + a.price, 0)
  const appsCostsTotal = completedApps.reduce((s, a) => s + (a.service?.costTotal || 0), 0)
  const extrasIncome = extras.filter(e => e.type === 'ingreso').reduce((s, e) => s + e.amount, 0)
  const extrasExpense = extras.filter(e => e.type === 'egreso').reduce((s, e) => s + e.amount, 0)
  const grandTotal = appsTotal + extrasIncome - extrasExpense

  const totalMonthlyExpenses = monthlyExpenses.reduce((s, e) => s + e.monto, 0)
  const dailyFixedCost = Math.round(totalMonthlyExpenses / 30)
  const realDailyMargin = (grandTotal - appsCostsTotal) - dailyFixedCost

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      
      <div style={{ background: 'var(--card)', padding: 16, borderRadius: 14, border: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800 }}>Cierre de Caja</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button 
            onClick={() => window.print()}
            style={{ padding: '8px 12px', borderRadius: 10, border: 'none', background: 'var(--btn-secondary)', color: 'var(--btn-secondary-text)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            🖨️ Imprimir
          </button>
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 14 }}
          />
        </div>
      </div>

      <style>{`
        @media print {
          nav, button, input, .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-only { display: block !important; }
          div { border: none !important; box-shadow: none !important; }
          * { transition: none !important; }
        }
      `}</style>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ background: 'var(--card)', padding: 12, borderRadius: 12, border: '0.5px solid var(--border)' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700 }}>SERVICIOS</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>${appsTotal.toLocaleString()}</div>
        </div>
        <div style={{ background: 'var(--card)', padding: 12, borderRadius: 12, border: '0.5px solid var(--border)' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700 }}>EXTRAS</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)' }}>+${extrasIncome.toLocaleString()}</div>
        </div>
        <div style={{ background: 'var(--card)', padding: 12, borderRadius: 12, border: '0.5px solid var(--border)' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700 }}>EGRESOS</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--red)' }}>-${extrasExpense.toLocaleString()}</div>
        </div>
        <div style={{ background: 'var(--orange)', padding: 12, borderRadius: 12, border: 'none' }}>
          <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.5)', fontWeight: 700 }}>TOTAL DÍA</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#000' }}>${grandTotal.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ background: 'var(--card)', padding: 12, borderRadius: 12, border: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>Costo de servicios</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--red)' }}>-${appsCostsTotal.toLocaleString()}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>Costo fijo diario</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--red)' }}>-${dailyFixedCost.toLocaleString()}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>Margen bruto del día</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)' }}>${(grandTotal - appsCostsTotal).toLocaleString()}</div>
        </div>
      </div>

      <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 12, border: '1px solid var(--border)', textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800, marginBottom: 4 }}>MARGEN REAL DEL DÍA</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: realDailyMargin >= 0 ? 'var(--green)' : 'var(--red)' }}>
          ${realDailyMargin.toLocaleString()}
        </div>
      </div>

      {/* LISTA COMPLETADAS */}
      <div style={{ background: 'var(--card)', borderRadius: 14, border: '0.5px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--border)', fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>
          SERVICIOS REALIZADOS ({completedApps.length})
        </div>
        {loading ? <div style={{ padding: 20, textAlign: 'center' }}>Cargando...</div> :
         completedApps.length === 0 ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>Sin servicios completados este día</div> :
         completedApps.map(a => {
           const sCost = a.service?.costTotal || 0;
           const sMargin = a.price - sCost;
           return (
             <div key={a.id} style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', borderBottom: '0.5px solid var(--border)', fontSize: 14 }}>
               <div>
                 <div style={{ fontWeight: 700 }}>{a.guestName || a.client?.fullName}</div>
                 <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                   {new Date(a.startsAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })} · {a.service?.name}
                 </div>
               </div>
               <div style={{ textAlign: 'right' }}>
                 <div style={{ fontWeight: 800, color: 'var(--green)' }}>${a.price.toLocaleString()}</div>
                 {sCost > 0 && (
                   <div style={{ fontSize: 11, marginTop: 2 }}>
                     <span style={{ color: 'var(--red)' }}>-${sCost.toLocaleString()}</span>
                     <span style={{ color: 'var(--muted)', margin: '0 4px' }}>|</span>
                     <span style={{ color: '#3b82f6', fontWeight: 700 }}>Mg: ${sMargin.toLocaleString()}</span>
                   </div>
                 )}
               </div>
             </div>
           )
         })
        }
      </div>

      {/* EXTRAS / EGRESOS */}
      <div style={{ background: 'var(--card)', borderRadius: 14, border: '0.5px solid var(--border)', padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)', marginBottom: 12 }}>OTROS INGRESOS / GASTOS</div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button 
              onClick={() => setNewExtra({ ...newExtra, type: 'ingreso' })}
              style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 700, background: newExtra.type === 'ingreso' ? 'var(--green)' : 'var(--btn-secondary)', color: newExtra.type === 'ingreso' ? 'white' : 'var(--btn-secondary-text)' }}
            >
              Ingreso (+)
            </button>
            <button 
              onClick={() => setNewExtra({ ...newExtra, type: 'egreso' })}
              style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 700, background: newExtra.type === 'egreso' ? 'var(--red)' : 'var(--btn-secondary)', color: newExtra.type === 'egreso' ? 'white' : 'var(--btn-secondary-text)' }}
            >
              Egreso (-)
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input 
              placeholder="Concepto (ej: Propina, Insumos)" 
              style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid var(--border)' }}
              value={newExtra.concept}
              onChange={e => setNewExtra({ ...newExtra, concept: e.target.value })}
            />
            <input 
              type="number" 
              placeholder="$" 
              style={{ width: 80, padding: 10, borderRadius: 10, border: '1px solid var(--border)' }}
              value={newExtra.amount}
              onChange={e => setNewExtra({ ...newExtra, amount: e.target.value })}
            />
            <button 
              onClick={addExtra}
              style={{ padding: '0 16px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'white', fontWeight: 800 }}
            >
              +
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {extras.map(e => (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '0.5px solid #eee' }}>
              <div style={{ fontSize: 14 }}>
                <span style={{ fontWeight: 700, color: e.type === 'ingreso' ? 'var(--green)' : 'var(--red)' }}>
                  {e.type === 'ingreso' ? '+' : '-'}
                </span>
                {' '}{e.concept}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontWeight: 800 }}>${e.amount.toLocaleString()}</div>
                <button onClick={() => removeExtra(e.id)} style={{ border: 'none', background: 'transparent', color: 'var(--red)', fontSize: 18 }}>×</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* GASTOS FIJOS MENSUALES SUMMARY */}
      <div style={{ background: 'var(--card)', borderRadius: 14, border: '0.5px solid var(--border)', padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0, marginBottom: 8 }}>🏢 Gastos fijos mensuales</h3>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
          Configura y gestiona tus gastos fijos desde el menú <strong>Más &gt; Gastos Fijos</strong>.
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>Total Mensual Calculado</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--red)' }}>-${totalMonthlyExpenses.toLocaleString()}</div>
        </div>
      </div>

    </div>
  )
}
