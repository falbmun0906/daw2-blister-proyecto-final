import { useCallback, useEffect, useRef, useState } from 'react';

type CameraState = 'idle' | 'opening' | 'ready';

export function useMedicineCamera() {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const sequence = useRef(0);
  const [state, setState] = useState<CameraState>('idle');
  const [error, setError] = useState<string | null>(null);
  const release = useCallback(() => {
    sequence.current++;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }, []);
  const stop = useCallback(() => {
    release();
    setState('idle');
  }, [release]);
  useEffect(() => release, [release]);
  useEffect(() => {
    if (state === 'ready' && video.current) video.current.srcObject = stream.current;
  }, [state]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) stop();
    };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, [stop]);

  const open = async () => {
    stop();
    setError(null);
    setState('opening');
    const request = ++sequence.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera unavailable');
      const media = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      if (request !== sequence.current || document.hidden) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      setState('ready');
    } catch (err) {
      if (request !== sequence.current) return;
      setState('idle');
      setError(
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'No se ha permitido acceder a la cámara. Puedes seleccionar una fotografía o buscar por nombre.'
          : 'No se ha podido abrir la cámara. Usa HTTPS, revisa los permisos o selecciona una fotografía.',
      );
    }
  };

  const capture = (): HTMLCanvasElement | null => {
    const source = video.current;
    if (!source?.videoWidth) {
      setError('Espera a que la cámara muestre la imagen.');
      return null;
    }
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 2000 / Math.max(source.videoWidth, source.videoHeight));
    canvas.width = Math.round(source.videoWidth * scale);
    canvas.height = Math.round(source.videoHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) {
      setError('No se ha podido preparar la fotografía.');
      return null;
    }
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    stop();
    return canvas;
  };
  return { video, state, error, clearError: () => setError(null), open, stop, capture };
}
