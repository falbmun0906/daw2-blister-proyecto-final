import { expect, test } from '@playwright/test';

import {
  mockBlisterApi,
  seedAuthenticatedState,
  seedSeenOnboarding,
  testBlisterId,
  testUserId,
} from './helpers/blister-fixtures';

test('login stores a session and reaches the authenticated home', async ({ page }) => {
  await mockBlisterApi(page);
  await seedSeenOnboarding(page);

  await page.goto('/login');
  await page.getByLabel('Usuario o correo electrónico').fill('ana@example.com');
  await page.getByLabel('Contraseña').fill('Password1!');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole('heading', { name: 'Blíster', exact: true })).toBeVisible();
});

test('registration stores a session after required privacy consents', async ({ page }) => {
  await mockBlisterApi(page);
  await seedSeenOnboarding(page);

  await page.goto('/register');
  await page.getByLabel('Nombre completo').fill('Ana Lopez');
  await page.getByLabel('Nombre de usuario').fill('ana.lopez');
  await page.getByLabel('Correo electronico').fill('ana@example.com');
  await page.locator('input[name="password"]').fill('Password1!');
  await page.locator('input[name="confirmPassword"]').fill('Password1!');
  await page.getByLabel(/Acepto la/).check();
  await page.getByLabel('Confirmo que tengo 18 años o mas').check();
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole('heading', { name: 'Blíster', exact: true })).toBeVisible();
});

test('authenticated caregiver flow creates a medical appointment', async ({ page }) => {
  let submittedPayload: unknown = null;
  await mockBlisterApi(page, { onAppointmentCreate: (payload) => { submittedPayload = payload; } });
  await seedAuthenticatedState(page, 'CAREGIVER');

  await page.goto(`/blisters/${testBlisterId}/appointments/new`);
  await page.getByLabel('Título').fill('Consulta de seguimiento');
  await page.getByLabel('Centro o consulta').fill('Centro de salud');
  await page.getByLabel('Notas de la cita').fill('Llevar informe de medicación actualizado');
  await page.getByLabel('Cuándo').fill('2031-05-06T10:30');
  await page.getByRole('button', { name: 'Crear cita' }).click();

  await expect(page).toHaveURL(new RegExp(`/blisters/${testBlisterId}/appointments$`));
  expect(submittedPayload).toMatchObject({
    patientUserId: testUserId,
    title: 'Consulta de seguimiento',
    location: 'Centro de salud',
    description: 'Llevar informe de medicación actualizado',
    treatmentId: null,
  });
});

test('observer users cannot access appointment mutation forms', async ({ page }) => {
  await mockBlisterApi(page, { role: 'OBSERVER' });
  await seedAuthenticatedState(page, 'OBSERVER');

  await page.goto(`/blisters/${testBlisterId}/appointments/new`);

  await expect(page).toHaveURL(new RegExp(`/blisters/${testBlisterId}/appointments$`));
});