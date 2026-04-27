import { useEffect } from 'react'
import heroImg from '/pwa-512x512.png'
import appStoreImg from '/app-store.png'
import playStoreImg from '/play-store.png'
import './LandingPage.scss'
import { syncThemeColorWithSections } from '../../lib/themeColor'

function LandingPage() {
  useEffect(() => {
    return syncThemeColorWithSections()
  }, [])

  return (
    <main className="c-landing-page" data-theme-sync data-theme-color="#f5f5f5">
      <div className="c-landing-page__frame">
        <section className="c-landing-page__hero">
          <img
            src={heroImg}
            className="c-landing-page__hero-image"
            width="220"
            height="220"
            alt="Imagen principal de Blíster"
          />

          <div className="c-landing-page__copy">
            <p className="c-landing-page__eyebrow">PWA sanitaria · Próximamente</p>
            <h1 className="c-landing-page__title">
              Toma el control de tu{' '}
              <span className="c-landing-page__title-accent">salud</span> con Blíster.
            </h1>
            <p className="c-landing-page__subtitle">
              Gestiona medicación, tratamientos y recordatorios en un único lugar,
              compartido con tu familia y conectado a fuentes oficiales.
            </p>
          </div>

          <div className="c-landing-page__store-badge">
            <p className="c-landing-page__store-label">Disponible en</p>
            <div className="c-landing-page__store-badge-row">
              <img
                src={appStoreImg}
                className="c-landing-page__store-badge-img"
                alt="Disponible en App Store"
                width="150"
                height="45"
              />
              <img
                src={playStoreImg}
                className="c-landing-page__store-badge-img"
                alt="Disponible en Google Play"
                width="150"
                height="45"
              />
            </div>
          </div>
        </section>

        <div className="c-landing-page__divider" />

        <section
          className="c-landing-page__grid"
          aria-label="Enlaces de proyecto"
        >
          <article className="c-landing-page__panel c-landing-page__panel--docs">
            <div className="c-landing-page__panel-icon" aria-hidden="true">
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

            <h2 className="c-landing-page__panel-title">Documentación</h2>
            <p className="c-landing-page__panel-description">
              Conoce el origen y la visión funcional del proyecto.
            </p>

            <ul className="c-landing-page__panel-list" role="list">
              <li>
                <a
                  className="c-landing-page__panel-link"
                  href="https://github.com/falbmun0906/daw2-blister-proyecto-final/blob/main/docs/01-introduccion.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  01 · Introducción
                </a>
              </li>
              <li>
                <a
                  className="c-landing-page__panel-link"
                  href="https://github.com/falbmun0906/daw2-blister-proyecto-final/blob/main/docs/02-descripcion.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  02 · Descripción funcional
                </a>
              </li>
            </ul>
          </article>

          <article className="c-landing-page__panel">
            <div className="c-landing-page__panel-icon" aria-hidden="true">
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

            <h2 className="c-landing-page__panel-title">Código fuente</h2>
            <p className="c-landing-page__panel-description">
              Sigue la evolución del proyecto y su desarrollo técnico.
            </p>

            <ul className="c-landing-page__panel-list" role="list">
              <li>
                <a
                  className="c-landing-page__panel-link"
                  href="https://github.com/falbmun0906/daw2-blister-proyecto-final"
                  target="_blank"
                  rel="noreferrer"
                >
                  Repositorio en GitHub
                </a>
              </li>
            </ul>
          </article>
        </section>

        <div className="c-landing-page__divider" />
        <div className="c-landing-page__spacer" />
      </div>
    </main>
  )
}

export default LandingPage