import heroImg from '/pwa-512x512.png'
import appStoreImg from '/app-store.png'
import playStoreImg from '/play-store.png'
import './App.css'

function App() {
  return (
    <>
      <section id="center">
        <img
          src={heroImg}
          className="hero"
          width="220"
          height="220"
          alt="Imagen principal de Blíster"
        />

        <div className="hero-copy">
          <p className="eyebrow">PWA sanitaria · Próximamente</p>
          <h1>
            Toma el control de tu <span>salud</span> con Blíster.
          </h1>
          <p className="subtitle">
            Gestiona medicación, tratamientos y recordatorios en un único lugar,
            compartido con tu familia y conectado a fuentes oficiales.
          </p>
        </div>

        <div className="store-badge">
          <p>Próximamente disponible en</p>
          <div className="store-badge-row">
            <img
              src={appStoreImg}
              alt="Disponible en App Store"
              width="150"
              height="45"
            />
            <img
              src={playStoreImg}
              alt="Disponible en Google Play"
              width="150"
              height="45"
            />
          </div>
        </div>
      </section>

      <div className="ticks" />

      <section id="next-steps">
        <div id="docs">
          <div className="section-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="M7 3.75h7l4.25 4.25V20.25H7z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14 3.75v4.5h4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9.5 12h5M9.5 15.5h5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <h2>Documentación</h2>
          <p>Conoce el origen y la visión funcional del proyecto.</p>

          <ul>
            <li>
              <a href="https://github.com/falbmun0906/daw2-blister-proyecto-final/blob/main/docs/01-introduccion.md" rel="noreferrer">
                01 · Introducción
              </a>
            </li>
            <li>
              <a href="https://github.com/falbmun0906/daw2-blister-proyecto-final/blob/main/docs/02-descripcion.md" target="_blank" rel="noreferrer">
                02 · Descripción funcional
              </a>
            </li>
          </ul>
        </div>

        <div id="social">
          <div className="section-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h2>Código fuente</h2>
          <p>Sigue la evolución del proyecto y su desarrollo técnico.</p>

          <ul>
            <li>
              <a
                href="https://github.com/falbmun0906/daw2-blister-proyecto-final"
                target="_blank"
                rel="noreferrer"
              >
                Repositorio en GitHub
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks" />
      <section id="spacer" />
    </>
  )
}

export default App