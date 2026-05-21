import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders contextual copy and optional actions', async () => {
    const onCtaClick = vi.fn();
    const user = userEvent.setup();

    render(
      <EmptyState
        title="Sin medicamentos"
        description="Aún no hay medicamentos en este blíster."
        ctaLabel="Añadir"
        onCtaClick={onCtaClick}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Sin medicamentos' })).toBeInTheDocument();
    expect(screen.getByText('Aún no hay medicamentos en este blíster.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Añadir' }));

    expect(onCtaClick).toHaveBeenCalledTimes(1);
  });
});
