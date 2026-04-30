import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa6';

import { ROUTES } from '../../constants/routes';
import { useBlisterStore } from '../../stores/blister.store';
import { usePageTitleStore } from '../../stores/page-title.store';

interface RouteMatchParams {
  blisterId?: string;
  medicineId?: string;
  treatmentId?: string;
  appointmentId?: string;
}

const getStateParentRoute = (state: unknown): string | null => {
  if (typeof state !== 'object' || state === null) return null;
  const candidate = state as { parentRoute?: unknown };
  return typeof candidate.parentRoute === 'string' ? candidate.parentRoute : null;
};

const getMatchParams = (pathname: string, pattern: string): RouteMatchParams | null => {
  const match = matchPath({ path: pattern, end: true }, pathname);
  return match ? match.params : null;
};

const resolveParentRoute = (
  pathname: string,
  activeBlisterId: string | null,
  state: unknown,
): string => {
  const stateParentRoute = getStateParentRoute(state);
  if (stateParentRoute) return stateParentRoute;

  const editMedicine = getMatchParams(pathname, ROUTES.editMedicine(':blisterId', ':medicineId'));
  if (editMedicine?.blisterId && editMedicine.medicineId) {
    return ROUTES.medicineDetail(editMedicine.blisterId, editMedicine.medicineId);
  }

  const medicineDetail = getMatchParams(pathname, ROUTES.medicineDetail(':blisterId', ':medicineId'));
  if (medicineDetail?.blisterId) return ROUTES.blisterMedications(medicineDetail.blisterId);

  const addMedicine = getMatchParams(pathname, ROUTES.addMedicine(':blisterId'));
  if (addMedicine?.blisterId) return ROUTES.blisterMedications(addMedicine.blisterId);

  const cimaDetail = getMatchParams(pathname, ROUTES.cimaMedicineDetail(':nregist'));
  if (cimaDetail && activeBlisterId) return ROUTES.blisterMedications(activeBlisterId);

  const editTreatment = getMatchParams(pathname, ROUTES.editTreatment(':blisterId', ':treatmentId'));
  if (editTreatment?.blisterId) return ROUTES.blisterTreatments(editTreatment.blisterId);

  const newTreatment = getMatchParams(pathname, ROUTES.newTreatment(':blisterId'));
  if (newTreatment?.blisterId) return ROUTES.blisterTreatments(newTreatment.blisterId);

  const treatmentDetail = getMatchParams(pathname, ROUTES.treatmentDetail(':blisterId', ':treatmentId'));
  if (treatmentDetail?.blisterId) return ROUTES.blisterTreatments(treatmentDetail.blisterId);

  const editAppointment = getMatchParams(pathname, ROUTES.editAppointment(':blisterId', ':appointmentId'));
  if (editAppointment?.blisterId) return ROUTES.blisterAppointments(editAppointment.blisterId);

  const newAppointment = getMatchParams(pathname, ROUTES.newAppointment(':blisterId'));
  if (newAppointment?.blisterId) return ROUTES.blisterAppointments(newAppointment.blisterId);

  const blisterLogs = getMatchParams(pathname, ROUTES.blisterLogs(':blisterId'));
  if (blisterLogs?.blisterId) return ROUTES.blisterTreatments(blisterLogs.blisterId);

  const blisterMembers = getMatchParams(pathname, ROUTES.blisterMembers(':blisterId'));
  if (blisterMembers) return ROUTES.blisters;

  if (pathname === ROUTES.createBlister || pathname === ROUTES.joinBlister) return ROUTES.blisters;
  if (pathname === ROUTES.blisters) return ROUTES.profile;
  if (pathname === ROUTES.editProfile || pathname === ROUTES.changePassword || pathname === ROUTES.profileAvatar || pathname === ROUTES.accessibility || pathname === ROUTES.mcpToken) return ROUTES.profile;
  if (pathname === ROUTES.personalInfo) return ROUTES.editProfile;
  if (pathname === ROUTES.mcpTokenRevoke) return ROUTES.mcpToken;
  if (pathname === ROUTES.profile) return ROUTES.home;

  const mainMedicine = getMatchParams(pathname, ROUTES.blisterMedications(':blisterId'));
  const mainTreatments = getMatchParams(pathname, ROUTES.blisterTreatments(':blisterId'));
  const mainAppointments = getMatchParams(pathname, ROUTES.blisterAppointments(':blisterId'));
  if (mainMedicine || mainTreatments || mainAppointments) return ROUTES.home;

  return ROUTES.home;
};

/**
 * Header minimalista que se muestra en todas las páginas autenticadas
 * excepto en /home. Izquierda: botón de volver. Centro: título de la
 * sección registrado vía `usePageTitle()`. Derecha: vacío (reservado).
 */
export function PageHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const title = usePageTitleStore((s) => s.title);
  const backHandler = usePageTitleStore((s) => s.backHandler);

  const handleBack = (): void => {
    if (backHandler) backHandler();
    else navigate(resolveParentRoute(location.pathname, activeBlisterId, location.state));
  };

  return (
    <header className="c-page-header" role="banner">
      <button
        type="button"
        className="c-page-header__back"
        onClick={handleBack}
        aria-label="Volver atrás"
      >
        <FaArrowLeft className="c-icon c-icon--lg" aria-hidden="true" />
      </button>
      <h1 className="c-page-header__title">{title}</h1>
      <span className="c-page-header__spacer" aria-hidden="true" />
    </header>
  );
}
