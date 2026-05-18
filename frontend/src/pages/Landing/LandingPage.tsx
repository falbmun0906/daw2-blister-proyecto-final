// src/pages/Landing/LandingPage.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TbFileText, TbCode } from 'react-icons/tb';
import heroImg from '/pwa-512x512.png';
import appStoreImg from '/app-store.png';
import playStoreImg from '/play-store.png';
import { syncThemeColorWithSections } from '../../lib/themeColor';
import { ROUTES } from '../../constants/routes';
import { useUiStore } from '../../stores/ui.store';

function LandingPage() {
    const navigate = useNavigate();
    const enableOnboardingReplay = useUiStore((s) => s.enableOnboardingReplay);

    useEffect(() => {
        return syncThemeColorWithSections()
    }, [])

    const handleTryNow = () => {
        enableOnboardingReplay();
        navigate(ROUTES.onboarding);
    };

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
                            <TbFileText className="c-icon c-icon--xl" aria-hidden="true" />
                        </div>

                        <h2 className="c-landing-page__panel-title">Documentación</h2>
                        <p className="c-landing-page__panel-description">
                            Conoce el origen y la visión funcional del proyecto.
                        </p>

                        <ul className="c-landing-page__panel-list">
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
                            <TbCode className="c-icon c-icon--xl" aria-hidden="true" />
                        </div>

                        <h2 className="c-landing-page__panel-title">Código fuente</h2>
                        <p className="c-landing-page__panel-description">
                            Sigue la evolución del proyecto y su desarrollo técnico.
                        </p>

                        <ul className="c-landing-page__panel-list">
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
                            <li>
                                <button
                                    type="button"
                                    className="c-landing-page__panel-link"
                                    onClick={handleTryNow}
                                >
                                    Probar ahora
                                </button>
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
