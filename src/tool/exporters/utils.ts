import type { Exporter, ExportFormat } from '@itsjust/core';
import { sanitizeFilename } from '@itsjust/core';

export function createCanvasExporter(
  format: ExportFormat,
  mime: string,
  ext: string,
  quality?: number
): Exporter {
  return {
    format,
    export: async (element, options) => {
      try {
        const { toBlob } = await import('html-to-image');
        const scale = options.scale ?? 2;
        const filter = (node: HTMLElement): boolean => {
          if (!(node instanceof HTMLElement)) return true;
          if (node.dataset && node.dataset.exportSkip === 'true') return false;
          return true;
        };
        const blob = await toBlob(element, {
          type: mime,
          quality: options.quality ?? quality,
          backgroundColor: options.background ?? '#ffffff',
          pixelRatio: scale,
          filter: (node: HTMLElement) => filter(node),
        });
        if (!blob) {
          return {
            success: false,
            data: null,
            filename: sanitizeFilename(options.filename ?? `export-${Date.now()}.${ext}`),
            format,
            error: 'Failed to render element to image',
          };
        }
        return {
          success: true,
          data: blob,
          filename: sanitizeFilename(options.filename ?? `export-${Date.now()}.${ext}`),
          format,
        };
      } catch (error) {
        return {
          success: false,
          data: null,
          filename: sanitizeFilename(options.filename ?? `export-${Date.now()}.${ext}`),
          format,
          error:
            error instanceof Error && /cors|tainted/i.test(error.message)
              ? `${error.message}. The content includes external resources that cannot be captured.`
              : error instanceof Error
                ? error.message
                : `${format} export failed`,
        };
      }
    },
  };
}

export function formatExportError(error: Error, label: string): string {
  return /cors|tainted/i.test(error.message)
    ? `${error.message}. Try again with locally embedded resources only.`
    : `${label}: ${error.message}`;
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Export aborted', 'AbortError');
}

export async function renderToImage(
  element: HTMLElement,
  mime: string,
  scale = 2
): Promise<HTMLCanvasElement> {
  const { toBlob } = await import('html-to-image');
  const url = await toBlob(element, { type: mime, pixelRatio: scale });
  if (!url) throw new Error('Failed to render element to image');
  const img = new Image();
  img.src = URL.createObjectURL(url);
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load rendered image'));
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(img.src);
  return canvas;
}

export function htmlToBytes(): Uint8Array {
  return new Uint8Array(0);
}

export { sanitizeFilename };

export async function renderNodeToCanvas(): Promise<HTMLCanvasElement> {
  throw new Error('renderNodeToCanvas is not supported in this build');
}
