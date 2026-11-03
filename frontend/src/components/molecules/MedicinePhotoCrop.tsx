import { useRef, type PointerEvent } from 'react';
import { FULL_IMAGE, type CropArea } from '../../lib/medicine-recognition';
import { Button } from '../atoms/Button';

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(value)));

export function MedicinePhotoCrop({
  preview,
  crop,
  onChange,
  disabled,
}: {
  preview: string;
  crop: CropArea;
  onChange: (crop: CropArea) => void;
  disabled: boolean;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; crop: CropArea; resize: boolean } | null>(null);
  const start = (event: PointerEvent<HTMLButtonElement>, resize: boolean) => {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, crop, resize };
  };
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const origin = drag.current;
    const rect = frame.current?.getBoundingClientRect();
    if (!origin || !rect || disabled) return;
    const dx = ((event.clientX - origin.x) * 100) / rect.width;
    const dy = ((event.clientY - origin.y) * 100) / rect.height;
    onChange(
      origin.resize
        ? {
            ...origin.crop,
            width: clamp(origin.crop.width + dx, 10, 100 - origin.crop.x),
            height: clamp(origin.crop.height + dy, 10, 100 - origin.crop.y),
          }
        : {
            ...origin.crop,
            x: clamp(origin.crop.x + dx, 0, 100 - origin.crop.width),
            y: clamp(origin.crop.y + dy, 0, 100 - origin.crop.height),
          },
    );
  };
  const adjust = (key: keyof CropArea, value: number) => {
    const next = { ...crop, [key]: value };
    next.width = Math.min(next.width, 100 - next.x);
    next.height = Math.min(next.height, 100 - next.y);
    onChange(next);
  };
  return (
    <>
      <p>
        Arrastra el marco para moverlo y su esquina para ajustar el tamaño. También puedes usar los
        controles de recorte.
      </p>
      <div ref={frame} className="c-medicine-scanner__preview">
        <img src={preview} alt="Fotografía del envase para revisar y recortar" draggable={false} />
        <div
          className="c-medicine-scanner__crop"
          style={{
            left: `${crop.x}%`,
            top: `${crop.y}%`,
            width: `${crop.width}%`,
            height: `${crop.height}%`,
          }}
        >
          {[false, true].map((resize) => (
            <button
              key={String(resize)}
              type="button"
              disabled={disabled}
              className={`c-medicine-scanner__crop-${resize ? 'resize' : 'move'}`}
              aria-label={resize ? 'Ajustar tamaño del recorte' : 'Mover recorte'}
              onPointerDown={(event) => start(event, resize)}
              onPointerMove={move}
              onPointerUp={() => {
                drag.current = null;
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
              onKeyDown={(event) => {
                if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key))
                  return;
                event.preventDefault();
                const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
                const key = resize ? (horizontal ? 'width' : 'height') : horizontal ? 'x' : 'y';
                const delta = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
                const max = resize
                  ? 100 - (horizontal ? crop.x : crop.y)
                  : 100 - (horizontal ? crop.width : crop.height);
                adjust(key, clamp(crop[key] + delta, resize ? 10 : 0, max));
              }}
            >
              {resize ? '↘' : '↔'}
            </button>
          ))}
        </div>
      </div>
      <details>
        <summary>Controles de recorte</summary>
        <fieldset disabled={disabled}>
          <legend>Área de la fotografía</legend>
          {(['x', 'y', 'width', 'height'] as const).map((key) => (
            <label className="c-field" key={key}>
              <span>
                {
                  { x: 'Margen izquierdo', y: 'Margen superior', width: 'Ancho', height: 'Alto' }[
                    key
                  ]
                }{' '}
                ({crop[key]}%)
              </span>
              <input
                type="range"
                min={key === 'x' || key === 'y' ? 0 : 10}
                max={
                  key === 'x' || key === 'y' ? 90 : key === 'width' ? 100 - crop.x : 100 - crop.y
                }
                value={crop[key]}
                onChange={(event) => adjust(key, Number(event.target.value))}
              />
            </label>
          ))}
        </fieldset>
      </details>
      <Button variant="ghost" disabled={disabled} onClick={() => onChange(FULL_IMAGE)}>
        Usar imagen completa
      </Button>
    </>
  );
}
