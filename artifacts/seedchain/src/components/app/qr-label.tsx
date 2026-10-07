import { useTranslation } from "react-i18next";
import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface QrLabelProps {
  traceUrl: string;
  lotCode: string;
  productName: string;
  variety: string;
  origin: string;
}

const W = 360;
const H = 520;

/**
 * Printable label. The QR encodes ONLY the public HTTPS trace URL. Error
 * correction level Q + a 4-module quiet zone keep it scannable when printed
 * small or slightly damaged. The label is plain SVG so print is vector-sharp.
 */
export function QrLabel({ traceUrl, lotCode, productName, variety, origin }: QrLabelProps) {
  const { t } = useTranslation();
  const ref = useRef<SVGSVGElement>(null);

  const serialize = () => {
    const svg = ref.current!.cloneNode(true) as SVGSVGElement;
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    return new XMLSerializer().serializeToString(svg);
  };
  const download = (blob: Blob, name: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const downloadSvg = () => download(new Blob([serialize()], { type: "image/svg+xml" }), `${lotCode}-label.svg`);
  const downloadPng = () => {
    const url = URL.createObjectURL(new Blob([serialize()], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    img.onload = () => {
      const scale = 4;
      const canvas = document.createElement("canvas");
      canvas.width = W * scale;
      canvas.height = H * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => b && download(b, `${lotCode}-label.png`), "image/png");
    };
    img.src = url;
  };
  const print = () => {
    const w = window.open("", "_blank", "width=480,height=700");
    if (!w) return;
    w.document.write(
      `<!doctype html><title>${lotCode} label</title><style>@page{margin:8mm}body{margin:0;display:flex;justify-content:center}svg{width:90mm;height:auto}</style>${serialize()}`,
    );
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-[360px] rounded-2xl border border-white/10 bg-white shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]" role="img" aria-label={t("farmer.qr.ariaLabel", { code: lotCode })}>
        <rect width={W} height={H} fill="#fff" />
        <text x={W / 2} y="46" textAnchor="middle" fontFamily="Inter,Arial,sans-serif" fontWeight="800" fontSize="28" letterSpacing="4" fill="#1A1A1A">SEEDCHAIN</text>
        <rect x="20" y="62" width={W - 40} height="3" fill="#3FAF5E" />
        <QRCodeSVG x={40} y={84} width={W - 80} height={W - 80} value={traceUrl} level="Q" marginSize={4} bgColor="#FFFFFF" fgColor="#000000" />
        <text x={W / 2} y="394" textAnchor="middle" fontFamily="Inter,Arial,sans-serif" fontSize="12" fontWeight="700" fill="#555">LOT</text>
        <text x={W / 2} y="418" textAnchor="middle" fontFamily="ui-monospace,Menlo,monospace" fontWeight="700" fontSize="22" fill="#1A1A1A">{lotCode}</text>
        <text x="30" y="452" fontFamily="Inter,Arial,sans-serif" fontSize="13" fill="#1A1A1A"><tspan fontWeight="700">PRODUCT: </tspan>{productName}</text>
        <text x="30" y="472" fontFamily="Inter,Arial,sans-serif" fontSize="13" fill="#1A1A1A"><tspan fontWeight="700">VARIETY: </tspan>{variety}</text>
        <text x="30" y="492" fontFamily="Inter,Arial,sans-serif" fontSize="13" fill="#1A1A1A"><tspan fontWeight="700">ORIGIN: </tspan>{origin.length > 34 ? `${origin.slice(0, 33)}…` : origin}</text>
        <text x={W / 2} y="512" textAnchor="middle" fontFamily="Inter,Arial,sans-serif" fontSize="11" fill="#555">Scan to verify traceability</text>
      </svg>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={downloadPng} variant="outline"><Download className="mr-2 h-4 w-4" />{t("farmer.qr.png")}</Button>
        <Button onClick={downloadSvg} variant="outline"><Download className="mr-2 h-4 w-4" />{t("farmer.qr.svg")}</Button>
        <Button onClick={print}><Printer className="mr-2 h-4 w-4" />{t("farmer.qr.print")}</Button>
      </div>
      <p className="max-w-xs break-all text-center text-[11px] text-ink/40">{t("farmer.qr.content", { url: traceUrl })}</p>
    </div>
  );
}
