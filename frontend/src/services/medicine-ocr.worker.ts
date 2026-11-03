import { createWorker, OEM, type Worker } from 'tesseract.js';

self.onmessage = async ({ data }: MessageEvent<{ image: ArrayBuffer; assets: string }>) => {
  let engine: Worker | undefined;
  try {
    engine = await createWorker(['spa', 'eng'], OEM.LSTM_ONLY, {
      workerPath: `${data.assets}worker.min.js`,
      corePath: data.assets,
      langPath: data.assets,
      workerBlobURL: false,
      logger: ({ status, progress }) => {
        if (status === 'recognizing text') self.postMessage({ kind: 'progress', progress });
      },
      errorHandler: () => self.postMessage({ kind: 'error' }),
    });
    const result = await engine.recognize(new Blob([data.image], { type: 'image/png' }));
    self.postMessage({ kind: 'result', text: result.data.text.slice(0, 5000) });
  } catch {
    self.postMessage({ kind: 'error' });
  } finally {
    await engine?.terminate();
  }
};
