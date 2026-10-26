/// <reference types="vite/client" />

declare module "qrcode-generator" {
  interface QRCode {
    addData(data: string): void;
    make(): void;
    createSvgTag(cellSize?: number, margin?: number): string;
  }
  export default function qrcode(typeNumber: number, errorCorrectionLevel: "L" | "M" | "Q" | "H"): QRCode;
}
