import { FaArrowLeft } from 'react-icons/fa6';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';

import { ROUTES } from '../../constants/routes';
import { useBlisterStore } from '../../stores/blister.store';
import { usePageTitleStore } from '../../stores/page-title.store';
import { BlisterPageSelector } from './BlisterPageSelector';
import { BlisterHeaderSelector } from './BlisterHeaderSelector';

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
  if (
    pathname === ROUTES.editProfile
    || pathname === ROUTES.changePassword
    || pathname === ROUTES.profileAvatar
    || pathname === ROUTES.accessibility
    || pathname === ROUTES.notificationSettings
    || pathname === ROUTES.mcpToken
    || pathname === ROUTES.settings
  ) {
    return ROUTES.profile;
  }
  if (pathname === ROUTES.personalInfo || pathname === ROUTES.deleteAccount) return ROUTES.editProfile;
  if (pathname === ROUTES.mcpTokenRevoke) return ROUTES.mcpToken;
  if (pathname === ROUTES.profile) return ROUTES.home;

  const mainMedicine = getMatchParams(pathname, ROUTES.blisterMedications(':blisterId'));
  const mainTreatments = getMatchParams(pathname, ROUTES.blisterTreatments(':blisterId'));
  const mainAppointments = getMatchParams(pathname, ROUTES.blisterAppointments(':blisterId'));
  if (mainMedicine || mainTreatments || mainAppointments) return ROUTES.home;

  return ROUTES.home;
};

export function PageHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeBlisterId = useBlisterStore((state) => state.activeBlisterId);
  const title = usePageTitleStore((state) => state.title);
  const backHandler = usePageTitleStore((state) => state.backHandler);

  const mainMedicine = getMatchParams(location.pathname, ROUTES.blisterMedications(':blisterId'));
  const mainTreatments = getMatchParams(location.pathname, ROUTES.blisterTreatments(':blisterId'));
  const mainAppointments = getMatchParams(location.pathname, ROUTES.blisterAppointments(':blisterId'));
  const isPrimarySection = Boolean(mainMedicine || mainTreatments || mainAppointments);
  const isMcpTokenPage = location.pathname === ROUTES.mcpToken;

  const handleBack = (): void => {
    if (backHandler) backHandler();
    else navigate(resolveParentRoute(location.pathname, activeBlisterId, location.state));
  };

  return (
    <header className={`c-page-header${isMcpTokenPage ? ' c-page-header--mcp-token' : ''}`}>
      <div className="c-page-header__bar">
        <div className="c-page-header__side c-page-header__side--start">
          {isPrimarySection ? (
            <span className="c-page-header__spacer" aria-hidden="true" />
          ) : (
            <button
              type="button"
              className="c-page-header__back"
              onClick={handleBack}
              aria-label="Volver atrás"
            >
              <FaArrowLeft className="c-icon c-icon--lg" aria-hidden="true" />
            </button>
          )}
        </div>
        <h1 className="c-page-header__title">{title}</h1>
        <div className="c-page-header__side c-page-header__side--end">
          {isPrimarySection ? (
            <BlisterHeaderSelector />
          ) : (
            <span className="c-page-header__spacer" aria-hidden="true" />
          )}
        </div>
      </div>
      {isPrimarySection ? <BlisterPageSelector /> : null}
    </header>
  );
}
