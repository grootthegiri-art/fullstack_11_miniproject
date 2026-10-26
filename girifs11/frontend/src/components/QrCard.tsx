import { useMemo } from "react";
import qrcode from "qrcode-generator";

const SIZES = [10, 14, 18, 24, 30];

function makeSvg(url: string): string | null {
  for (const typeNum of SIZES) {
    try {
      const qr = qrcode(typeNum, "L");
      qr.addData(url);
      qr.make();
      return qr.createSvgTag(4);
    } catch { /* data too long for this size: try the next larger one */ }
  }
  return null;
}

export default function QrCard({ url, live }: { url: string; live: boolean }) {
  const svg = useMemo(() => makeSvg(url), [url]);
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <div className="range-title">Scan to open on your phone</div>
      <div style={{ display: "inline-block", padding: 10, background: "#fff", borderRadius: 12, lineHeight: 0 }}>
        {svg
          ? <div dangerouslySetInnerHTML={{ __html: svg }} />
          : <div style={{ padding: 20, fontSize: 11, color: "#888" }}>QR too long to render</div>}
      </div>
      <p className="privacy-note" style={{ marginTop: 10 }}>
        {live
          ? "Opens live tracking for this token number only — no name or phone number is in the link."
          : "Opens this exact queue status — same token, same live countdown, adjusted for time already elapsed."}
      </p>
    </div>
  );
}
