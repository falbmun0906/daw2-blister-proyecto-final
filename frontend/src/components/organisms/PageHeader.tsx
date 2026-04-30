import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa6';

import { usePageTitleStore } from '../../stores/page-title.store';

/**
 * Header minimalista que se muestra en todas las páginas autenticadas
 * excepto en /home. Izquierda: botón de volver. Centro: título de la
 * sección registrado vía `usePageTitle()`. Derecha: vacío (reservado).
 */
export function PageHeader() {
  const navigate = useNavigate();
  const title = usePageTitleStore((s) => s.title);
  const backHandler = usePageTitleStore((s) => s.backHandler);

  const handleBack = (): void => {
    if (backHandler) backHandler();
    else navigate(-1);
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
