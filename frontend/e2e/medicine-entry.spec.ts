import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockBlisterApi, seedAuthenticatedState, testBlisterId } from './helpers/blister-fixtures';

const entryUrl = `/blisters/${testBlisterId}/medicines/add`;

test('ignores a late custom save after the user navigates away', async ({ page }) => {
  await mockBlisterApi(page);
  await seedAuthenticatedState(page, 'OWNER');
  let release!: () => void;
  const responseGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started!: () => void;
  const requestStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  await page.route(`**/api/v1/blisters/${testBlisterId}/medicines`, async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    const input = route.request().postDataJSON();
    started();
    await responseGate;
    await route.fulfill({
      status: 201,
      json: {
        success: true,
        data: {
          ...input,
          _id: '507f1f77bcf86cd799439099',
          blisterId: testBlisterId,
          nregist: null,
          pactivos: null,
          formaOficial: null,
          dosisOficial: null,
          cimaStatus: null,
          iconType: 'capsule',
        },
      },
    });
  });
  await page.goto(`${entryUrl}?source=custom`);
  await page.getByLabel('Nombre del producto', { exact: true }).fill('Magnesio');
  await page.getByRole('button', { name: 'Confirmar y añadir producto' }).click();
  await requestStarted;
  await page.getByRole('button', { name: 'Volver atrás', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${entryUrl}$`));
  const response = page.waitForResponse(
    (res) => res.request().method() === 'POST' && res.url().includes('/medicines'),
  );
  release();
  await (await response).finished();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(page.getByRole('button', { name: 'Escanear envase' })).toBeVisible();
  await expect(page.getByText('Producto añadido al botiquín.', { exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`${entryUrl}$`));
});

test('header back returns to the reviewed scan text and then entry options', async ({ page }) => {
  await mockBlisterApi(page);
  await seedAuthenticatedState(page, 'OWNER');
  await page.goto(`${entryUrl}?mode=scan`);
  await page.getByLabel(/^Nombre o Código Nacional/).fill('Magnesio');
  await page.getByRole('button', { name: 'Crear producto personalizado', exact: true }).click();
  await expect(page.getByLabel('Nombre del producto', { exact: true })).toHaveValue('Magnesio');
  await page.getByRole('button', { name: 'Volver atrás', exact: true }).click();
  await expect(page.getByLabel(/^Nombre o Código Nacional/)).toHaveValue('Magnesio');
  await page.getByRole('button', { name: 'Volver atrás', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Escanear envase' })).toBeVisible();
});

test('creates and edits a custom product with unknown expiry without CIMA requests', async ({
  page,
}) => {
  await mockBlisterApi(page);
  await seedAuthenticatedState(page, 'OWNER');
  const calls: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/external/')) calls.push(request.url());
  });
  let stored: Record<string, unknown> | null = null;
  await page.route(`**/api/v1/blisters/${testBlisterId}/medicines**`, async (route) => {
    const method = route.request().method();
    if (method === 'POST') {
      const input = route.request().postDataJSON();
      expect(input).toMatchObject({ source: 'custom', nombre: 'Magnesio', expDate: null });
      expect(input).not.toHaveProperty('nregist');
      stored = {
        ...input,
        _id: '507f1f77bcf86cd799439099',
        blisterId: testBlisterId,
        nregist: null,
        pactivos: null,
        formaOficial: null,
        dosisOficial: null,
        cimaStatus: null,
        iconType: 'capsule',
      };
    }
    if (method === 'PATCH') stored = { ...stored, ...route.request().postDataJSON() };
    await route.fulfill({
      status: method === 'POST' ? 201 : 200,
      json: {
        success: true,
        data: method === 'GET' ? (stored ? [stored] : []) : stored,
        ...(method === 'GET'
          ? { meta: { page: 1, limit: 100, total: stored ? 1 : 0, totalPages: stored ? 1 : 0 } }
          : {}),
      },
    });
  });
  await page.goto(entryUrl);
  await page.getByRole('button', { name: 'Crear producto personalizado', exact: true }).click();
  await page.getByLabel('Nombre del producto', { exact: true }).fill('Magnesio');
  await page.getByLabel('Stock inicial o disponible').fill('30');
  await page.getByText('Marca, formato y composición (opcional)', { exact: true }).click();
  await page.getByLabel(/^Concentración declarada/).fill('200 mg por cápsula');
  await expect(page.getByLabel(/^Fecha de caducidad/)).toHaveValue('');
  expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
  await page.getByText('Marca, formato y composición (opcional)', { exact: true }).click();
  await page.getByLabel('Nombre del producto', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/custom-product-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Confirmar y añadir producto' }).click();
  await page.getByRole('link', { name: /Magnesio, 30/ }).click();
  await expect(page.getByText('Desconocida', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ficha CIMA' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Acciones del medicamento' }).click();
  await page.getByRole('menuitem', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Nombre del producto', { exact: true }).fill('Magnesio noche');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByRole('heading', { name: 'Magnesio noche', exact: true })).toBeVisible();
  expect(calls).toEqual([]);
});

test('observer cannot open any medicine entry form', async ({ page }) => {
  await mockBlisterApi(page, { role: 'OBSERVER' });
  await seedAuthenticatedState(page, 'OBSERVER');
  await page.goto(`${entryUrl}?source=custom`);
  await expect(page).not.toHaveURL(/\/add/);
  await expect(page.getByRole('button', { name: 'Confirmar y añadir producto' })).toHaveCount(0);
});

test('explains a locked product identity while allowing stock and alias edits', async ({
  page,
}) => {
  await mockBlisterApi(page);
  await seedAuthenticatedState(page, 'OWNER');
  const id = '507f1f77bcf86cd799439099';
  let stored = {
    _id: id,
    blisterId: testBlisterId,
    source: 'custom',
    nombre: 'Magnesio',
    identityLocked: true,
    customDetails: { productType: 'supplement', strength: '200 mg' },
    nregist: null,
    pactivos: null,
    formaOficial: null,
    dosisOficial: null,
    cimaStatus: null,
    stock: 30,
    stockUnit: 'pastillas',
    threshold: 5,
    expDate: null,
    iconType: 'capsule',
  };
  await page.route(`**/api/v1/blisters/${testBlisterId}/medicines**`, async (route) => {
    if (route.request().method() === 'PATCH') {
      const payload = route.request().postDataJSON();
      expect(payload).toMatchObject({
        nombre: 'Magnesio',
        customDetails: { productType: 'supplement', strength: '200 mg' },
        stock: 15,
        alias: 'Noche',
      });
      stored = { ...stored, ...payload };
    }
    await route.fulfill({
      json: {
        success: true,
        data: route.request().method() === 'GET' ? [stored] : stored,
        meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
      },
    });
  });
  await page.goto(`/blisters/${testBlisterId}/medicines/${id}/edit`);
  await expect(page.getByLabel('Nombre del producto', { exact: true })).not.toBeEditable();
  await expect(page.getByLabel('Tipo de producto')).toBeDisabled();
  await expect(page.getByText(/La identidad se conserva/)).toBeVisible();
  await page.getByText('Marca, formato y composición (opcional)', { exact: true }).click();
  await expect(page.getByLabel(/^Concentración declarada/)).not.toBeEditable();
  await page.getByLabel('Alias (opcional)').fill('Noche');
  await page.getByLabel('Stock inicial o disponible').fill('15');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByRole('heading', { name: 'Noche', exact: true })).toBeVisible();
});

test('keeps an expired custom product editable without resubmitting its unchanged expiry', async ({
  page,
}) => {
  await mockBlisterApi(page);
  await seedAuthenticatedState(page, 'OWNER');
  const id = '507f1f77bcf86cd799439099';
  let stored = {
    _id: id,
    blisterId: testBlisterId,
    source: 'custom',
    nombre: 'Magnesio',
    customDetails: { productType: 'supplement' },
    nregist: null,
    pactivos: null,
    formaOficial: null,
    dosisOficial: null,
    cimaStatus: null,
    stock: 30,
    stockUnit: 'pastillas',
    threshold: 5,
    expDate: '2020-01-01T00:00:00.000Z',
    iconType: 'pill',
  };
  let patched = false;
  await page.route(`**/api/v1/blisters/${testBlisterId}/medicines**`, async (route) => {
    if (route.request().method() === 'PATCH') {
      const payload = route.request().postDataJSON();
      expect(payload).not.toHaveProperty('expDate');
      stored = { ...stored, ...payload };
      patched = true;
    }
    await route.fulfill({
      json: {
        success: true,
        data: route.request().method() === 'GET' ? [stored] : stored,
        meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
      },
    });
  });
  await page.goto(`/blisters/${testBlisterId}/medicines/${id}/edit`);
  await page.getByLabel('Nombre del producto', { exact: true }).fill('Magnesio editado');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByRole('heading', { name: 'Magnesio editado', exact: true })).toBeVisible();
  expect(patched).toBe(true);
});

test('keeps the photo fallback available after camera permission is denied', async ({ page }) => {
  await mockBlisterApi(page);
  await seedAuthenticatedState(page, 'OWNER');
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException('Denied', 'NotAllowedError');
    };
  });
  await page.goto(entryUrl);
  await page.getByRole('button', { name: 'Escanear envase' }).click();
  await page.getByRole('button', { name: 'Abrir cámara' }).click();
  await expect(
    page.getByText('No se ha permitido acceder a la cámara.', { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel('Elegir fotografía')).toBeEnabled();
  await expect(
    page.getByRole('button', { name: 'Crear producto personalizado', exact: true }),
  ).toBeVisible();
});

test('stops a camera stream whose permission resolves after the scanner is closed', async ({
  page,
}) => {
  await mockBlisterApi(page);
  await seedAuthenticatedState(page, 'OWNER');
  await page.addInitScript(() => {
    const state = window as unknown as { resolveCamera: () => void; stopped: number };
    state.stopped = 0;
    navigator.mediaDevices.getUserMedia = () =>
      new Promise<MediaStream>((resolve) => {
        state.resolveCamera = () =>
          resolve({
            getTracks: () => [
              {
                stop: () => {
                  state.stopped++;
                },
              },
            ],
          } as unknown as MediaStream);
      });
  });
  await page.goto(entryUrl);
  await page.getByRole('button', { name: 'Escanear envase' }).click();
  await page.getByRole('button', { name: 'Abrir cámara' }).click();
  await expect(page.getByRole('button', { name: 'Esperando permiso…' })).toBeVisible();
  await page.getByRole('button', { name: 'Volver a las opciones de alta' }).click();
  await page.evaluate(() => (window as unknown as { resolveCamera: () => void }).resolveCamera());
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { stopped: number }).stopped))
    .toBe(1);
});

test('reads a photograph using the real local OCR worker and requires review before searching or adding', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await mockBlisterApi(page);
  await seedAuthenticatedState(page, 'OWNER');
  // A missing optional barcode bundle must still reach the actual Tesseract engine.
  await page.route('**/assets/medicine-barcode.worker-*.js', (route) => route.abort('failed'));
  await page.setViewportSize({ width: 390, height: 844 });
  const searches: string[] = [];
  const writes: string[] = [];
  const official = {
    nregist: '12345',
    nombre: 'PARACETAMOL 500 mg COMPRIMIDOS',
    pactivos: 'PARACETAMOL',
    labtitular: 'Ejemplo',
    formaOficial: 'COMPRIMIDO',
    formaSimplificada: 'COMPRIMIDO',
    dosisOficial: '500 mg',
    comerc: true,
    psum: false,
    notas: false,
    materialesInf: false,
    docs: [],
    fotos: [],
    atcs: [],
    principiosActivos: [],
    excipientes: [],
    viasAdministracion: [],
    cpresc: null,
    receta: false,
    fechaAutorizacion: null,
    conduc: false,
    triangulo: false,
    cimaStatus: {
      psum: false,
      estado: 1,
      hasAlerts: false,
      comerc: true,
      notas: false,
      materialesInf: false,
    },
  };
  await page.route('**/api/v1/external/search**', (route) =>
    route.fulfill({ json: { success: true, data: [official] } }),
  );
  await page.route('**/api/v1/external/info/12345', (route) =>
    route.fulfill({ json: { success: true, data: official } }),
  );
  await page.route(`**/api/v1/blisters/${testBlisterId}/medicines**`, async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    const payload = route.request().postDataJSON();
    expect(payload).toMatchObject({
      nregist: '12345',
      captureMethod: 'ocr',
      stock: 0,
      stockUnit: 'pastillas',
    });
    expect(payload).not.toHaveProperty('image');
    expect(payload).not.toHaveProperty('customDetails');
    await route.fulfill({
      status: 201,
      json: {
        success: true,
        data: {
          ...official,
          ...payload,
          source: 'cima',
          blisterId: testBlisterId,
          _id: '507f1f77bcf86cd799439099',
          iconType: 'pill',
        },
      },
    });
  });
  page.on('request', (request) => {
    if (request.url().includes('/external/')) searches.push(request.url());
    if (request.method() === 'POST') writes.push(request.url());
  });
  await page.goto(entryUrl);
  await page.getByRole('button', { name: 'Escanear envase' }).click();
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 350;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 1200, 350);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 65px Arial';
    ctx.fillText('PARACETAMOL 500 mg', 60, 150);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.getByLabel('Elegir fotografía').setInputFiles({
    name: 'etiqueta.png',
    mimeType: 'image/png',
    buffer: Buffer.from(base64, 'base64'),
  });
  const resize = page.getByRole('button', { name: 'Ajustar tamaño del recorte' });
  await resize.focus();
  await resize.press('ArrowLeft');
  await expect(page.locator('.c-medicine-scanner__crop')).toHaveCSS('width', /.+/);
  await expect(page.locator('.c-medicine-scanner__crop')).toHaveAttribute('style', /width: 99%/);
  await page.getByRole('button', { name: 'Usar imagen completa' }).click();
  await page.getByRole('button', { name: 'Leer etiqueta o código' }).click();
  await expect(page.getByLabel(/^Nombre o Código Nacional/)).toHaveValue(/PARACETAMOL/i, {
    timeout: 65_000,
  });
  expect(searches).toEqual([]);
  expect(writes).toEqual([]);
  expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'test-results/medicine-scanner-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Buscar coincidencias en CIMA' }).click();
  await page.getByRole('button', { name: /PARACETAMOL 500 mg COMPRIMIDOS/ }).click();
  await expect(page.getByRole('button', { name: 'Confirmar y añadir', exact: true })).toBeVisible();
  expect(writes).toEqual([]);
  await page.getByLabel('Fecha', { exact: true }).fill('2035-01-01');
  await page.getByRole('button', { name: 'Confirmar y añadir', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/blisters/${testBlisterId}/medicines$`));
  expect(writes).toHaveLength(1);
});
