import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiDelete } from '../../lib/api'

export default function GastosFijos() {
  const [monthlyExpenses, setMonthlyExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [newMonthlyExpense, setNewMonthlyExpense] = useState({ nombre: '', monto: '', categoria: 'arriendo' })
  const [showExpenseForm, setShowExpenseForm] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const rExp = await apiGet(`/api/expenses`)
      setMonthlyExpenses(rExp.expenses || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleAddExpense = async () => {
    if (!newMonthlyExpense.nombre || !newMonthlyExpense.nombre.trim()) {
      alert('📝 ¡Opa! Por favor, ingresa el nombre o descripción del gasto fijo.')
      return
    }
    if (!newMonthlyExpense.monto || Number(newMonthlyExpense.monto) <= 0) {
      alert('💰 Por favor, ingresa un monto válido mayor a $0.')
      return
    }

    try {
      await apiPost('/api/expenses', {
        ...newMonthlyExpense,
        monto: Number(newMonthlyExpense.monto)
      })
      setNewMonthlyExpense({ nombre: '', monto: '', categoria: 'arriendo' })
      setShowExpenseForm(false)
      load()
    } catch (e) { 
      alert(e.data?.error || '💸 ¡Ups! Tuvimos un inconveniente al guardar el gasto fijo. Revisa los datos e intenta nuevamente.') 
    }
  }

  const handleDeleteExpense = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este gasto fijo?')) return
    try {
      await apiDelete(`/api/expenses/${id}`)
      load()
    } catch (e) { 
      alert('💸 ¡Ups! No pudimos eliminar el gasto en este momento. Inténtalo nuevamente.') 
    }
  }

  const totalMonthlyExpenses = monthlyExpenses.reduce((s, e) => s + e.monto, 0)
  const dailyFixedCost = Math.round(totalMonthlyExpenses / 30)

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Gastos Fijos</h2>
        <button 
          onClick={() => setShowExpenseForm(!showExpenseForm)}
          style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 12, padding: '10px 16px', fontWeight: 700 }}
        >
          {showExpenseForm ? 'Cancelar' : '+ Agregar'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ background: 'var(--card)', padding: 12, borderRadius: 12, border: '0.5px solid var(--border)' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700 }}>TOTAL MENSUAL</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--red)' }}>${totalMonthlyExpenses.toLocaleString()}</div>
        </div>
        <div style={{ background: 'var(--card)', padding: 12, borderRadius: 12, border: '0.5px solid var(--border)' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700 }}>COSTO FIJO DIARIO</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--orange)' }}>${dailyFixedCost.toLocaleString()}</div>
        </div>
      </div>

      {showExpenseForm && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>Nuevo Gasto Fijo</h3>
          <input 
            placeholder="Nombre del gasto (Ej: Arriendo, Luz...)" 
            style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}
            value={newMonthlyExpense.nombre}
            onChange={e => setNewMonthlyExpense({ ...newMonthlyExpense, nombre: e.target.value })}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <input 
              type="number" 
              placeholder="$ Monto" 
              style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}
              value={newMonthlyExpense.monto}
              onChange={e => setNewMonthlyExpense({ ...newMonthlyExpense, monto: e.target.value })}
            />
            <select 
              style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}
              value={newMonthlyExpense.categoria}
              onChange={e => setNewMonthlyExpense({ ...newMonthlyExpense, categoria: e.target.value })}
            >
              <option value="arriendo">Arriendo</option>
              <option value="servicios">Servicios (Luz, Agua)</option>
              <option value="equipos">Equipos / Insumos fijos</option>
              <option value="marketing">Marketing</option>
              <option value="personal">Personal fijos</option>
              <option value="general">General</option>
            </select>
          </div>
          <button 
            onClick={handleAddExpense}
            style={{ padding: 12, borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'white', fontWeight: 700, marginTop: 4 }}
          >
            Guardar Gasto Fijo
          </button>
        </div>
      )}

      <div style={{ background: 'var(--card)', borderRadius: 14, border: '0.5px solid var(--border)', padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Lista de Gastos Fijos</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, padding: 10 }}>Cargando...</div>
          ) : monthlyExpenses.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, padding: 10 }}>No hay gastos fijos registrados.</div>
          ) : (
            monthlyExpenses.map(e => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '0.5px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{e.nombre}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'capitalize' }}>{e.categoria}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--red)' }}>-${e.monto.toLocaleString()}</div>
                  <button onClick={() => handleDeleteExpense(e.id)} style={{ border: 'none', background: 'transparent', color: 'var(--red)', fontSize: 20, cursor: 'pointer', padding: '0 8px' }}>×</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
