interface QRCodeRunner {
  addData(data: string, mode?: string): void;
  make(): void;
  isDark(row: number, col: number): boolean;
  getModuleCount(): number;
  createDataURL(cellSize?: number, margin?: number): string;
  renderTo2dContext(ctx: CanvasRenderingContext2D, size?: number): void;
}
interface QRCodeFactory {
  (typeNumber: number, errorCorrectionLevel: "L" | "M" | "Q" | "H"): QRCodeRunner;
  stringToBytesFuncs?: Record<string, (s: string) => number[]>;
}
declare const qrcode: QRCodeFactory;
export default qrcode;