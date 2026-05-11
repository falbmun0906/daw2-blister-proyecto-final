import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { ROUTES } from './constants/routes'
import { AppLayout } from './components/layout/AppLayout'
import { DesktopDeviceShell } from './components/layout/DesktopDeviceShell'
import { GuestRoute } from './router/GuestRoute'
import { LoginRoute } from './router/LoginRoute'
import { OnboardingRoute } from './router/OnboardingRoute'
import { PrivateRoute } from './router/PrivateRoute'
import LandingPage from './pages/Landing/LandingPage'
import OnboardingPage from './pages/Onboarding/OnboardingPage'
import LoginPage from './pages/Login/LoginPage'
import RegisterPage from './pages/Register/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPassword/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPassword/ResetPasswordPage'
import HomePage from './pages/Home/HomePage'
import BlisterListPage from './pages/Blisters/BlisterListPage'
import BlisterCreatePage from './pages/Blisters/BlisterCreatePage'
import BlisterJoinPage from './pages/Blisters/BlisterJoinPage'
import BlisterMembersPage from './pages/Blisters/BlisterMembersPage'
import InventoryPage from './pages/Inventory/InventoryPage'
import AddMedicinePage from './pages/Inventory/AddMedicinePage'
import EditMedicinePage from './pages/Inventory/EditMedicinePage'
import MedicineDetailPage from './pages/Medicine/MedicineDetailPage'
import CimaMedicineDetailPage from './pages/Medicine/CimaMedicineDetailPage'
import TreatmentsPage from './pages/Treatments/TreatmentsPage'
import TreatmentFormPage from './pages/Treatments/TreatmentFormPage'
import TreatmentDetailPage from './pages/Treatments/TreatmentDetailPage'
import AppointmentsPage from './pages/Appointments/CalendarPage'
import AppointmentFormPage from './pages/Appointments/AppointmentFormPage'
import AdherencePage from './pages/Adherence/AdherencePage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import ProfilePage from './pages/Profile/ProfilePage'
import EditProfilePage from './pages/Profile/EditProfilePage'
import PersonalInfoPage from './pages/Profile/PersonalInfoPage'
import ChangePasswordPage from './pages/Profile/ChangePasswordPage'
import AvatarPage from './pages/Profile/AvatarPage'
import NotificationSettingsPage from './pages/Profile/NotificationSettingsPage'
import AccessibilityPage from './pages/Accessibility/AccessibilityPage'
import McpTokenPage from './pages/MCP/McpTokenPage'
import McpTokenRevokePage from './pages/MCP/McpTokenRevokePage'
import PrivacyPage from './pages/Privacy/PrivacyPage'

function App() {
  return (
    <BrowserRouter>
      <DesktopDeviceShell>
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
          <Route path={ROUTES.resetPassword} element={<ResetPasswordPage />} />
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
            <Route path={ROUTES.blisterTreatments(':blisterId')} element={<TreatmentsPage />} />
            <Route path={ROUTES.newTreatment(':blisterId')} element={<TreatmentFormPage />} />
            <Route
              path={ROUTES.editTreatment(':blisterId', ':treatmentId')}
              element={<TreatmentFormPage />}
            />
            <Route path={ROUTES.blisterAppointments(':blisterId')} element={<AppointmentsPage />} />
            <Route path={ROUTES.newAppointment(':blisterId')} element={<AppointmentFormPage />} />
            <Route
              path={ROUTES.editAppointment(':blisterId', ':appointmentId')}
              element={<AppointmentFormPage />}
            />
            <Route path={ROUTES.blisterLogs(':blisterId')} element={<AdherencePage />} />
            <Route path={ROUTES.blisterNotifications(':blisterId')} element={<PlaceholderPage />} />
            <Route path={ROUTES.medicineDetail(':blisterId', ':medicineId')} element={<MedicineDetailPage />} />
            <Route path={ROUTES.cimaMedicineDetail(':nregist')} element={<CimaMedicineDetailPage />} />
            <Route path={ROUTES.treatmentDetail(':blisterId', ':treatmentId')} element={<TreatmentDetailPage />} />
            <Route path={ROUTES.profile} element={<ProfilePage />} />
            <Route path={ROUTES.editProfile} element={<EditProfilePage />} />
            <Route path={ROUTES.personalInfo} element={<PersonalInfoPage />} />
            <Route path={ROUTES.changePassword} element={<ChangePasswordPage />} />
            <Route path={ROUTES.profileAvatar} element={<AvatarPage />} />
            <Route path={ROUTES.notificationSettings} element={<NotificationSettingsPage />} />
            <Route path={ROUTES.accessibility} element={<AccessibilityPage />} />
            <Route path={ROUTES.mcpToken} element={<McpTokenPage />} />
            <Route path={ROUTES.mcpTokenRevoke} element={<McpTokenRevokePage />} />
            <Route path={ROUTES.settings} element={<PrivacyPage />} />
            <Route path={ROUTES.mcp} element={<PlaceholderPage />} />
          </Route>
        </Route>

          <Route path={ROUTES.notFound} element={<Navigate to={ROUTES.landing} replace />} />
        </Routes>
      </DesktopDeviceShell>
    </BrowserRouter>
  )
}

export default App
