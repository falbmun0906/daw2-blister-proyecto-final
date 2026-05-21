import { Link } from 'react-router-dom';
import { TbChevronRight } from 'react-icons/tb';

import { Avatar } from '../../components/atoms/Avatar';
import { ROUTES } from '../../constants/routes';
import { usePageTitle } from '../../hooks/use.page-title';
import { useAuthStore } from '../../stores/auth.store';

interface EditLink {
  to: string;
  label: string;
}

const EDIT_LINKS: EditLink[] = [
  { to: ROUTES.personalInfo, label: 'Información personal' },
  { to: ROUTES.changePassword, label: 'Cambiar contraseña' },
];

function EditProfilePage() {
  usePageTitle('Editar perfil');
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  return (
    <section className="c-edit-profile-page" aria-labelledby="edit-profile-title">
      <header className="c-edit-profile-page__identity">
        <Avatar name={user.name} avatarKey={user.settings.avatarKey} size="lg" />
        <h1 id="edit-profile-title" className="c-edit-profile-page__name">{user.name}</h1>
        <p className="c-edit-profile-page__email">{user.email}</p>
        {user.pendingEmail && (
          <p className="c-edit-profile-page__pending-email">
            Pendiente de confirmar: {user.pendingEmail}
          </p>
        )}
      </header>

      <nav className="c-edit-profile-page__menu" aria-label="Opciones de edición">
        {EDIT_LINKS.map((item) => (
          <Link key={item.to} to={item.to} className="c-edit-profile-page__menu-item">
            <span className="c-edit-profile-page__menu-label">{item.label}</span>
            <TbChevronRight
              className="c-icon c-icon--md c-edit-profile-page__menu-chevron"
              aria-hidden="true"
            />
          </Link>
        ))}
        <Link
          to={ROUTES.deleteAccount}
          className="c-edit-profile-page__menu-item c-edit-profile-page__menu-item--danger"
        >
          <span className="c-edit-profile-page__menu-label">Eliminar cuenta</span>
          <TbChevronRight
            className="c-icon c-icon--md c-edit-profile-page__menu-chevron"
            aria-hidden="true"
          />
        </Link>
      </nav>
    </section>
  );
}

export default EditProfilePage;
