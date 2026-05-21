import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { mockBlisterApi, seedAuthenticatedState, testBlisterId } from './helpers/blister-fixtures';

const privatePages = [
  { name: 'home', path: '/home' },
  { name: 'appointment form', path: `/blisters/${testBlisterId}/appointments/new` },
  { name: 'accessibility settings', path: '/profile/accessibility' },
];

for (const privatePage of privatePages) {
  test(`private page ${privatePage.name} has no serious or critical axe violations`, async ({ page }) => {
    await mockBlisterApi(page);
    await seedAuthenticatedState(page);

    await page.goto(privatePage.path);
    await expect(page.locator('body')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blockingViolations = results.violations.filter(
      (violation) => violation.impact === 'critical' || violation.impact === 'serious',
    );

    expect(blockingViolations).toEqual([]);
  });
}