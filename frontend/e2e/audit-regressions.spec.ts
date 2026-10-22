import path from 'node:path';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ensureEvidenceDirectory, mockBlisterApi, seedAuthenticatedState, testBlisterId, testUserId } from './helpers/blister-fixtures';
import { ROUTES } from '../src/constants/routes';

test('shows patient, real dose unit and the forward DST adjustment on mobile', async ({ page }) => {
  await mockBlisterApi(page);
  await seedAuthenticatedState(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.clock.install({ time: new Date('2026-03-29T00:00:00Z') });
  await page.route('**/api/v1/me/upcoming-doses?*', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: [{
    doseAt: '2026-03-29T01:30:00.000Z', displayTime: '03:30', timeZone: 'Europe/Madrid', scheduledTime: '02:30', isTimeAdjusted: true,
    blisterId: testBlisterId, blisterName: 'Casa familiar', blisterAvatarKey: null,
    patientUserId: testUserId, patientName: 'Paciente sintético', patientAvatarKey: null,
    treatmentId: '507f1f77bcf86cd799439014', treatmentTitle: 'Pauta sintética',
    medicineId: '507f1f77bcf86cd799439015', medicineName: 'Medicamento sintético', amount: 2.5, stockUnit: 'ml', callerRole: 'OWNER',
  }] }) }));
  await page.goto('/home');
  const detail = page.getByText(/Paciente sintético · 2.5 ml/);
  await expect(detail).toBeVisible();
  await expect(detail).toContainText('Cambio horario: 02:30 → 03:30 (Europe/Madrid)');
  expect(await page.locator('html').getAttribute('lang')).toBe('es');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);
  await page.screenshot({ path: path.join(await ensureEvidenceDirectory(), 'home-dst-mobile.png'), fullPage: true });
});

test('the account dialog traps focus and restores it to the opener', async ({ page }) => {
  await mockBlisterApi(page);
  await seedAuthenticatedState(page);
  await page.goto(ROUTES.deleteAccount);
  const opener = page.getByRole('button', { name: 'Continuar con la eliminación' });
  await opener.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.locator(':focus')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});
