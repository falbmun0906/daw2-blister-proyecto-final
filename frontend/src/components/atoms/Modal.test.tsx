import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, expect, it } from 'vitest';
import { Modal } from './Modal';

afterEach(cleanup);

it('confines keyboard focus, makes the background inert and restores the opener on Escape', async () => {
  const user = userEvent.setup();
  function Fixture() {
    const [open, setOpen] = useState(false);
    return <><button onClick={() => setOpen(true)}>Abrir</button><button>Fondo</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Confirmación">
        <input aria-label="Nombre" /><button>Guardar</button>
      </Modal></>;
  }
  render(<Fixture />);
  const opener = screen.getByRole('button', { name: 'Abrir' });
  await user.click(opener);
  expect(screen.getByRole('dialog', { name: 'Confirmación' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveFocus();
  expect(opener.closest('[inert]')).not.toBeNull();
  await user.tab({ shift: true });
  expect(screen.getByRole('button', { name: 'Guardar' })).toHaveFocus();
  await user.tab();
  expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveFocus();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(opener).toHaveFocus();
  expect(opener.closest('[inert]')).toBeNull();
});
