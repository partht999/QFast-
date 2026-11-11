'use client';

import { useId, useState } from 'react';
import { ImagePlus } from 'lucide-react';

const maxCharacters = 450_000;

function drawPhoto(image: CanvasImageSource, sourceWidth: number, sourceHeight: number, edge: number, quality: number) {
  const scale = Math.min(1, edge / Math.max(sourceWidth, sourceHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not read this photo');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

async function loadImage(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Use a JPG, PNG, or WebP photo'));
    });
    image.src = url;
    return await loaded;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function readPhotoFile(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Use a JPG, PNG, or WebP photo');
  }
  if (file.size > 8 * 1024 * 1024) throw new Error('Choose a photo under 8 MB');

  const image = await loadImage(file);
  let edge = 960;
  let quality = 0.72;
  let dataUrl = '';
  for (let attempt = 0; attempt < 4; attempt += 1) {
    dataUrl = drawPhoto(image, image.naturalWidth, image.naturalHeight, edge, quality);
    if (dataUrl.length <= maxCharacters) return dataUrl;
    edge = Math.round(edge * 0.75);
    quality = Math.max(0.45, quality - 0.12);
  }
  throw new Error('This photo is still too large. Try another one.');
}

export function PhotoUpload({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  const inputId = useId();
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);

  return (
    <div>
      <p className="text-sm font-semibold text-neutral-800">{label}</p>
      <div className="mt-2 flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-5 w-5 text-neutral-400" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <label
            htmlFor={inputId}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-neutral-900 px-3 text-sm font-semibold text-white"
          >
            {reading ? 'Reading photo…' : value ? 'Change photo' : 'Upload photo'}
          </label>
          {value && (
            <button
              type="button"
              onClick={() => {
                setError('');
                onChange('');
              }}
              className="inline-flex min-h-11 items-center rounded-xl border border-neutral-200 px-3 text-sm font-semibold text-neutral-700"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          setReading(true);
          setError('');
          void readPhotoFile(file)
            .then(onChange)
            .catch((err) => setError(err instanceof Error ? err.message : 'Could not use this photo'))
            .finally(() => setReading(false));
        }}
      />
      {hint && <p className="mt-2 text-xs leading-5 text-neutral-500">{hint}</p>}
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
