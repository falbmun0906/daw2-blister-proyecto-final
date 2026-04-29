import { Link } from 'react-router-dom';

import { Avatar } from '../../components/atoms/Avatar';
import { ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../stores/auth.store';
import './ProfilePage.scss';

interface ProfileLinkItem {
  to: string;
  label: string;
  description: string;
}

const PROFILE_LINKS: ProfileLinkItem[] = [
  { to: ROUTES.editProfile, label: 'Editar datos', description: 'Nombre, usuario y correo' },
  { to: ROUTES.changePassword, label: 'Cambiar contraseña', description: 'Mínimo 8 caracteres y un símbolo' },
  { to: ROUTES.profileAvatar, label: 'Cambiar avatar', description: 'Personaliza tu foto de perfil' },
  { to: ROUTES.accessibility, label: 'Accesibilidad', description: 'Tema, fuente y tamaño del texto' },
  { to: ROUTES.mcpToken, label: 'Token MCP', description: 'Conecta agentes externos' },
];

function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);

  if (!user) return null;

  return (
    <section className="c-profile-page" aria-labelledby="profile-title">
      <header className="c-profile-page__header">
        <Avatar name={user.name} avatarKey={user.settings.avatarKey} size="lg" />
        <div className="c-profile-page__identity">
          <h1 id="profile-title" className="c-profile-page__name">{user.name}</h1>
          <p className="c-profile-page__email">{user.email}</p>
        </div>
      </header>

      <nav className="c-profile-page__menu" aria-label="Opciones de perfil">
        {PROFILE_LINKS.map((item) => (
          <Link key={item.to} to={item.to} className="c-profile-page__menu-item">
            <span className="c-profile-page__menu-label">{item.label}</span>
            <span className="c-profile-page__menu-description">{item.description}</span>
          </Link>
        ))}
      </nav>

      <button
        type="button"
        className="c-profile-page__logout"
        onClick={clearSession}
      >
        Cerrar sesión
      </button>
    </section>
  );
}

export default ProfilePage;
