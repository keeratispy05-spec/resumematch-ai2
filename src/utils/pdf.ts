import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { apiUrl } from './api';

GlobalWorkerOptions.workerSrc = workerUrl;

/** Extract text in approximate visual reading order, preserving line breaks. */
export async function readPdfText(file: File): Promise<string> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('ไฟล์นี้ไม่ใช่ PDF กรุณาเลือกไฟล์ .pdf');
  }
  if (file.size === 0) throw new Error('ไฟล์ว่าง ไม่มีข้อมูลให้อ่าน');
  if (file.size > 20 * 1024 * 1024) throw new Error('ไฟล์มีขนาดเกิน 20 MB กรุณาลดขนาดไฟล์แล้วลองใหม่');

  let pdf;
  try {
    pdf = await getDocument({ data: await file.arrayBuffer(), useSystemFonts: true, isEvalSupported: false }).promise;
  } catch {
    throw new Error('เปิด PDF ไม่สำเร็จ ไฟล์อาจเสียหาย เข้ารหัส หรือใช้รูปแบบที่ไม่รองรับ');
  }
  const pages: string[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent({ includeMarkedContent: false });
      const items = content.items
        .filter((item): item is typeof item & { str: string; transform: number[]; width: number } => 'str' in item && 'transform' in item && typeof item.str === 'string' && item.str.trim().length > 0)
        .map((item) => ({ text: item.str.trim(), x: item.transform[4] ?? 0, y: item.transform[5] ?? 0, width: item.width ?? 0 }))
        .sort((a, b) => Math.abs(b.y - a.y) > 3 ? b.y - a.y : a.x - b.x);

      // Group text items on the same visual line; PDF text item order is often fragmented.
      const lines: { y: number; chunks: { x: number; width: number; text: string }[] }[] = [];
      for (const item of items) {
        let line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= 3);
        if (!line) {
          line = { y: item.y, chunks: [] };
          lines.push(line);
        }
        line.chunks.push({ x: item.x, width: item.width, text: item.text });
      }
      lines.sort((a, b) => b.y - a.y);
      let pageText = lines.map((line) => {
        line.chunks.sort((a, b) => a.x - b.x);
        let output = '';
        let previousRight: number | null = null;
        for (const chunk of line.chunks) {
          const gap = previousRight === null ? 0 : chunk.x - previousRight;
          if (output && gap > 1.5 && !/^[,.;:!?%)\]}]/.test(chunk.text) && !/[([{\/-]$/.test(output)) output += ' ';
          output += chunk.text;
          previousRight = chunk.x + chunk.width;
        }
        return output.trim();
      }).filter(Boolean).join('\n');

      try {
        // Some PDFs contain selectable text on certain pages but scanned images on others.
        // OCR only the pages where PDF.js could not find a meaningful text layer.
        if (pageText.trim().length < 10) {
          if (pdf.numPages > 30) {
            throw new Error('PDF ที่ต้องใช้ OCR มีมากเกินไป จำกัดไม่เกิน 30 หน้า');
          }
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) throw new Error('ไม่สามารถสร้างภาพสำหรับ OCR ได้');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          try {
            await page.render({ canvasContext: context, viewport }).promise;
            pageText = await readImageWithOcr(await canvasToPng(canvas));
          } finally {
            canvas.width = 0;
            canvas.height = 0;
          }
        }
        pages.push(pageText);
      } finally {
        page.cleanup();
      }
    }
  } finally {
    await pdf.destroy();
  }
  const text = pages.join('\n\n').replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (text.length < 30) {
    throw new Error('ไม่พบข้อความที่อ่านได้ใน PDF มีแนวโน้มเป็นไฟล์ภาพสแกน ต้องใช้ OCR หรืออัปโหลด PDF ที่เลือกข้อความได้');
  }
  return text;
}

/** Send one rendered page image to the local Tesseract endpoint. */
async function readImageWithOcr(image: Blob): Promise<string> {
  const response = await fetch(apiUrl('/api/ocr'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: await image.arrayBuffer(),
  });

  let payload: { text?: string; error?: string };
  try {
    payload = await response.json() as { text?: string; error?: string };
  } catch {
    throw new Error(`OCR ตอบกลับไม่ถูกต้อง (HTTP ${response.status})`);
  }

  if (!response.ok) {
    throw new Error(payload.error || `OCR อ่านภาพไม่สำเร็จ (HTTP ${response.status})`);
  }
  if (typeof payload.text !== 'string' || payload.text.trim().length === 0) {
    throw new Error('OCR ไม่พบข้อความในหน้านี้');
  }
  return payload.text.trim();
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('แปลงหน้า PDF เป็นภาพไม่สำเร็จ'));
    }, 'image/png');
  });
}

