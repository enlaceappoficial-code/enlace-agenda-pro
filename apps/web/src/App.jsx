import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Booking        from './pages/Booking'
import BookingConfirm from './pages/BookingConfirm'
import BookingCancel  from './pages/BookingCancel'
import AdminLogin     from './pages/admin/Login'
import AdminRegister  from './pages/admin/Register'
import AdminShell     from './pages/admin/AdminShell'
import Dashboard      from './pages/admin/Dashboard'
import Agenda         from './pages/admin/Agenda'
import Clientes       from './pages/admin/Clientes'
import Caja           from './pages/admin/Caja'
import Services       from './pages/admin/Services'
import EnlacePage     from './pages/admin/Enlace'
import BookingLink    from './pages/admin/BookingLink'
import Gallery        from './pages/admin/Gallery'
import More           from './pages/admin/More'
import Professionals  from './pages/admin/Professionals'
import GastosFijos    from './pages/admin/GastosFijos'
import Configuracion  from './pages/admin/Configuracion'
import Estadisticas   from './pages/admin/Estadisticas'
import Planes         from './pages/admin/Planes'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/b/:slug"             element={<Booking />} />
        <Route path="/b/:slug/confirm/:id" element={<BookingConfirm />} />
        <Route path="/b/:slug/cancel/:id"  element={<BookingCancel />} />
        <Route path="/admin/login"         element={<AdminLogin />} />
        <Route path="/admin/register"      element={<AdminRegister />} />
        <Route path="/admin" element={<AdminShell />}>
          <Route index             element={<Dashboard />} />
          <Route path="agenda"     element={<Agenda />} />
          <Route path="clientes"   element={<Clientes />} />
          <Route path="caja"       element={<Caja />} />
          <Route path="more"       element={<More />} />
          <Route path="services"   element={<Services />} />
          <Route path="enlace"     element={<EnlacePage />} />
          <Route path="booking-link" element={<BookingLink />} />
          <Route path="professionals" element={<Professionals />} />
          <Route path="gastos-fijos" element={<GastosFijos />} />
          <Route path="configuracion" element={<Configuracion />} />
          <Route path="estadisticas" element={<Estadisticas />} />
          <Route path="gallery"    element={<Gallery />} />
          <Route path="planes"     element={<Planes />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
