import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('public entry renders and has no critical accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  const criticalViolations = accessibilityScanResults.violations.filter(
    (violation) => violation.impact === 'critical',
  );

  expect(criticalViolations).toEqual([]);
});
