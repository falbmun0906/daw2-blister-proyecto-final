import { afterEach, describe, expect, it, vi } from 'vitest';
import { recognizeMedicineCode, recognizeMedicineText } from './medicine-ocr.service';

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  terminate = vi.fn();
  postMessage = vi.fn();
  constructor() {
    FakeWorker.instances.push(this);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
  FakeWorker.instances = [];
});

describe('OCR lifecycle', () => {
  const barcodeCanvas = () => {
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockReturnValue({
      getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
    } as unknown as CanvasRenderingContext2D);
    return canvas;
  };

  it('falls back to OCR if the barcode worker cannot load', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    const task = recognizeMedicineCode(barcodeCanvas(), new AbortController().signal);
    FakeWorker.instances[0].onerror?.();
    await expect(task).resolves.toBeNull();
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();
  });

  it('bounds barcode decoding and terminates a stalled worker', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('Worker', FakeWorker);
    const task = recognizeMedicineCode(barcodeCanvas(), new AbortController().signal);
    await vi.advanceTimersByTimeAsync(5000);
    await expect(task).resolves.toBeNull();
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();
  });

  it('propagates cancellation instead of falling through to OCR', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    const controller = new AbortController();
    const task = recognizeMedicineCode(barcodeCanvas(), controller.signal);
    controller.abort();
    await expect(task).rejects.toMatchObject({ name: 'AbortError' });
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();
  });
  it('terminates immediately when cancelled during model initialization', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'toBlob').mockImplementation(() => undefined);
    const controller = new AbortController();
    const task = recognizeMedicineText(canvas, controller.signal, vi.fn());
    controller.abort();
    await expect(task).rejects.toMatchObject({ name: 'AbortError' });
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();
    expect(FakeWorker.instances[0].onmessage).toBeNull();
  });

  it('releases the worker on initialization failures and returns a recoverable error', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'toBlob').mockImplementation(() => undefined);
    const task = recognizeMedicineText(canvas, new AbortController().signal, vi.fn());
    FakeWorker.instances[0].onerror?.();
    await expect(task).rejects.toThrow('lector');
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();
  });
});
