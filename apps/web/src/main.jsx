import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext'

// ─── INYECCIÓN INICIAL DEL TEMA ──────────────────────────────────────────
// Lee el tema guardado por el usuario en localStorage o usa 'enlace' (Azules y Naranjos)
// como predeterminado oficial de la plataforma.
const initialTheme = localStorage.getItem('enlace_barberia_theme') || 'enlace'
document.documentElement.setAttribute('data-theme', initialTheme)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
