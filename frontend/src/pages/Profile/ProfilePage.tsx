import { Link } from 'react-router-dom';
import { TbChevronRight } from 'react-icons/tb';

import { Avatar } from '../../components/atoms/Avatar';
import { ROUTES } from '../../constants/routes';
import { usePageTitle } from '../../hooks/use.page-title';
import { useAuthStore } from '../../stores/auth.store';
import { resetAppStores } from '../../stores/reset-stores';

interface ProfileLinkItem {
  to: string;
  label: string;
}

const PROFILE_LINKS: ProfileLinkItem[] = [
  { to: ROUTES.blisters, label: 'Mis blísteres' },
  { to: ROUTES.editProfile, label: 'Editar perfil' },
  { to: ROUTES.notificationSettings, label: 'Notificaciones' },
  { to: ROUTES.mcpToken, label: 'Vincular Asistente de IA (MCP)' },
  { to: ROUTES.accessibility, label: 'Accesibilidad' },
  { to: ROUTES.settings, label: 'Privacidad' },
];

function ProfilePage() {
  usePageTitle('');
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const handleLogout = (): void => {
    resetAppStores();
    clearSession();
  };

  if (!user) return null;

  return (
    <section className="c-profile-page" aria-labelledby="profile-title">
      <header className="c-profile-page__identity">
        <Avatar name={user.name} avatarKey={user.settings.avatarKey} size="lg" />
        <h1 id="profile-title" className="c-profile-page__name">{user.name}</h1>
        <p className="c-profile-page__email">{user.email}</p>
      </header>

      <nav className="c-profile-page__menu" aria-label="Opciones de perfil">
        {PROFILE_LINKS.map((item) => (
          <Link key={item.to} to={item.to} className="c-profile-page__menu-item">
            <span className="c-profile-page__menu-label">{item.label}</span>
            <TbChevronRight
              className="c-icon c-icon--md c-profile-page__menu-chevron"
              aria-hidden="true"
            />
          </Link>
        ))}
      </nav>

      <button
        type="button"
        className="c-profile-page__logout"
        onClick={handleLogout}
      >
        Cerrar sesión
      </button>
    </section>
  );
}

export default ProfilePage;
