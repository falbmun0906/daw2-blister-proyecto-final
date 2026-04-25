import { type IconType } from '../../types/medicine.types';

const ICON_MATCHERS: Array<{ keywords: string[]; iconType: IconType }> = [
  { keywords: ['COMPRIMIDO', 'TABLETA'], iconType: 'pill' },
  { keywords: ['CAPSULA'], iconType: 'capsule' },
  { keywords: ['JARABE', 'SOLUCION', 'SUSPENSION', 'GOTAS'], iconType: 'liquid' },
  { keywords: ['CREMA', 'POMADA', 'GEL', 'UNGUENTO', 'UNGÜENTO'], iconType: 'cream' },
  { keywords: ['INHALACION', 'INHALADOR'], iconType: 'inhaler' },
  { keywords: ['INYECTABLE', 'INFUSION'], iconType: 'syringe' },
];

/**
 * Maps the official CIMA pharmaceutical form into the internal icon catalogue.
 */
export const normalizeMedicineIconType = (formaOficial: string): IconType => {
  const normalizedForm = formaOficial.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

  const match = ICON_MATCHERS.find(({ keywords }) =>
    keywords.some((keyword) => normalizedForm.includes(keyword)),
  );

  return match?.iconType ?? 'generic';
};
