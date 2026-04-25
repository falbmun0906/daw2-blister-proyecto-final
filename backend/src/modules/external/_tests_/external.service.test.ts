import {
  externalGetMedicineInfo,
  externalSearchMedicines,
} from '../external.service';

describe('external.service', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockFetch = (payload: unknown, status = 200): void => {
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn().mockResolvedValue(
        new Response(JSON.stringify(payload), {
          status,
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      ),
    });
  };

  it('maps CIMA search results to the public search contract', async () => {
    mockFetch([
      {
        nregistro: '600001',
        nombre: 'Paracetamol',
        pactivos: 'Paracetamol',
        labtitular: 'Lab',
        formaFarmaceutica: {
          nombre: 'COMPRIMIDO',
        },
        dosis: '500 mg',
      },
    ]);

    const result = await externalSearchMedicines('paraceta');

    expect(result).toEqual([
      {
        nregist: '600001',
        nombre: 'Paracetamol',
        pactivos: 'Paracetamol',
        labtitular: 'Lab',
        formaOficial: 'COMPRIMIDO',
        dosisOficial: '500 mg',
      },
    ]);
  });

  it('maps full CIMA info including derived cimaStatus', async () => {
    mockFetch({
      nregistro: '700001',
      nombre: 'Ibuprofeno',
      pactivos: 'Ibuprofeno',
      formaFarmaceutica: {
        nombre: 'COMPRIMIDO',
      },
      formaFarmaceuticaSimplificada: {
        nombre: 'COMPRIMIDO',
      },
      dosis: '600 mg',
      psum: true,
      notas: true,
      estado: {
        rev: 1234567,
      },
      docs: [{ tipo: 1, url: 'https://example.test/ft' }],
      fotos: [{ url: 'https://example.test/photo' }],
      comerc: true,
    });

    const result = await externalGetMedicineInfo('700001');

    expect(result.nregist).toBe('700001');
    expect(result.cimaStatus).toEqual({
      estado: 3,
      psum: true,
      hasAlerts: true,
    });
    expect(result.fotos).toHaveLength(1);
  });

  it('throws a not-found domain error when CIMA has no match', async () => {
    mockFetch([]);

    await expect(externalGetMedicineInfo('800001')).rejects.toMatchObject({
      code: 'CIMA_MEDICINE_NOT_FOUND',
    });
  });

  it('throws an upstream error when CIMA is unavailable', async () => {
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn().mockRejectedValue(new Error('network down')),
    });

    await expect(externalSearchMedicines('nolotil')).rejects.toMatchObject({
      code: 'CIMA_UNAVAILABLE',
    });
  });
});
