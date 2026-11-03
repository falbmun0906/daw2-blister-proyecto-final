import { describe, expect, it } from 'vitest';
import {
  getNameSuggestions,
  getPrintedNationalCode,
  nationalCodeFromBarcode,
  prepareMedicinePhoto,
} from './medicine-recognition';

describe('medicine recognition candidates', () => {
  it('preserves strength and decimal marks; only proposes text, never doses', () => {
    expect(
      getNameSuggestions(
        'MELATONINA 1,9 mg\n60 comprimidos\nMELATONINA 1,9 mg\nLote ABC\nMantener fuera del alcance',
      ),
    ).toEqual(['MELATONINA 1,9 mg', '60 comprimidos']);
  });
  it('requires a labelled six-digit national code in OCR output', () => {
    expect(getPrintedNationalCode('C.N. 656338.0')).toBe('656338');
    expect(getPrintedNationalCode('Lote 656338')).toBeNull();
    expect(getPrintedNationalCode('CN 65633845')).toBeNull();
  });
  it('resolves only checksum-valid Spanish NTINs, including GS1 DataMatrix AI 01', () => {
    expect(nationalCodeFromBarcode('8470006563380')).toBe('656338');
    expect(nationalCodeFromBarcode('08470006563380')).toBe('656338');
    expect(nationalCodeFromBarcode(']d201084700065633801730123110ABC\x1d21XYZ')).toBe('656338');
    expect(nationalCodeFromBarcode('(01)08470006563380(17)301231')).toBe('656338');
    expect(nationalCodeFromBarcode('8470006563381')).toBeNull();
    expect(nationalCodeFromBarcode('4006381333931')).toBeNull();
    expect(nationalCodeFromBarcode('https://example.org/8470006563380')).toBeNull();
  });
  it('rejects unsupported or oversized uploads before decoding', async () => {
    await expect(
      prepareMedicinePhoto(new File(['test'], 'test.svg', { type: 'image/svg+xml' })),
    ).rejects.toThrow('JPG');
    const file = new File(['test'], 'large.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 13 * 1024 * 1024 });
    await expect(prepareMedicinePhoto(file)).rejects.toThrow('12 MB');
  });
});
