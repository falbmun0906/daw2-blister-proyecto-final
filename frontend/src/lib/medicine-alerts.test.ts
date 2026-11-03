import { describe, expect, it } from 'vitest';
import { getMedicineAlerts } from './medicine-alerts';
import type { Medicine } from '../types/medicine.types';

const custom: Medicine = {
  _id: 'a'.repeat(24),
  blisterId: 'b'.repeat(24),
  source: 'custom',
  customDetails: { productType: 'supplement' },
  nombre: 'Magnesio',
  nregist: null,
  pactivos: null,
  formaOficial: null,
  dosisOficial: null,
  cimaStatus: null,
  iconType: 'capsule',
  stock: 2,
  stockUnit: 'pastillas',
  threshold: 5,
  expDate: null,
};

describe('custom inventory alerts', () => {
  it('keeps stock alerts without manufacturing official status or expiry', () => {
    expect(getMedicineAlerts(custom)).toEqual([{ kind: 'stock-low', label: 'Stock bajo' }]);
  });
  it('still warns about a known expired custom product', () => {
    expect(
      getMedicineAlerts({ ...custom, expDate: '2000-01-01' }).map((alert) => alert.kind),
    ).toEqual(['stock-low', 'expired']);
  });
});
