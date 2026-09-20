import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export function loadPdfDoc(data: ArrayBuffer): Promise<PDFDocumentProxy> {
  return pdfjsLib.getDocument({ data, isEvalSupported: false, useSystemFonts: true }).promise;
}

export async function pageBox(doc: PDFDocumentProxy, index: number): Promise<{ w: number; h: number }> {
  const page = await doc.getPage(index + 1);
  const vp = page.getViewport({ scale: 1 });
  return { w: vp.width, h: vp.height };
}

export async function renderPage(doc: PDFDocumentProxy, index: number, scale: number): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(index + 1);
  const vp = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(vp.width);
  canvas.height = Math.ceil(vp.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  return canvas;
}