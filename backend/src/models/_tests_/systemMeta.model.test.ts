import { SystemMetaModel } from '../systemMeta.model';

describe('SystemMetaModel', () => {
  it('starts the synchronization state as idle', () => {
    const systemMeta = new SystemMetaModel({});

    expect(systemMeta.validateSync()).toBeUndefined();
    expect(systemMeta.syncStatus).toBe('idle');
    expect(systemMeta.lastCimaSync).toBeInstanceOf(Date);
  });
});
