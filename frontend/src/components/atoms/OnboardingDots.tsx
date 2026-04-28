interface OnboardingDotsProps {
  activeIndex: number;
  count: number;
  onSelect: (index: number) => void;
}

export function OnboardingDots({ activeIndex, count, onSelect }: OnboardingDotsProps) {
  return (
    <div className="c-onboarding-dots" aria-label="Progreso del onboarding">
      {Array.from({ length: count }).map((_, index) => (
        <button
          key={index}
          type="button"
          className={[
            'c-onboarding-dots__dot',
            index === activeIndex && 'c-onboarding-dots__dot--active',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => onSelect(index)}
          aria-label={`Ir a la pantalla ${index + 1}`}
          aria-current={index === activeIndex ? 'true' : undefined}
        />
      ))}
    </div>
  );
}