import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { recordScan } from "@workspace/api-client-react";
import { AlertTriangle, Camera, CameraOff, Flashlight, RefreshCw, ScanLine, ShieldAlert } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, inputCls } from "@/components/app/common";
import { uuid, errMsg } from "@/lib/api";
import { extractToken } from "@/lib/qr";

type State =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "scanning" }
  | { kind: "checking" }
  | { kind: "problem"; title: string; detail: string; retryToken?: string };

export default function ScanPage() {
  const [, navigate] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const handling = useRef(false);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [torch, setTorch] = useState<{ supported: boolean; on: boolean }>({ supported: false, on: false });
  const [manual, setManual] = useState("");

  const stop = useCallback(() => {
    controls.current?.stop();
    controls.current = null;
    const v = videoRef.current;
    (v?.srcObject as MediaStream | null)?.getTracks().forEach((t) => t.stop());
    if (v) v.srcObject = null;
    setTorch({ supported: false, on: false });
  }, []);
  useEffect(() => stop, [stop]);

  const resolve = useCallback(
    async (token: string, source: "in_app_scanner" | "manual_entry") => {
      setState({ kind: "checking" });
      try {
        const r = await recordScan({ publicToken: token, scanSource: source, clientEventId: uuid(), deviceType: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : "desktop" });
        if (r.result === "OK") {
          navigate(`/trace/${token}?s=app`);
          return;
        }
        const msg = {
          UNKNOWN: ["Unknown QR", "This looks like a SeedChain code but it is not in our records. It may be counterfeit or damaged."],
          REVOKED: ["QR revoked", "This label was revoked by an administrator. Do not rely on it. Contact the seller."],
          REPLACED: ["QR replaced", "This label was replaced by a newer one. Scan the current label on the produce."],
          INVALID: ["Invalid QR", "This code is not a SeedChain trace QR."],
        }[r.result];
        setState({ kind: "problem", title: msg[0], detail: msg[1] });
      } catch (err) {
        setState({ kind: "problem", title: "Cannot reach SeedChain", detail: `${errMsg(err)} Check your connection and try again.`, retryToken: token });
      } finally {
        handling.current = false;
      }
    },
    [navigate],
  );

  const onDecoded = useCallback(
    (text: string) => {
      if (handling.current) return; // duplicate frames of the same code
      handling.current = true;
      stop(); // the camera stops as soon as a code is read
      const token = extractToken(text);
      if (!token) {
        handling.current = false;
        setState({
          kind: "problem",
          title: "Not a SeedChain QR",
          detail: /^https?:\/\//i.test(text) ? "This QR points to a different website, so we did not open it." : "This QR does not contain a SeedChain trace link.",
        });
        return;
      }
      void resolve(token, "in_app_scanner");
    },
    [resolve, stop],
  );

  const start = useCallback(async () => {
    handling.current = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setState({ kind: "problem", title: "Camera not available", detail: window.isSecureContext ? "This browser cannot access a camera." : "Camera access needs a secure (HTTPS) connection. Open SeedChain over HTTPS, or use your phone's normal camera app to scan the QR." });
      return;
    }
    setState({ kind: "starting" });
    try {
      const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 120 });
      controls.current = await reader.decodeFromConstraints({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false }, videoRef.current!, (result) => {
        if (result) onDecoded(result.getText());
      });
      const track = (videoRef.current?.srcObject as MediaStream | null)?.getVideoTracks()[0];
      const caps = (track?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
      setTorch({ supported: !!caps.torch, on: false });
      setState({ kind: "scanning" });
    } catch (err) {
      const name = (err as DOMException).name;
      setState({
        kind: "problem",
        title: name === "NotAllowedError" ? "Camera permission denied" : name === "NotFoundError" ? "No camera found" : "Could not start the camera",
        detail:
          name === "NotAllowedError"
            ? "Allow camera access in your browser settings and try again, or paste the QR link below."
            : name === "NotFoundError"
              ? "This device has no camera. Paste the QR link below instead."
              : (err as Error).message,
      });
    }
  }, [onDecoded]);

  const toggleTorch = async () => {
    const track = (videoRef.current?.srcObject as MediaStream | null)?.getVideoTracks()[0];
    if (!track) return;
    const on = !torch.on;
    try {
      await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
      setTorch({ supported: true, on });
    } catch {
      setTorch({ supported: false, on: false });
    }
  };

  const showVideo = state.kind === "starting" || state.kind === "scanning";
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="relative z-[2] mx-auto max-w-md px-4 pb-16 pt-24 sm:pt-28">
        <div className="eyebrow mb-3">Trace</div>
        <h1 className="mb-2 text-4xl font-extralight tracking-tight">Scan it. <span className="text-gradient">Know where it came from.</span></h1>
        <p className="mb-6 text-sm font-light text-ink/55">Point your camera at the label on the produce. We look the lot up live. Nothing is cached.</p>

        <Card className="overflow-hidden !rounded-[32px]">
          <div className={`relative aspect-[3/4] bg-black sm:aspect-square ${showVideo ? "" : "hidden"}`}>
            <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_50%,transparent_55%,rgba(0,0,0,0.6)_100%)]" />
            <div aria-hidden className="pointer-events-none absolute inset-[14%]">
              {["left-0 top-0 border-l-2 border-t-2 rounded-tl-3xl", "right-0 top-0 border-r-2 border-t-2 rounded-tr-3xl", "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-3xl", "bottom-0 right-0 border-b-2 border-r-2 rounded-br-3xl"].map((c) => (<span key={c} className={`absolute h-10 w-10 border-accent ${c}`} />))}
              {state.kind === "scanning" && <span className="scan-beam !left-0 !right-0" />}
            </div>
            {state.kind === "starting" && <div className="absolute inset-0 flex items-center justify-center text-white">Starting camera…</div>}
            {torch.supported && (
              <button onClick={() => void toggleTorch()} className={`absolute bottom-3 right-3 rounded-full p-3 ${torch.on ? "bg-yellow-300 text-black" : "bg-black/60 text-white"}`} aria-label="Toggle flashlight">
                <Flashlight className="h-5 w-5" />
              </button>
            )}
          </div>
          {!showVideo && (
            <div className="p-8 text-center">
              {state.kind === "checking" ? (
                <>
                  <RefreshCw className="mx-auto mb-3 h-10 w-10 animate-spin text-accent" />
                  <div className="font-medium">Checking with SeedChain…</div>
                </>
              ) : state.kind === "problem" ? (
                <>
                  {state.title.includes("permission") || state.title.includes("camera") || state.title.includes("Camera") ? <CameraOff className="mx-auto mb-3 h-10 w-10 text-amber-500" /> : state.title.includes("Cannot reach") ? <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" /> : <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-rose-500" />}
                  <div className="text-lg font-medium">{state.title}</div>
                  <p className="mt-1 text-sm text-ink/60">{state.detail}</p>
                  <Button onClick={() => (state.retryToken ? void resolve(state.retryToken, "in_app_scanner") : void start())} className="mt-4 rounded-full bg-glass-2 text-neutral-950">
                    <RefreshCw className="mr-2 h-4 w-4" />{state.retryToken ? "Retry" : "Scan again"}
                  </Button>
                </>
              ) : (
                <>
                  <ScanLine className="mx-auto mb-3 h-12 w-12 text-accent" />
                  <Button onClick={() => void start()} className="h-12 px-8 text-base"><Camera className="mr-2 h-5 w-5" />Open camera</Button>
                  <p className="mt-3 text-xs text-ink/45">You can also scan with your phone's normal camera app. It opens the same page.</p>
                </>
              )}
            </div>
          )}
        </Card>
        {showVideo && <Button variant="ghost" className="mt-3 w-full" onClick={() => { stop(); setState({ kind: "idle" }); }}>Stop camera</Button>}

        <form
          className="mt-6 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            const token = extractToken(manual);
            if (!token) setState({ kind: "problem", title: "Not a SeedChain QR link", detail: "Paste the full link printed under the QR, e.g. https://…/trace/…" });
            else void resolve(token, "manual_entry");
          }}
        >
          <label className="text-xs font-medium uppercase tracking-wide text-ink/50">Or paste the QR link</label>
          <div className="flex gap-2">
            <input className={inputCls} value={manual} onChange={(e) => setManual(e.target.value)} placeholder="https://…/trace/…" inputMode="url" />
            <Button type="submit" variant="outline" className="h-11 rounded-2xl">Verify</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
