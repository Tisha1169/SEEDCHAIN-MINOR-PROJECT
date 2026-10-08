import { useTranslation } from "react-i18next";
import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Printer } from "lucide-react";
import { getGetPublicTraceQueryKey, useGetPublicTrace } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

export interface QrLabelProps {
  traceUrl: string;
  lotCode: string;
  productName: string;
  variety: string;
  origin: string;
  /** When set, this is a package label: it carries the package number, quantity and the serial of its tamper-evident seal. */
  pkg?: { label: string; quantityText: string; sealId: string };
  compact?: boolean;
}

const W = 360;
const GREEN = "#1F4D36";
const AMBER = "#A57A2D";
const INK = "#1D1D1B";
const MUTED = "#6B6A5C";
const IVORY = "#F7F3E8";
const FONT = 'Inter,"Helvetica Neue",Arial,sans-serif';
const MONO = 'ui-monospace,Menlo,"SF Mono",monospace';

const tokenOf = (url: string) => url.split("/trace/")[1]?.split(/[?#]/)[0] ?? "";

function Tick({ x, y, ok }: { x: number; y: number; ok: boolean }) {
  return ok ? (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="7" cy="7" r="7" fill={GREEN} />
      <path d="M3.8 7.2l2.1 2.1 4.3-4.6" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ) : (
    <circle cx={x + 7} cy={y + 7} r="6.2" fill="none" stroke={AMBER} strokeWidth="1.4" strokeDasharray="2 2" />
  );
}

/**
 * The SeedChain physical identity. The QR is deliberately plain: black on white, error correction Q, with a full
 * quiet zone on its own white panel, so it scans reliably. Branding sits around it, never inside it. The QR encodes
 * ONLY the public trace URL. Check rows are drawn from the same public data the trace page shows, so the label can
 * never claim more than the record says.
 */
export function QrLabel({ traceUrl, lotCode, productName, variety, origin, pkg, compact }: QrLabelProps) {
  const { t } = useTranslation();
  const ref = useRef<SVGSVGElement>(null);
  const token = tokenOf(traceUrl);
  const trace = useGetPublicTrace(token, { query: { queryKey: getGetPublicTraceQueryKey(token), enabled: !!token, retry: false, staleTime: 30_000 } }).data;

  const rows: { ok: boolean; text: string }[] = [{ ok: true, text: "LOT REGISTERED" }];
  if (trace) {
    rows.push(trace.digitalIdentity.farmerVerified ? { ok: true, text: "FARM VERIFIED" } : { ok: false, text: "FARM VERIFICATION PENDING" });
    if (trace.digitalIdentity.quality === "INSPECTED") rows.push({ ok: true, text: "QUALITY INSPECTED" });
    else if (trace.digitalIdentity.quality === "RECORDED_BY_FARMER") rows.push({ ok: true, text: "QUALITY RECORDED BY FARMER" });
  }
  const verified = !!trace?.digitalIdentity.farmerVerified;

  const infoY = 436;
  const detailsY = infoY + (pkg ? 82 : 56); // below the lot code (and the package/seal lines when present)
  const checksY = detailsY + 26;
  const H = checksY + rows.length * 20 + 62;

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
  const fileBase = `${lotCode}${pkg ? `-${pkg.label}` : ""}-label`;
  const downloadSvg = () => download(new Blob([serialize()], { type: "image/svg+xml" }), `${fileBase}.svg`);
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
      canvas.toBlob((b) => b && download(b, `${fileBase}.png`), "image/png");
    };
    img.src = url;
  };
  const print = () => {
    const w = window.open("", "_blank", "width=480,height=760");
    if (!w) return;
    w.document.write(`<!doctype html><title>${lotCode} label</title><style>@page{margin:8mm}body{margin:0;display:flex;justify-content:center}svg{width:90mm;height:auto}</style>${serialize()}`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className={`h-auto w-full rounded-[22px] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.85)] ${compact ? "max-w-[280px]" : "max-w-[360px]"}`} role="img" aria-label={t("farmer.qr.ariaLabel", { code: lotCode })}>
        <rect width={W} height={H} rx="22" fill={IVORY} />
        <rect x="9" y="9" width={W - 18} height={H - 18} rx="16" fill="none" stroke={GREEN} strokeOpacity="0.5" strokeWidth="1" />

        {/* wordmark, outside the QR */}
        <g transform={`translate(${W / 2 - 11} 24) scale(0.92)`}>
          <path d="M12 2.5c4.6 1.3 7.6 5.1 7.6 9.7 0 4.9-3.4 8.3-7.6 9.3-4.2-1-7.6-4.4-7.6-9.3 0-4.6 3-8.4 7.6-9.7Z" fill="none" stroke={GREEN} strokeWidth="1.5" />
          <path d="M12 21.5V9m0 4.5c-2-.2-3.6-1.3-4.4-3M12 15.5c2-.2 3.6-1.3 4.4-3" fill="none" stroke={GREEN} strokeWidth="1.5" strokeLinecap="round" />
        </g>
        <text x={W / 2} y="68" textAnchor="middle" fontFamily={FONT} fontWeight="700" fontSize="22" letterSpacing="6" fill={GREEN}>SEEDCHAIN</text>
        <text x={W / 2} y="86" textAnchor="middle" fontFamily={FONT} fontWeight="600" fontSize="9" letterSpacing="3.2" fill={AMBER}>FROM FARM TO PROOF</text>

        {/* QR on its own white panel: black on white, full quiet zone */}
        <g stroke={GREEN} strokeWidth="2" strokeLinecap="round" fill="none">
          <path d="M34 112v-14h14" /><path d={`M${W - 34} 112v-14h-14`} /><path d={`M34 ${112 + 264}v14h14`} /><path d={`M${W - 34} ${112 + 264}v14h-14`} />
        </g>
        <rect x="44" y="108" width="272" height="272" rx="14" fill="#fff" stroke="#E4DDC8" />
        <QRCodeSVG x={56} y={120} width={248} height={248} value={traceUrl} level="Q" marginSize={4} bgColor="#FFFFFF" fgColor="#000000" />

        <text x={W / 2} y="406" textAnchor="middle" fontFamily={FONT} fontSize="12.5" fontWeight="700" letterSpacing="5" fill={GREEN}>{pkg ? "SCAN THIS PACKAGE" : "SCAN TO TRACE"}</text>
        <text x={W / 2} y="422" textAnchor="middle" fontFamily={FONT} fontSize="10" fill={MUTED}>Scan to view provenance</text>

        <line x1="40" x2={W - 40} y1={infoY - 2} y2={infoY - 2} stroke={GREEN} strokeOpacity="0.25" />
        <text x={W / 2} y={infoY + 16} textAnchor="middle" fontFamily={FONT} fontSize="8.5" fontWeight="700" letterSpacing="3.4" fill={MUTED}>LOT ID</text>
        <text x={W / 2} y={infoY + 38} textAnchor="middle" fontFamily={MONO} fontWeight="700" fontSize="19" letterSpacing="0.6" fill={INK}>{lotCode}</text>
        {pkg && (
          <>
            <text x={W / 2} y={infoY + 58} textAnchor="middle" fontFamily={FONT} fontSize="11.5" fontWeight="700" fill={INK}>{pkg.label} · {pkg.quantityText}</text>
            <text x={W / 2} y={infoY + 74} textAnchor="middle" fontFamily={MONO} fontSize="10.5" fill={MUTED}>SEAL {pkg.sealId}</text>
          </>
        )}
        <text x={W / 2} y={detailsY + 10} textAnchor="middle" fontFamily={FONT} fontSize="10.5" fill={MUTED}>{productName} · {variety} · {origin.length > 30 ? `${origin.slice(0, 29)}…` : origin}</text>

        {rows.map((r, i) => (
          <g key={r.text}>
            <Tick x={86} y={checksY + i * 20 - 3} ok={r.ok} />
            <text x={108} y={checksY + i * 20 + 8} fontFamily={FONT} fontSize="10" fontWeight="700" letterSpacing="1.6" fill={r.ok ? INK : AMBER}>{r.text}</text>
          </g>
        ))}

        <line x1="40" x2={W - 40} y1={H - 44} y2={H - 44} stroke={GREEN} strokeOpacity="0.25" />
        <text x={W / 2} y={H - 24} textAnchor="middle" fontFamily={FONT} fontSize="11" fontWeight="700" letterSpacing="3.2" fill={GREEN}>{verified ? "SEEDCHAIN VERIFIED" : "SEEDCHAIN REGISTERED"}</text>
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
