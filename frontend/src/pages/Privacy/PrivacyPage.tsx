import { usePageTitle } from '../../hooks/use.page-title';

const PRIVACY_SECTIONS = [
  {
    title: 'Datos que usa Blíster',
    body: 'Guardamos los datos necesarios para la cuenta, los blísteres compartidos, medicamentos, tratamientos, citas, tomas registradas, notificaciones y preferencias de accesibilidad.',
  },
  {
    title: 'Cookies y almacenamiento local',
    body: 'Usamos almacenamiento local para mantener la sesión, recordar preferencias de uso y mejorar la experiencia de la PWA. No se usan cookies publicitarias dentro de la aplicación.',
  },
  {
    title: 'Blísteres compartidos',
    body: 'Cuando te unes a un blíster, otros miembros autorizados pueden ver la información necesaria para coordinar medicación, tratamientos, citas y tomas.',
  },
  {
    title: 'Asistente de IA',
    body: 'Si vinculas un asistente mediante MCP, el token permite acceder a tus datos de salud desde ese asistente. Puedes revocar esos accesos en cualquier momento desde Perfil.',
  },
  {
    title: 'Derechos RGPD',
    body: 'Puedes solicitar acceso, rectificación, eliminación, limitación u oposición al tratamiento de tus datos. También puedes retirar consentimientos y revocar accesos externos.',
  },
];

function PrivacyPage() {
  usePageTitle('Privacidad');

  return (
    <section className="c-privacy-page" aria-labelledby="privacy-title">
      <header className="c-privacy-page__header">
        <h1 id="privacy-title" className="c-privacy-page__title">
          Privacidad y datos
        </h1>
        <p className="c-privacy-page__intro">
          Blíster trata información sensible de salud. Esta pantalla resume qué datos se usan
          y dónde puedes controlar accesos y preferencias dentro de la aplicación.
        </p>
      </header>

      <div className="c-privacy-page__sections">
        {PRIVACY_SECTIONS.map((section) => (
          <section key={section.title} className="c-privacy-page__section">
            <h2 className="c-privacy-page__section-title">{section.title}</h2>
            <p className="c-privacy-page__section-body">{section.body}</p>
          </section>
        ))}
      </div>
    </section>
  );
}

export default PrivacyPage;
