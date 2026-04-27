import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'

import { ROUTES } from './constants/routes'
import { GuestRoute } from './router/GuestRoute'
import { PrivateRoute } from './router/PrivateRoute'
import LandingPage from './pages/Landing/LandingPage'
import { PlaceholderPage } from './pages/PlaceholderPage'

function AppLayout() {
  return <Outlet />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to={ROUTES.landing} replace />} />
          <Route path={ROUTES.landing} element={<LandingPage />} />
          <Route element={<GuestRoute />}>
            <Route path={ROUTES.login} element={<PlaceholderPage />} />
            <Route path={ROUTES.register} element={<PlaceholderPage />} />
            <Route path={ROUTES.forgotPassword} element={<PlaceholderPage />} />
          </Route>
          <Route element={<PrivateRoute />}>
            <Route path={ROUTES.home} element={<PlaceholderPage />} />
            <Route path={ROUTES.blisters} element={<PlaceholderPage />} />
            <Route path={ROUTES.createBlister} element={<PlaceholderPage />} />
            <Route path={ROUTES.joinBlister} element={<PlaceholderPage />} />
            <Route path={ROUTES.blisterDetail(':blisterId')} element={<PlaceholderPage />} />
            <Route path={ROUTES.blisterMembers(':blisterId')} element={<PlaceholderPage />} />
            <Route path={ROUTES.blisterMedications(':blisterId')} element={<PlaceholderPage />} />
            <Route path={ROUTES.blisterTreatments(':blisterId')} element={<PlaceholderPage />} />
            <Route path={ROUTES.blisterAppointments(':blisterId')} element={<PlaceholderPage />} />
            <Route path={ROUTES.blisterNotifications(':blisterId')} element={<PlaceholderPage />} />
            <Route path={ROUTES.medicineDetail(':blisterId', ':medicineId')} element={<PlaceholderPage />} />
            <Route path={ROUTES.treatmentDetail(':blisterId', ':treatmentId')} element={<PlaceholderPage />} />
            <Route path={ROUTES.profile} element={<PlaceholderPage />} />
            <Route path={ROUTES.settings} element={<PlaceholderPage />} />
            <Route path={ROUTES.accessibility} element={<PlaceholderPage />} />
            <Route path={ROUTES.mcp} element={<PlaceholderPage />} />
          </Route>
          <Route path={ROUTES.notFound} element={<Navigate to={ROUTES.landing} replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App