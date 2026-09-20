import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PAGE_SIZES: Record<string, [number, number]> = {
  A4: [595.28, 841.89],
  letter: [612, 792],
  A5: [419.53, 595.28],
};

export interface TextToPdfOpts {
  fontSize?: number;
  margin?: number;
  page?: "A4" | "letter" | "A5";
}

export async function textToPdf(text: string, opts: TextToPdfOpts = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle("Document");
  doc.setProducer("ToolVerse");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = opts.fontSize ?? 12;
  const margin = opts.margin ?? 40;
  const [pw, ph] = PAGE_SIZES[opts.page ?? "A4"];
  const maxW = pw - margin * 2;
  const lineH = fontSize * 1.35;

  let page = doc.addPage([pw, ph]);
  let y = ph - margin;

  const newPage = () => {
    if (y < margin + lineH) {
      page = doc.addPage([pw, ph]);
      y = ph - margin;
    }
  };
  const drawLine = (line: string, useBold: boolean) => {
    newPage();
    page.drawText(line, {
      x: margin,
      y,
      size: fontSize,
      font: useBold ? bold : font,
      color: rgb(0.12, 0.15, 0.2),
    });
    y -= lineH;
  };
  const drawParagraph = (paragraph: string, useBold: boolean) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (font.widthOfTextAtSize(test, fontSize) > maxW && line) {
        drawLine(line, useBold);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) drawLine(line, useBold);
    y -= lineH * 0.5;
    newPage();
  };

  const paragraphs = text.replace(/\r\n/g, "\n").trim().split(/\n\s*\n/) ?? [];
  for (const para of paragraphs) {
    const lines = para.split("\n");
    for (const [i, ln] of lines.entries()) drawParagraph(ln, i === 0);
  }
  return doc.save();
}

export async function imagesToPdf(files: File[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const [pw, ph] = PAGE_SIZES.A4;
  const margin = 24;
  const usable = Math.min(pw - margin * 2, ph - margin * 2);
  for (const f of files) {
    const bytes = await f.arrayBuffer();
    let img;
    if (f.type === "image/jpeg") {
      img = await doc.embedJpg(bytes);
    } else if (f.type === "image/png") {
      img = await doc.embedPng(bytes);
    } else {
      throw new Error(`${f.name}: convert ${f.type || "this format"} to PNG or JPG first`);
    }
    const page = doc.addPage([pw, ph]);
    const ratio = Math.min(usable / img.width, usable / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
  }
  return doc.save();
}