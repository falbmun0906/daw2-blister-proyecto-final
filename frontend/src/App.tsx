import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { ROUTES } from './constants/routes'
import { AppLayout } from './components/layout/AppLayout'
import { GuestRoute } from './router/GuestRoute'
import { LoginRoute } from './router/LoginRoute'
import { OnboardingRoute } from './router/OnboardingRoute'
import { PrivateRoute } from './router/PrivateRoute'
import LandingPage from './pages/Landing/LandingPage'
import OnboardingPage from './pages/Onboarding/OnboardingPage'
import LoginPage from './pages/Login/LoginPage'
import RegisterPage from './pages/Register/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPassword/ForgotPasswordPage'
import HomePage from './pages/Home/HomePage'
import BlisterListPage from './pages/Blisters/BlisterListPage'
import BlisterCreatePage from './pages/Blisters/BlisterCreatePage'
import BlisterJoinPage from './pages/Blisters/BlisterJoinPage'
import BlisterMembersPage from './pages/Blisters/BlisterMembersPage'
import InventoryPage from './pages/Inventory/InventoryPage'
import AddMedicinePage from './pages/Inventory/AddMedicinePage'
import EditMedicinePage from './pages/Inventory/EditMedicinePage'
import MedicineDetailPage from './pages/Medicine/MedicineDetailPage'
import { PlaceholderPage } from './pages/PlaceholderPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<Navigate to={ROUTES.landing} replace />} />
        <Route path={ROUTES.landing} element={<LandingPage />} />
        <Route path={ROUTES.access} element={<Navigate to={ROUTES.landing} replace />} />

        {/* Onboarding accesible solo la primera vez o si el usuario lo reactiva desde Ajustes */}
        <Route element={<OnboardingRoute />}>
          <Route path={ROUTES.onboarding} element={<OnboardingPage />} />
        </Route>

        {/* /login redirige a /onboarding si el usuario nunca lo vio */}
        <Route element={<LoginRoute />}>
          <Route path={ROUTES.login} element={<LoginPage />} />
        </Route>

        <Route element={<GuestRoute />}>
          <Route path={ROUTES.register} element={<RegisterPage />} />
          <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
        </Route>

        {/* Shell autenticado: AppHeader + BottomNav envuelven todas las rutas privadas */}
        <Route element={<PrivateRoute />}>
          <Route element={<AppLayout />}>
            <Route path={ROUTES.home} element={<HomePage />} />
            <Route path={ROUTES.blisters} element={<BlisterListPage />} />
            <Route path={ROUTES.createBlister} element={<BlisterCreatePage />} />
            <Route path={ROUTES.joinBlister} element={<BlisterJoinPage />} />
            <Route path={ROUTES.blisterMembers(':blisterId')} element={<BlisterMembersPage />} />
            <Route path={ROUTES.blisterDetail(':blisterId')} element={<PlaceholderPage />} />
            <Route path={ROUTES.blisterMedications(':blisterId')} element={<InventoryPage />} />
            <Route path={ROUTES.addMedicine(':blisterId')} element={<AddMedicinePage />} />
            <Route
              path={ROUTES.editMedicine(':blisterId', ':medicineId')}
              element={<EditMedicinePage />}
            />
            <Route path={ROUTES.blisterTreatments(':blisterId')} element={<PlaceholderPage />} />
            <Route path={ROUTES.blisterAppointments(':blisterId')} element={<PlaceholderPage />} />
            <Route path={ROUTES.blisterNotifications(':blisterId')} element={<PlaceholderPage />} />
            <Route path={ROUTES.medicineDetail(':blisterId', ':medicineId')} element={<MedicineDetailPage />} />
            <Route path={ROUTES.treatmentDetail(':blisterId', ':treatmentId')} element={<PlaceholderPage />} />
            <Route path={ROUTES.profile} element={<PlaceholderPage />} />
            <Route path={ROUTES.settings} element={<PlaceholderPage />} />
            <Route path={ROUTES.accessibility} element={<PlaceholderPage />} />
            <Route path={ROUTES.mcp} element={<PlaceholderPage />} />
          </Route>
        </Route>

        <Route path={ROUTES.notFound} element={<Navigate to={ROUTES.landing} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App