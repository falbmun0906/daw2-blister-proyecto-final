import { nationalCodeFromBarcode } from '../lib/medicine-recognition';

/** A dedicated owner worker lets cancellation stop Tesseract even while its models load. */
export function recognizeMedicineText(
  photo: HTMLCanvasElement,
  signal: AbortSignal,
  onProgress: (progress: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Lectura cancelada.', 'AbortError'));
      return;
    }
    const worker = new Worker(new URL('./medicine-ocr.worker.ts', import.meta.url), {
      type: 'module',
    });
    let finished = false;
    const finish = (error?: Error, text = '') => {
      if (finished) return;
      finished = true;
      worker.terminate();
      signal.removeEventListener('abort', abort);
      worker.onmessage = null;
      worker.onerror = null;
      if (error) reject(error);
      else resolve(text);
    };
    const abort = () => finish(new DOMException('Lectura cancelada.', 'AbortError'));
    signal.addEventListener('abort', abort, { once: true });
    worker.onerror = () => finish(new Error('No se ha podido iniciar el lector de texto.'));
    worker.onmessage = ({
      data,
    }: MessageEvent<{ kind: string; progress?: number; text?: string }>) => {
      if (data.kind === 'progress' && typeof data.progress === 'number') onProgress(data.progress);
      if (data.kind === 'result') finish(undefined, data.text ?? '');
      if (data.kind === 'error') finish(new Error('No se ha podido leer la fotografía.'));
    };
    try {
      photo.toBlob((blob) => {
        if (finished) return;
        if (!blob) {
          finish(new Error('No se ha podido preparar la fotografía.'));
          return;
        }
        void blob
          .arrayBuffer()
          .then((image) => {
            if (finished) return;
            const assets = new URL(
              `${import.meta.env.BASE_URL}ocr/tesseract-7/`,
              window.location.origin,
            ).href;
            worker.postMessage({ image, assets }, [image]);
          })
          .catch(() => finish(new Error('No se ha podido preparar la fotografía.')));
      }, 'image/png');
    } catch {
      finish(new Error('No se ha podido preparar la fotografía.'));
    }
  });
}

export function recognizeMedicineCode(
  photo: HTMLCanvasElement,
  signal: AbortSignal,
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Lectura cancelada.', 'AbortError'));
      return;
    }
    let worker: Worker | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let finished = false;
    const finish = (raw?: string, cancelled = false) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
      worker?.terminate();
      if (cancelled) reject(new DOMException('Lectura cancelada.', 'AbortError'));
      else resolve(raw ? nationalCodeFromBarcode(raw) : null);
    };
    const abort = () => finish(undefined, true);
    signal.addEventListener('abort', abort, { once: true });
    try {
      // Loading and decoding are optional and bounded: every failure falls back to OCR.
      worker = new Worker(new URL('./medicine-barcode.worker.ts', import.meta.url), {
        type: 'module',
      });
      worker.onerror = () => finish();
      worker.onmessage = ({ data }: MessageEvent<{ text?: string }>) => finish(data.text);
      timeout = setTimeout(() => finish(), 5_000);
      const image = photo.getContext('2d')?.getImageData(0, 0, photo.width, photo.height);
      if (!image) {
        finish();
        return;
      }
      worker.postMessage({ pixels: image.data, width: image.width, height: image.height }, [
        image.data.buffer,
      ]);
    } catch {
      finish();
    }
  });
}
