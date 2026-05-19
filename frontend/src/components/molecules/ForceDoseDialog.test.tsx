import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ForceDoseDialog } from './ForceDoseDialog';

describe('ForceDoseDialog', () => {
  it('uses the shared modal panel and requires a note before confirming', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(<ForceDoseDialog isOpen onConfirm={onConfirm} onCancel={vi.fn()} />);

    expect(document.querySelector('.c-modal__panel')).not.toBeNull();
    expect(document.querySelector('.c-force-dose-dialog__panel')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Registrar igualmente' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('Indica un motivo para registrar la toma sin stock suficiente.')).toBeTruthy();
  });
});