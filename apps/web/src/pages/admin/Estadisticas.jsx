import { useEffect, useState } from 'react'
import { apiGet } from '../../lib/api'

export default function Estadisticas() {
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [month])

  const loadStats = async () => {
    setLoading(true)
    try {
      const [year, m] = month.split('-').map(Number)
      const daysInMonth = new Date(year, m, 0).getDate()

      // Fetch all appointments for the month
      const allApps = []
      const promises = []
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
        promises.push(apiGet(`/api/appointments?date=${dateStr}`).then(r => ({ date: dateStr, apps: r.appointments || [] })))
      }
      const results = await Promise.all(promises)

      // Also fetch expenses
      const expRes = await apiGet('/api/expenses')
      const expenses = expRes.expenses || []
      const totalExpenses = expenses.reduce((s, e) => s + e.monto, 0)

      // Process data
      let totalIncome = 0
      let totalServices = 0
      let totalCompleted = 0
      let totalCanceled = 0
      let totalNoShow = 0
      const serviceCount = {}
      const dailyData = []
      const clientSet = new Set()

      for (const { date, apps } of results) {
        const completed = apps.filter(a => a.status === 'COMPLETED')
        const dayIncome = completed.reduce((s, a) => s + (a.price || 0), 0)
        totalIncome += dayIncome
        totalServices += completed.length
        totalCompleted += completed.length
        totalCanceled += apps.filter(a => a.status === 'CANCELED').length
        totalNoShow += apps.filter(a => a.status === 'NO_SHOW').length

        for (const a of completed) {
          const sName = a.service?.name || 'Sin servicio'
          serviceCount[sName] = (serviceCount[sName] || 0) + 1
          if (a.clientId) clientSet.add(a.clientId)
          if (a.guestPhone) clientSet.add(a.guestPhone)
        }

        dailyData.push({ date, income: dayIncome, count: completed.length })
      }

      const totalAppointments = results.reduce((s, r) => s + r.apps.length, 0)
      const avgTicket = totalCompleted > 0 ? Math.round(totalIncome / totalCompleted) : 0
      const workDays = dailyData.filter(d => d.count > 0).length
      const avgDaily = workDays > 0 ? Math.round(totalIncome / workDays) : 0
      const bestDay = dailyData.reduce((best, d) => d.income > best.income ? d : best, { income: 0, date: '' })

      // Top services sorted by count
      const topServices = Object.entries(serviceCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)

      // Max income for daily chart scaling
      const maxDayIncome = Math.max(...dailyData.map(d => d.income), 1)

      setData({
        totalIncome,
        totalServices,
        totalCompleted,
        totalCanceled,
        totalNoShow,
        totalAppointments,
        avgTicket,
        avgDaily,
        bestDay,
        topServices,
        dailyData,
        maxDayIncome,
        uniqueClients: clientSet.size,
        totalExpenses,
        profit: totalIncome - totalExpenses,
        workDays,
        daysInMonth
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const [year, m] = month.split('-').map(Number)
  const monthLabel = `${monthNames[m - 1]} ${year}`

  const changeMonth = (dir) => {
    let newM = m + dir
    let newY = year
    if (newM < 1) { newM = 12; newY-- }
    if (newM > 12) { newM = 1; newY++ }
    setMonth(`${newY}-${String(newM).padStart(2, '0')}`)
  }

  const kpiStyle = {
    background: 'var(--card)', padding: 14, borderRadius: 14,
    border: '0.5px solid var(--border)', textAlign: 'center'
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Cargando estadísticas de {monthLabel}...</div>

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 40 }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => changeMonth(-1)} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--card)', fontSize: 16, cursor: 'pointer' }}>←</button>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>📊 Estadísticas</h2>
          <div style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 600 }}>{monthLabel}</div>
        </div>
        <button onClick={() => changeMonth(1)} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--card)', fontSize: 16, cursor: 'pointer' }}>→</button>
      </div>

      {/* RESUMEN PRINCIPAL */}
      <div style={{ background: 'linear-gradient(135deg, var(--accent), #1a4fd8)', borderRadius: 18, padding: 20, color: 'white', textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.8 }}>INGRESOS DEL MES</div>
        <div style={{ fontSize: 36, fontWeight: 800, marginTop: 4 }}>${data.totalIncome.toLocaleString()}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 12, fontSize: 12 }}>
          <div>
            <div style={{ fontWeight: 800 }}>{data.totalCompleted}</div>
            <div style={{ opacity: 0.7 }}>Servicios</div>
          </div>
          <div>
            <div style={{ fontWeight: 800 }}>{data.uniqueClients}</div>
            <div style={{ opacity: 0.7 }}>Clientes</div>
          </div>
          <div>
            <div style={{ fontWeight: 800 }}>{data.workDays}</div>
            <div style={{ opacity: 0.7 }}>Días activos</div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={kpiStyle}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>${data.avgTicket.toLocaleString()}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>Ticket promedio</div>
        </div>
        <div style={kpiStyle}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>${data.avgDaily.toLocaleString()}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>Ingreso promedio/día</div>
        </div>
        <div style={kpiStyle}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--red)' }}>{data.totalCanceled}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>Cancelaciones</div>
        </div>
        <div style={kpiStyle}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>{data.totalNoShow}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>No-shows</div>
        </div>
      </div>

      {/* RENTABILIDAD */}
      <div style={{ background: 'var(--card)', borderRadius: 14, border: '0.5px solid var(--border)', padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted)', marginBottom: 12 }}>💰 RENTABILIDAD</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14 }}>Ingresos totales</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--green)' }}>+${data.totalIncome.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14 }}>Gastos fijos mensuales</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--red)' }}>-${data.totalExpenses.toLocaleString()}</span>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>Ganancia estimada</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: data.profit >= 0 ? 'var(--green)' : 'var(--red)' }}>${data.profit.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* MINI GRÁFICO DIARIO */}
      <div style={{ background: 'var(--card)', borderRadius: 14, border: '0.5px solid var(--border)', padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted)', marginBottom: 12 }}>📈 INGRESOS DIARIOS</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80 }}>
          {data.dailyData.map((d, i) => {
            const h = data.maxDayIncome > 0 ? (d.income / data.maxDayIncome) * 100 : 0
            const dayNum = new Date(d.date).getDate()
            const isToday = d.date === new Date().toISOString().split('T')[0]
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div 
                  style={{ 
                    width: '100%', minHeight: 2, height: `${h}%`, 
                    background: isToday ? 'var(--accent)' : d.income > 0 ? 'var(--green)' : 'var(--border)',
                    borderRadius: 3, 
                    transition: 'height 0.3s'
                  }} 
                  title={`${d.date}: $${d.income.toLocaleString()}`}
                />
                {(dayNum === 1 || dayNum === 10 || dayNum === 20 || dayNum === data.daysInMonth) && (
                  <span style={{ fontSize: 8, color: 'var(--muted)' }}>{dayNum}</span>
                )}
              </div>
            )
          })}
        </div>
        {data.bestDay.income > 0 && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
            🏆 Mejor día: <strong style={{ color: 'var(--text)' }}>{new Date(data.bestDay.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</strong> — ${data.bestDay.income.toLocaleString()}
          </div>
        )}
      </div>

      {/* TOP SERVICIOS */}
      <div style={{ background: 'var(--card)', borderRadius: 14, border: '0.5px solid var(--border)', padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted)', marginBottom: 12 }}>🏅 TOP SERVICIOS</div>
        {data.topServices.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 10 }}>Sin datos este mes</div>
        ) : (
          data.topServices.slice(0, 5).map((s, i) => {
            const pct = data.totalCompleted > 0 ? Math.round((s.count / data.totalCompleted) * 100) : 0
            return (
              <div key={s.name} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700 }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  '} {s.name}
                  </span>
                  <span style={{ fontWeight: 800, color: 'var(--accent)' }}>{s.count} ({pct}%)</span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 3, transition: 'width 0.5s' }} />
                </div>
              </div>
            )
          })
        )}
      </div>

    </div>
  )
}
