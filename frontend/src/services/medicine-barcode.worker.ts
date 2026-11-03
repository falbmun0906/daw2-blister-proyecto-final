/// <reference lib="webworker" />
import {
  BinaryBitmap,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
  BarcodeFormat,
  DecodeHintType,
} from '@zxing/library';

const scope = self as unknown as DedicatedWorkerGlobalScope;
scope.onmessage = ({
  data,
}: MessageEvent<{ pixels: Uint8ClampedArray; width: number; height: number }>) => {
  try {
    const luminance = new Uint8ClampedArray(data.width * data.height);
    for (let i = 0; i < luminance.length; i++) {
      const p = i * 4;
      luminance[i] = (data.pixels[p] + 2 * data.pixels[p + 1] + data.pixels[p + 2]) / 4;
    }
    const bitmap = new BinaryBitmap(
      new HybridBinarizer(new RGBLuminanceSource(luminance, data.width, data.height)),
    );
    const hints = new Map([
      [
        DecodeHintType.POSSIBLE_FORMATS,
        [BarcodeFormat.EAN_13, BarcodeFormat.DATA_MATRIX, BarcodeFormat.CODE_128],
      ],
    ]);
    const text = new MultiFormatReader().decode(bitmap, hints).getText();
    scope.postMessage({ text });
  } catch {
    scope.postMessage({ text: null });
  }
};
