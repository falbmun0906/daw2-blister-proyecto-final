/** The OCR text is only a search aid. Never use it to choose a dose or create an inventory item. */
export function getNameSuggestions(text: string): string[] {
  return [
    ...new Set(
      text
        .slice(0, 5000)
        .split(/[\r\n]+/)
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .filter(
          (line) =>
            line.length >= 3 &&
            line.length <= 100 &&
            /[a-záéíóúüñ]{3}/i.test(line) &&
            !/^(?:c\.?n\.?|lote|caducidad|cad\.|exp\.|mantener|vía |via |leer |conservar)/i.test(
              line,
            ),
        ),
    ),
  ].slice(0, 8);
}

export function getPrintedNationalCode(text: string): string | null {
  return text.match(/\bC\.?\s*N\.?\s*[:-]?\s*(\d{6})(?!\d)/i)?.[1] ?? null;
}

function validGtin(value: string): boolean {
  if (!/^\d{13,14}$/.test(value)) return false;
  const digits = value.slice(0, -1).split('').reverse();
  const sum = digits.reduce(
    (total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 3 : 1),
    0,
  );
  return (10 - (sum % 10)) % 10 === Number(value.at(-1));
}

/** Spanish NTIN: 847000 + six-digit CN + check digit. Other GTINs cannot be guessed.
 * https://www.gs1es.org/estandares-gs1-identificar/ntin/
 * GS1 DataMatrix is accepted when AI 01 is the first element, including its symbology identifier.
 */
export function nationalCodeFromBarcode(raw: string): string | null {
  const stripped = raw.trim().replace(/^\]d2/, '');
  const value = stripped.startsWith(String.fromCharCode(29)) ? stripped.slice(1) : stripped;
  const gtin = /^\d{13,14}$/.test(value) ? value : value.match(/^(?:\(01\)|01)(\d{14})/)?.[1];
  if (!gtin || !validGtin(gtin)) return null;
  const ean = gtin.length === 14 && gtin.startsWith('0') ? gtin.slice(1) : gtin;
  return /^847000\d{7}$/.test(ean) ? ean.slice(6, 12) : null;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}
export const FULL_IMAGE: CropArea = { x: 0, y: 0, width: 100, height: 100 };

export async function prepareMedicinePhoto(file: File): Promise<HTMLCanvasElement> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error(
      'Usa una fotografía JPG, PNG o WebP. Si es HEIC, conviértela o toma una foto desde la cámara.',
    );
  if (file.size > 12 * 1024 * 1024)
    throw new Error('La fotografía supera los 12 MB. Selecciona una imagen más pequeña.');
  const url = URL.createObjectURL(file);
  try {
    const photo = new Image();
    photo.src = url;
    await photo.decode();
    if (
      !photo.naturalWidth ||
      !photo.naturalHeight ||
      photo.naturalWidth * photo.naturalHeight > 40_000_000
    )
      throw new Error(
        'La fotografía tiene demasiada resolución. Usa una imagen de hasta 40 megapíxeles.',
      );
    const scale = Math.min(1, 2000 / Math.max(photo.naturalWidth, photo.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(photo.naturalWidth * scale);
    canvas.height = Math.round(photo.naturalHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se puede procesar la imagen en este navegador.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(photo, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function cropMedicinePhoto(photo: HTMLCanvasElement, area: CropArea): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round((photo.width * area.width) / 100));
  canvas.height = Math.max(1, Math.round((photo.height * area.height) / 100));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se puede recortar la imagen.');
  context.drawImage(
    photo,
    (photo.width * area.x) / 100,
    (photo.height * area.y) / 100,
    canvas.width,
    canvas.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvas;
}
