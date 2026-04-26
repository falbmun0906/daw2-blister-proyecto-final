import heroImg from '/pwa-512x512.png'
import appStoreImg from '/app-store.png'
import playStoreImg from '/play-store.png'
import './App.css'

function App() {
  return (
    <>
      <section id="center">
        <div className="hero">
          <img
            src={heroImg}
            className="base"
            width="170"
            height="170"
            alt="Icono de la PWA Blíster"
          />
        </div>

        <div>
          <p className="eyebrow">PWA sanitaria · Próximamente</p>
          <h1>Blíster</h1>
          <p className="subtitle">
            Gestiona medicación, tratamientos y recordatorios en un único lugar,
            compartido con tu familia y conectado a fuentes oficiales de
            medicamentos.
          </p>
        </div>

        <div className="store-badge">
          <p>Próximamente disponible en</p>
          <div className="store-badge-row">
            <img
              src={appStoreImg}
              alt="Disponible en App Store"
              width={150}
              height={45}
            />
            <img
              src={playStoreImg}
              alt="Disponible en Google Play"
              width={150}
              height={45}
            />
          </div>
        </div>
      </section>

      <div className="ticks" />

      <section id="next-steps">
        <div id="docs">
          <h2>Documentación</h2>
          <p>Conoce el origen y la visión funcional del proyecto.</p>
          <ul>
            <li>
              <a href="/docs/01-introduccion.html" target="_blank">
                01 · Introducción
              </a>
            </li>
            <li>
              <a href="/docs/02-descripcion.html" target="_blank">
                02 · Descripción funcional
              </a>
            </li>
          </ul>
        </div>

        <div id="social">
          <h2>Código fuente</h2>
          <p>Sigue la evolución del proyecto y su desarrollo técnico.</p>
          <ul>
            <li>
              <a
                href="https://github.com/tu-usuario/tu-repo-blister"
                target="_blank"
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