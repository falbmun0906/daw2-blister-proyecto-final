import { useCallback, useState } from 'react';
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
  variant?: 'primary' | 'primary-outline';
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
    variant: 'primary-outline',
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
    const setHasSeenOnboarding = useUiStore((state) => state.setHasSeenOnboarding);
    const navigate = useNavigate();

    const slide = SLIDES[currentSlide] ?? SLIDES[0];

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

    const handleSkip = useCallback(() => {
        completeOnboarding();
    }, [completeOnboarding]);

    const isOverlaySkip = !slide.isWelcome && !slide.isLast;

    return (
        <AuthLayout
            className="c-onboarding-page"
            surface="plain"
            innerClassName="c-onboarding-page__inner"
        >
            <section
                className="c-onboarding-page__slide"
                aria-label={`Pantalla ${currentSlide + 1} de ${SLIDES.length}`}
            >
                <header className="c-onboarding-page__header">
                    <button
                        type="button"
                        className={
                            'c-onboarding-page__skip-btn' +
                            (isOverlaySkip ? ' c-onboarding-page__skip-btn--overlay' : '')
                        }
                        onClick={handleSkip}
                        aria-label="Omitir onboarding"
                    >
                        Omitir
                    </button>
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
                        type="button"
                        variant={slide.variant ?? 'primary'}
                        fullWidth
                        className="c-onboarding-page__cta"
                        onClick={handleNext}
                    >
                        {slide.ctaLabel}
                    </Button>
                </div>
            </section>
        </AuthLayout>
    );
}

export default OnboardingPage;