import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { ROUTES } from './constants/routes'
import { AppLayout } from './components/layout/AppLayout'
import { DesktopDeviceShell } from './components/layout/DesktopDeviceShell'
import { PublicPageLayout } from './components/layout/PublicPageLayout'
import { GuestRoute } from './router/GuestRoute'
import { LoginRoute } from './router/LoginRoute'
import { OnboardingRoute } from './router/OnboardingRoute'
import { PrivateRoute } from './router/PrivateRoute'

const LandingPage = lazy(() => import('./pages/Landing/LandingPage'))
const OnboardingPage = lazy(() => import('./pages/Onboarding/OnboardingPage'))
const LoginPage = lazy(() => import('./pages/Login/LoginPage'))
const RegisterPage = lazy(() => import('./pages/Register/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPassword/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPassword/ResetPasswordPage'))
const ConfirmEmailPage = lazy(() => import('./pages/ConfirmEmail/ConfirmEmailPage'))
const HomePage = lazy(() => import('./pages/Home/HomePage'))
const BlisterListPage = lazy(() => import('./pages/Blisters/BlisterListPage'))
const BlisterCreatePage = lazy(() => import('./pages/Blisters/BlisterCreatePage'))
const BlisterJoinPage = lazy(() => import('./pages/Blisters/BlisterJoinPage'))
const BlisterMembersPage = lazy(() => import('./pages/Blisters/BlisterMembersPage'))
const InventoryPage = lazy(() => import('./pages/Inventory/InventoryPage'))
const AddMedicinePage = lazy(() => import('./pages/Inventory/AddMedicinePage'))
const EditMedicinePage = lazy(() => import('./pages/Inventory/EditMedicinePage'))
const MedicineDetailPage = lazy(() => import('./pages/Medicine/MedicineDetailPage'))
const CimaMedicineDetailPage = lazy(() => import('./pages/Medicine/CimaMedicineDetailPage'))
const TreatmentsPage = lazy(() => import('./pages/Treatments/TreatmentsPage'))
const TreatmentFormPage = lazy(() => import('./pages/Treatments/TreatmentFormPage'))
const TreatmentDetailPage = lazy(() => import('./pages/Treatments/TreatmentDetailPage'))
const AppointmentsPage = lazy(() => import('./pages/Appointments/CalendarPage'))
const AppointmentFormPage = lazy(() => import('./pages/Appointments/AppointmentFormPage'))
const AdherencePage = lazy(() => import('./pages/Adherence/AdherencePage'))
const PlaceholderPage = lazy(() =>
  import('./pages/PlaceholderPage').then((module) => ({ default: module.PlaceholderPage })),
)
const ProfilePage = lazy(() => import('./pages/Profile/ProfilePage'))
const EditProfilePage = lazy(() => import('./pages/Profile/EditProfilePage'))
const PersonalInfoPage = lazy(() => import('./pages/Profile/PersonalInfoPage'))
const ChangePasswordPage = lazy(() => import('./pages/Profile/ChangePasswordPage'))
const AvatarPage = lazy(() => import('./pages/Profile/AvatarPage'))
const NotificationSettingsPage = lazy(() => import('./pages/Profile/NotificationSettingsPage'))
const AccessibilityPage = lazy(() => import('./pages/Accessibility/AccessibilityPage'))
const McpTokenPage = lazy(() => import('./pages/MCP/McpTokenPage'))
const McpTokenRevokePage = lazy(() => import('./pages/MCP/McpTokenRevokePage'))
const PrivacyPage = lazy(() => import('./pages/Privacy/PrivacyPage'))

function App() {
  return (
    <BrowserRouter>
      <DesktopDeviceShell>
        <Suspense fallback={null}>
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

            <Route element={<PublicPageLayout />}>
              <Route path={ROUTES.privacy} element={<PrivacyPage />} />
            </Route>

            <Route path={ROUTES.confirmEmail} element={<ConfirmEmailPage />} />

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
                <Route
                  path={ROUTES.medicineDetail(':blisterId', ':medicineId')}
                  element={<MedicineDetailPage />}
                />
                <Route path={ROUTES.cimaMedicineDetail(':nregist')} element={<CimaMedicineDetailPage />} />
                <Route
                  path={ROUTES.treatmentDetail(':blisterId', ':treatmentId')}
                  element={<TreatmentDetailPage />}
                />
                <Route path={ROUTES.profile} element={<ProfilePage />} />
                <Route path={ROUTES.editProfile} element={<EditProfilePage />} />
                <Route path={ROUTES.personalInfo} element={<PersonalInfoPage />} />
                <Route path={ROUTES.changePassword} element={<ChangePasswordPage />} />
                <Route path={ROUTES.profileAvatar} element={<AvatarPage />} />
                <Route path={ROUTES.notificationSettings} element={<NotificationSettingsPage />} />
                <Route path={ROUTES.accessibility} element={<AccessibilityPage />} />
                <Route path={ROUTES.mcpToken} element={<McpTokenPage />} />
                <Route path={ROUTES.mcpTokenRevoke} element={<McpTokenRevokePage />} />
                <Route path={ROUTES.settings} element={<Navigate to={ROUTES.privacy} replace />} />
                <Route path={ROUTES.mcp} element={<PlaceholderPage />} />
              </Route>
            </Route>

            <Route path={ROUTES.notFound} element={<Navigate to={ROUTES.landing} replace />} />
          </Routes>
        </Suspense>
      </DesktopDeviceShell>
    </BrowserRouter>
  )
}

export default App
