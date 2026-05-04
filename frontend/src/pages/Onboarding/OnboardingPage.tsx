import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '../../constants/routes';
import { useUiStore } from '../../stores/ui.store';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Button } from '../../components/atoms/Button';
import { OnboardingDots } from '../../components/atoms/OnboardingDots';
import './OnboardingPage.scss';

type OnboardingSlide = {
  id: number;
  title: string;
  description: string;
  ctaLabel: string;
  image?: string;
  isWelcome?: boolean;
  isLast?: boolean;
  variant?: 'primary' | 'primary-outline' | 'terracotta';
  highlight?: string;          // palabra o frase a colorear
  headingLevel?: 'h1' | 'h2';  // para controlar la semántica
};

const SLIDES: OnboardingSlide[] = [
  {
    id: 0,
    title: 'Bienvenido a Blíster',
    description: 'Gestiona medicación, tratamientos y recordatorios en un único lugar.',
    ctaLabel: 'EMPEZAR',
    isWelcome: true,
    highlight: 'Blíster',
    headingLevel: 'h1',
  },
  {
    id: 1,
    title: 'Información oficial y segura',
    description:
      'Accede al prospecto oficial de la Agencia Española de Medicamentos y Productos Sanitarios (AEMPS).',
    ctaLabel: 'SIGUIENTE',
    image: '/onboarding-3.png',
    highlight: 'segura',
    headingLevel: 'h2',
  },
  {
    id: 2,
    title: 'Cuida de los tuyos',
    description:
      'Gestiona el blíster de toda la familia en un solo lugar: define quién puede registrar tomas y quién solo observar.',
    ctaLabel: 'SIGUIENTE',
    image: '/onboarding-4.png',
    highlight: 'los tuyos',
    headingLevel: 'h2',
  },
  {
    id: 3,
    title: 'Habla con tu blíster',
    description:
      'Blíster es compatible con asistentes de IA. Pregunta "¿qué me toca tomar?" o registra una dosis usando solo tu voz.',
    ctaLabel: 'EMPEZAR AHORA',
    image: '/onboarding-5.png',
    isLast: true,
    variant: 'terracotta',
    highlight: 'Habla',
    headingLevel: 'h2',
  },
];

function renderTitle(slide: OnboardingSlide) {
  const { title, highlight, headingLevel = 'h2' } = slide;

  if (!highlight || !title.includes(highlight)) {
    const Tag = headingLevel;
    return <Tag className="c-onboarding-page__title">{title}</Tag>;
  }

  const [before, after] = title.split(highlight);
  const Tag = headingLevel;

  return (
    <Tag className="c-onboarding-page__title">
      {before}
      <span className="c-onboarding-page__title-accent">{highlight}</span>
      {after}
    </Tag>
  );
}

function OnboardingPage() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const swipeStart = useRef<{ x: number; y: number } | null>(null);
    const setHasSeenOnboarding = useUiStore((state) => state.setHasSeenOnboarding);
    const navigate = useNavigate();

    const slide = SLIDES[currentSlide] ?? SLIDES[0];
    const navTone = currentSlide === 0 || slide.isLast ? 'dark' : 'light';

    const completeOnboarding = useCallback(() => {
        setHasSeenOnboarding(true);
        navigate(ROUTES.login, { replace: true });
    }, [navigate, setHasSeenOnboarding]);

    const handleNext = useCallback(() => {
        if (slide.isLast) {
            completeOnboarding();
            return;
        }

        setCurrentSlide((value) => Math.min(value + 1, SLIDES.length - 1));
    }, [completeOnboarding, slide.isLast]);

    const handlePrevious = useCallback(() => {
        setCurrentSlide((value) => Math.max(value - 1, 0));
    }, []);

    const handleSkip = useCallback(() => {
        completeOnboarding();
    }, [completeOnboarding]);

    const handlePointerDown = (event: React.PointerEvent<HTMLElement>): void => {
        if ((event.target as HTMLElement).closest('button, a, input, textarea, select')) return;
        swipeStart.current = { x: event.clientX, y: event.clientY };
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLElement>): void => {
        if (!swipeStart.current) return;
        const deltaX = event.clientX - swipeStart.current.x;
        const deltaY = event.clientY - swipeStart.current.y;
        swipeStart.current = null;

        if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;
        if (deltaX < 0) {
            handleNext();
            return;
        }
        handlePrevious();
    };

    return (
        <AuthLayout
            className="c-onboarding-page"
            surface="plain"
            innerClassName="c-onboarding-page__inner"
        >
            <section
                className="c-onboarding-page__slide"
                aria-label={`Pantalla ${currentSlide + 1} de ${SLIDES.length}`}
                data-nav-tone={navTone}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerCancel={() => {
                    swipeStart.current = null;
                }}
            >
                <header className="c-onboarding-page__header">
                    {currentSlide > 0 ? (
                        <button
                            type="button"
                            className="c-onboarding-page__nav-btn c-onboarding-page__back-btn"
                            onClick={handlePrevious}
                            aria-label="Volver a la pantalla anterior"
                        >
                            Volver
                        </button>
                    ) : (
                        <span className="c-onboarding-page__header-spacer" aria-hidden="true" />
                    )}
                    {!slide.isLast ? (
                        <button
                            type="button"
                            className="c-onboarding-page__nav-btn c-onboarding-page__skip-btn"
                            onClick={handleSkip}
                            aria-label="Omitir onboarding"
                        >
                            Omitir
                        </button>
                    ) : (
                        <span className="c-onboarding-page__header-spacer" aria-hidden="true" />
                    )}
                </header>

                {slide.isWelcome ? (
                    <div className="c-onboarding-page__content c-onboarding-page__content--welcome">
                        <div className="c-onboarding-page__welcome-block c-onboarding-page__welcome-block--top">
                            <p className="c-onboarding-page__brand-title">Blíster</p>
                            <img
                                src="/logo.png"
                                alt="Logotipo de Blíster"
                                className="c-onboarding-page__logo"
                                width={192}
                                height={192}
                            />
                        </div>

                        <div className="c-onboarding-page__welcome-block c-onboarding-page__welcome-block--bottom">
                            {renderTitle(slide)}
                            <p className="c-onboarding-page__description">{slide.description}</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="c-onboarding-page__image-frame">
                            <img
                                src={slide.image}
                                alt={slide.title}
                                className="c-onboarding-page__image"
                                loading="eager"
                            />
                        </div>

                        <div className="c-onboarding-page__content">
                            {renderTitle(slide)}
                            <p className="c-onboarding-page__description">{slide.description}</p>
                        </div>
                    </>
                )}

                <div className="c-onboarding-page__footer">
                    <OnboardingDots
                        activeIndex={currentSlide}
                        count={SLIDES.length}
                        onSelect={setCurrentSlide}
                    />
                    <Button
                        key={slide.id}
                        type="button"
                        variant={slide.variant ?? 'primary'}
                        fullWidth
                        className="c-onboarding-page__cta"
                        onClick={handleNext}
                        onPointerUp={(event) => event.currentTarget.blur()}
                    >
                        {slide.ctaLabel}
                    </Button>
                </div>
            </section>
        </AuthLayout>
    );
}

export default OnboardingPage;
