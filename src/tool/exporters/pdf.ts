import type { Exporter } from '@itsjust/core';
import { sanitizeFilename } from '@itsjust/core';

function toBlobPart(bytes: Uint8Array): BlobPart {
  return new Uint8Array(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  ) as unknown as BlobPart;
}

/**
 * PDF exporter that renders the tool canvas to a PNG and embeds the raw
 * image bytes in a single-page PDF document with a valid xref table.
 */
const pdfExporter: Exporter = {
  format: 'pdf',
  export: async (element, options) => {
    try {
      const { toBlob } = await import('html-to-image');
      const png = await toBlob(element, { type: 'image/png', pixelRatio: options.scale ?? 2 });
      if (!png) throw new Error('Failed to render element');
      const bytes = new Uint8Array(await png.arrayBuffer());
      const width = 612;
      const height = 792;
      const imgW = Math.max(1, Math.round(element.getBoundingClientRect().width));
      const imgH = Math.max(1, Math.round(element.getBoundingClientRect().height));
      const content = `q ${width} 0 0 ${height} 0 0 cm /Im1 Do Q\n`;
      const enc = new TextEncoder();
      const body: (string | Uint8Array)[] = [];
      const offsets: number[] = [];
      const header = `%PDF-1.4\n`;
      let cursor = header.length;
      const track = (piece: string | Uint8Array) => {
        offsets.push(cursor);
        body.push(piece);
        cursor += typeof piece === 'string' ? enc.encode(piece).length : piece.length;
      };
      track(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
      track(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`);
      track(
        `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`
      );
      track(
        `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${bytes.length} >>\nstream\n`
      );
      track(bytes);
      track(`\nendstream\nendobj\n`);
      track(`5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`);
      const xrefPos = cursor;
      let xref = `xref\n0 6\n0000000000 65535 f \n`;
      for (const off of offsets) {
        xref += `${String(off).padStart(10, '0')} 00000 n \n`;
      }
      xref += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
      const all: (string | Uint8Array)[] = [header, ...body, xref];
      const blobParts: BlobPart[] = all.map((piece) =>
        typeof piece === 'string' ? piece : toBlobPart(piece)
      );
      const pdf = new Blob(blobParts, { type: 'application/pdf' });
      return {
        success: true,
        data: pdf,
        filename: sanitizeFilename(options.filename ?? `export-${Date.now()}.pdf`),
        format: 'pdf',
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        filename: sanitizeFilename(options.filename ?? `export-${Date.now()}.pdf`),
        format: 'pdf',
        error: error instanceof Error ? error.message : 'PDF export failed',
      };
    }
  },
};

export default pdfExporter;
