import { SystemMetaModel } from '../systemMeta.model';

describe('SystemMetaModel', () => {
  it('stores generic global metadata by unique key', () => {
    const systemMeta = new SystemMetaModel({
      key: 'cimaSync',
      value: {
        lastCimaSync: '26/04/2026',
      },
    });

    expect(systemMeta.validateSync()).toBeUndefined();
    expect(systemMeta.key).toBe('cimaSync');
    expect(systemMeta.value).toEqual({
      lastCimaSync: '26/04/2026',
    });
  });
});
