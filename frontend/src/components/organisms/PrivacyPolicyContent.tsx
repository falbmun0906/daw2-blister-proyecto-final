type PrivacyPolicySection = {
  title: string;
  paragraphs: string[];
  items?: string[];
};

interface PrivacyPolicyContentProps {
  id?: string;
  titleId?: string;
  className?: string;
}

const PRIVACY_SECTIONS: PrivacyPolicySection[] = [
  {
    title: 'Responsable y contacto',
    paragraphs: [
      'Blíster es una aplicación web progresiva para gestionar medicación, tratamientos, citas y tomas dentro de blísteres personales o compartidos. El proyecto está publicado en GitHub y el canal de contacto para privacidad, soporte y ejercicio de derechos es soporte@miblister.es.',
      'No se muestran aquí datos fiscales, NIF, domicilio social ni delegado de protección de datos porque no constan en el repositorio. La política evita inventarlos y usa el canal de contacto facilitado para cualquier identificación adicional exigible en producción.',
    ],
  },
  {
    title: 'Normativa aplicable',
    paragraphs: [
      'El tratamiento se orienta al Reglamento (UE) 2016/679, RGPD, a la Ley Orgánica 3/2018 de Protección de Datos Personales y garantía de los derechos digitales, y a la Ley 34/2002 de servicios de la sociedad de la información cuando sea aplicable.',
      'Los datos sobre medicación, tratamientos, citas y adherencia pueden revelar información de salud y se tratan como categorías especiales de datos del artículo 9 del RGPD. Por eso el registro exige consentimiento explícito y confirmación de mayoría de edad sin casillas premarcadas.',
    ],
  },
  {
    title: 'Datos tratados',
    paragraphs: [
      'Blíster trata los datos necesarios para prestar el servicio y mantener la seguridad de la cuenta.',
    ],
    items: [
      'Identidad y acceso: nombre, nombre de usuario, correo electrónico, contraseña hasheada, tokens de sesión o recuperación hasheados y metadatos de seguridad.',
      'Preferencias: tema, tamaño de texto, fuente accesible, avatar y ajustes de notificaciones.',
      'Datos del blíster: nombre del espacio, miembros, roles, invitaciones y estado de borrado lógico.',
      'Datos de salud gestionados por la persona usuaria: medicinas, alias, stock, caducidad, unidad, tratamientos, citas, comentarios y registros de toma.',
      'Integración oficial CIMA/AEMPS: número de registro, nombre oficial, forma farmacéutica, estado, alertas oficiales y enlaces a prospecto o ficha técnica.',
      'Notificaciones: avisos internos, suscripciones push del navegador y metadatos necesarios para enviarlas o revocarlas.',
      'Integraciones MCP/OAuth: tokens, scopes y fechas de uso cuando la persona usuaria autoriza un asistente externo.',
    ],
  },
  {
    title: 'Finalidades y base jurídica',
    paragraphs: [
      'La base principal es el consentimiento explícito para tratar datos de salud y la ejecución del servicio solicitado para crear cuenta, mantener blísteres, coordinar cuidados, registrar tomas y mostrar recordatorios.',
      'También se tratan datos por interés legítimo en seguridad, prevención de abuso, diagnóstico técnico y conservación de trazas mínimas; y por obligación legal cuando corresponda atender derechos o requerimientos de autoridades.',
    ],
  },
  {
    title: 'Blísteres compartidos',
    paragraphs: [
      'Al aceptar una invitación a un blíster compartido, los miembros con permisos pueden ver la información necesaria para coordinar medicación, tratamientos, citas, stock y tomas. Los roles OWNER, CAREGIVER y OBSERVER limitan qué acciones puede realizar cada persona.',
      'Antes de invitar a otra persona, asegúrate de que existe una relación legítima de cuidado o convivencia y de que esa persona entiende qué información será visible dentro del blíster.',
    ],
  },
  {
    title: 'Cesiones, encargados y servicios externos',
    paragraphs: [
      'Blíster no vende datos personales, no usa publicidad comportamental y no utiliza datos de salud para entrenar modelos públicos.',
      'La aplicación puede apoyarse en proveedores técnicos necesarios, como alojamiento, base de datos, correo transaccional, servicios web push del navegador y repositorios de código. Estos servicios actúan como encargados o infraestructuras técnicas según su función.',
      'Las consultas a CIMA/AEMPS se usan para obtener información oficial de medicamentos. Blíster no replica prospectos ni fichas técnicas: enlaza fuentes oficiales vigentes cuando están disponibles.',
      'Si autorizas MCP/OAuth, un cliente externo podrá recibir los datos necesarios para la acción solicitada. Ese cliente externo tiene su propia política de privacidad y el acceso puede revocarse desde la aplicación.',
    ],
  },
  {
    title: 'Conservación y borrado',
    paragraphs: [
      'Los datos se conservan mientras la cuenta o el blíster estén activos y sean necesarios para el servicio. Las credenciales y tokens temporales tienen caducidad y se guardan hasheados cuando procede.',
      'El borrado de cuenta o de blíster aplica una ventana de recuperación de 15 días mediante borrado lógico. Pasado ese plazo, el proceso de purga elimina físicamente los datos asociados según la arquitectura del proyecto.',
    ],
  },
  {
    title: 'Medidas de seguridad',
    paragraphs: [
      'El proyecto aplica privacidad desde el diseño: contraseñas con bcrypt, refresh tokens hasheados, validación Zod, sanitización de entradas, Helmet, CORS por origen, control de pertenencia por blisterId y autorización por rol antes de operaciones de escritura.',
      'En despliegue, las comunicaciones deben realizarse mediante HTTPS/TLS. Aun así, ninguna aplicación puede garantizar riesgo cero, por lo que se recomienda no compartir códigos de invitación fuera de canales de confianza.',
    ],
  },
  {
    title: 'Derechos RGPD',
    paragraphs: [
      'Puedes solicitar acceso, rectificación, supresión, oposición, limitación, portabilidad y retirada del consentimiento escribiendo a soporte@miblister.es desde el correo asociado a la cuenta.',
      'Si consideras que no se ha atendido correctamente una solicitud, puedes reclamar ante la Agencia Española de Protección de Datos, AEPD, en aepd.es.',
    ],
  },
  {
    title: 'Menores, consejo médico y GitHub',
    paragraphs: [
      'Blíster está orientada a personas mayores de 18 años. La información de medicamentos y recordatorios ayuda a organizar cuidados, pero no sustituye el diagnóstico, la prescripción ni el consejo de profesionales sanitarios.',
      'El código fuente publicado en GitHub no debe usarse para publicar incidencias con datos personales o sanitarios reales. Para privacidad o soporte, usa soporte@miblister.es.',
    ],
  },
];

export function PrivacyPolicyContent({ id, titleId = 'privacy-title', className }: PrivacyPolicyContentProps) {
  return (
    <section
      id={id}
      className={['c-privacy-page', className].filter(Boolean).join(' ')}
      aria-labelledby={titleId}
    >
      <header className="c-privacy-page__header">
        <p className="c-privacy-page__meta">Última actualización: mayo de 2026</p>
        <h1 id={titleId} className="c-privacy-page__title">
          Política de privacidad
        </h1>
        <p className="c-privacy-page__intro">
          Esta política resume cómo Blíster trata datos personales y datos de salud para prestar el servicio de gestión de medicación familiar en España.
        </p>
      </header>

      <div className="c-privacy-page__sections">
        {PRIVACY_SECTIONS.map((section) => (
          <section key={section.title} className="c-privacy-page__section">
            <h2 className="c-privacy-page__section-title">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="c-privacy-page__section-body">
                {paragraph}
              </p>
            ))}
            {section.items ? (
              <ul className="c-privacy-page__list">
                {section.items.map((item) => (
                  <li key={item} className="c-privacy-page__item">
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </section>
  );
}