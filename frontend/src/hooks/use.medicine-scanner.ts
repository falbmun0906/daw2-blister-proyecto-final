import { useEffect, useRef, useState } from 'react';
import {
  cropMedicinePhoto,
  FULL_IMAGE,
  getNameSuggestions,
  getPrintedNationalCode,
  prepareMedicinePhoto,
  type CropArea,
} from '../lib/medicine-recognition';
import { recognizeMedicineCode, recognizeMedicineText } from '../services/medicine-ocr.service';
import { getCimaByNationalCode, searchCima } from '../services/external.service';
import { isApiError } from '../types/api.types';
import type { ExternalSearchItem } from '../types/medicine.types';
import { useMedicineCamera } from './use.medicine-camera';

export function useMedicineScanner(
  initialQuery = '',
  initialMethod: 'ocr' | 'barcode' | 'search' = 'search',
) {
  const cameraControl = useMedicineCamera();
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const photo = useRef<HTMLCanvasElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropArea>(FULL_IMAGE);
  const [phase, setPhase] = useState<'idle' | 'preparing' | 'recognizing' | 'review' | 'searching'>(
    'idle',
  );
  const busy = phase === 'recognizing' || phase === 'preparing';
  const searching = phase === 'searching';
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [query, setQuery] = useState(initialQuery);
  const [method, setMethod] = useState(initialMethod);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<ExternalSearchItem[]>([]);

  useEffect(
    () => () => {
      sequence.current++;
      controller.current?.abort();
      photo.current = null;
    },
    [],
  );
  const cancel = () => {
    sequence.current++;
    controller.current?.abort();
    cameraControl.stop();
    cameraControl.clearError();
    setPhase('idle');
  };
  const openCamera = () => {
    cancel();
    setError(null);
    return cameraControl.open();
  };
  const setPhoto = (canvas: HTMLCanvasElement) => {
    photo.current = canvas;
    cameraControl.clearError();
    setPhase('review');
    setPreview(canvas.toDataURL('image/jpeg', 0.9));
    setCrop(FULL_IMAGE);
    setText('');
    setQuery('');
    setResults([]);
    setSearched(false);
    setError(null);
  };
  const selectPhoto = async (file?: File) => {
    if (!file) return;
    cancel();
    const request = ++sequence.current;
    setPhase('preparing');
    setError(null);
    try {
      const canvas = await prepareMedicinePhoto(file);
      if (request === sequence.current) setPhoto(canvas);
    } catch (err) {
      if (request === sequence.current)
        setError(err instanceof Error ? err.message : 'No se puede abrir la fotografía.');
    } finally {
      if (request === sequence.current) setPhase('review');
    }
  };
  const capture = () => {
    const canvas = cameraControl.capture();
    if (canvas) setPhoto(canvas);
  };

  const recognize = async () => {
    if (!photo.current || busy) return;
    cancel();
    const request = ++sequence.current;
    const abort = new AbortController();
    controller.current = abort;
    setPhase('recognizing');
    setProgress(0);
    setError(null);
    setResults([]);
    setSearched(false);
    setText('');
    setQuery('');
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      abort.abort();
    }, 60_000);
    try {
      const cropped = cropMedicinePhoto(photo.current, crop);
      const cn = await recognizeMedicineCode(cropped, abort.signal);
      if (request !== sequence.current) return;
      abort.signal.throwIfAborted();
      if (cn) {
        setQuery(cn);
        setMethod('barcode');
        return;
      }
      const recognized = await recognizeMedicineText(cropped, abort.signal, setProgress);
      if (request !== sequence.current) return;
      setText(recognized);
      setMethod('ocr');
      setQuery(getPrintedNationalCode(recognized) ?? getNameSuggestions(recognized)[0] ?? '');
      if (!recognized.trim())
        setError(
          'No se ha podido leer texto. Prueba con más luz, recorta la etiqueta o escribe el nombre.',
        );
    } catch (err) {
      if (request === sequence.current)
        setError(
          timedOut
            ? 'La lectura ha tardado demasiado. Recorta la etiqueta o busca por nombre.'
            : err instanceof Error && err.name === 'AbortError'
              ? null
              : 'No se ha podido leer la imagen. Repite la foto o escribe el nombre.',
        );
    } finally {
      window.clearTimeout(timeout);
      if (request === sequence.current) setPhase('review');
    }
  };

  const search = async () => {
    const value = query.trim();
    if (value.length < 2 || searching) return;
    cameraControl.clearError();
    const request = ++sequence.current;
    setPhase('searching');
    setError(null);
    setResults([]);
    setSearched(false);
    try {
      const items = /^\d{6}$/.test(value)
        ? [await getCimaByNationalCode(value)]
        : await searchCima(value);
      if (request === sequence.current) {
        setResults(items);
        setSearched(true);
      }
    } catch (err) {
      if (request === sequence.current)
        setError(
          isApiError(err)
            ? err.message
            : 'No se ha podido consultar CIMA. Revisa tu conexión e inténtalo de nuevo.',
        );
    } finally {
      if (request === sequence.current) setPhase('review');
    }
  };

  const changeQuery = (value: string) => {
    sequence.current++;
    setPhase('review');
    setQuery(value);
    setResults([]);
    setSearched(false);
  };
  return {
    preview,
    crop,
    setCrop,
    busy,
    searching,
    progress,
    error: error ?? cameraControl.error,
    text,
    query,
    method,
    searched,
    results,
    cancel,
    openCamera,
    selectPhoto,
    capture,
    recognize,
    search,
    changeQuery,
    video: cameraControl.video,
    camera: cameraControl.state === 'ready',
    cameraPending: cameraControl.state === 'opening',
  };
}