/** OCR all pages of a scanned PDF using Tesseract installed on the backend machine. */
export async function readScannedPdfWithOcr(file: File): Promise<string> {
  if (file.size === 0) throw new Error('ไฟล์ว่าง ไม่มีข้อมูลให้อ่าน');
  if (file.size > 20 * 1024 * 1024) throw new Error('ไฟล์มีขนาดเกิน 20 MB');

  let pdf;
  try {
    pdf = await getDocument({
      data: await file.arrayBuffer(),
      useSystemFonts: true,
      isEvalSupported: false,
    }).promise;
  } catch {
    throw new Error('เปิด PDF เพื่อทำ OCR ไม่สำเร็จ ไฟล์อาจเสียหาย');
  }

  const pages: string[] = [];
  try {
    if (pdf.numPages > 30) {
      throw new Error('PDF มีมากเกินไป จำกัดไม่เกิน 30 หน้า');
    }
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const canvas = document.createElement('canvas');
      const viewport = page.getViewport({ scale: 1.5 });
      const context = canvas.getContext('2d');
      if (!context) throw new Error('ไม่สามารถสร้างภาพสำหรับ OCR ได้');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      try {
        await page.render({ canvasContext: context, viewport }).promise;
        const pageText = await readImageWithOcr(await canvasToPng(canvas));
        pages.push(`--- หน้า ${pageNumber} ---\n${pageText}`);
      } finally {
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
      }
    }
  } finally {
    await pdf.destroy();
  }

  const text = pages.join('\n\n').trim();
  if (text.length < 30) {
    throw new Error('อ่านข้อความจาก PDF ไม่ได้ กรุณาตรวจสอบคุณภาพไฟล์หรือภาพสแกน');
  }
  return text;
}

// Backward-compatible export for App.tsx versions that still use the old function name.
export async function readScannedPdfWithAi(file: File): Promise<string> {
  return readScannedPdfWithOcr(file);
}

/** Read an uploaded raster image (PNG/JPEG/WEBP/GIF/BMP) with the local Tesseract OCR endpoint. */
export async function readImageText(file: File): Promise<string> {
  const extension = file.name.toLowerCase().split('.').pop() || '';
  const acceptedExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'];
  if (!acceptedExtensions.includes(extension)) {
    throw new Error('รองรับเฉพาะ PDF และรูปภาพ PNG, JPG, JPEG, WEBP, GIF หรือ BMP');
  }
  if (file.size === 0) throw new Error('ไฟล์ว่าง ไม่มีข้อมูลให้อ่าน');
  if (file.size > 20 * 1024 * 1024) throw new Error('ไฟล์มีขนาดเกิน 20 MB กรุณาลดขนาดไฟล์แล้วลองใหม่');

  const response = await fetch(apiUrl('/api/ocr'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: await file.arrayBuffer(),
  });

  let payload: { text?: string; error?: string };
  try {
    payload = await response.json() as { text?: string; error?: string };
  } catch {
    throw new Error(`OCR ตอบกลับไม่ถูกต้อง (HTTP ${response.status})`);
  }
  if (!response.ok) throw new Error(payload.error || `อ่านรูปภาพไม่สำเร็จ (HTTP ${response.status})`);
  const text = typeof payload.text === 'string' ? payload.text.trim() : '';
  if (text.length < 10) throw new Error('ไม่พบข้อความที่อ่านได้ในรูปภาพ กรุณาใช้ภาพที่ชัดเจนขึ้น');
  return text;
}

/** Obtain PDF page count for the source-document preview when the browser can parse the file. */
export async function getPdfPageCount(file: Blob): Promise<number> {
  const pdf = await getDocument({ data: await file.arrayBuffer(), useSystemFonts: true, isEvalSupported: false }).promise;
  try {
    return pdf.numPages;
  } finally {
    await pdf.destroy();
  }
}
