import path from 'node:path';

import { expect, test } from '@playwright/test';

import {
  ensureEvidenceDirectory,
  mockBlisterApi,
  seedAuthenticatedState,
} from './helpers/blister-fixtures';

const viewports = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1280', width: 1280, height: 900 },
];

for (const viewport of viewports) {
  test(`home remains responsive at ${viewport.name}`, async ({ page }) => {
    await mockBlisterApi(page);
    await seedAuthenticatedState(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    await page.goto('/home');
    await expect(page.getByRole('heading', { name: 'Blíster', exact: true })).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => (
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    ));
    expect(hasHorizontalOverflow).toBe(false);

    const directory = await ensureEvidenceDirectory();
    await page.screenshot({
      path: path.join(directory, `responsive-home-${viewport.name}.png`),
      fullPage: true,
    });
  });
}