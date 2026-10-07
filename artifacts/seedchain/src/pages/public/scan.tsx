import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { recordScan } from "@workspace/api-client-react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
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
  | { kind: "problem"; title: string; detail: string; retryToken?: string; icon?: "camera" | "network" };

export default function ScanPage() {
  const { t } = useTranslation();
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
        const k = (n: string): string[] => [i18n.t(`scan.${n}Title`), i18n.t(`scan.${n}Body`)];
        const messages: Record<string, string[]> = { DISABLED: k("disabled"), UNKNOWN: k("unknown"), REVOKED: k("revoked"), REPLACED: k("replaced"), INVALID: k("invalid") };
        const msg = messages[r.result] ?? messages.INVALID;
        setState({ kind: "problem", title: msg[0], detail: msg[1] });
      } catch (err) {
        setState({ kind: "problem", title: i18n.t("scan.unreachable"), detail: `${errMsg(err)} ${i18n.t("scan.checkConnection")}`, retryToken: token, icon: "network" });
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
          title: t("scanPage.notSeedchain"),
          detail: /^https?:\/\//i.test(text) ? t("scanPage.otherSite") : t("scanPage.noLink"),
        });
        return;
      }
      void resolve(token, "in_app_scanner");
    },
    [resolve, stop, t],
  );

  const start = useCallback(async () => {
    handling.current = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setState({ kind: "problem", icon: "camera", title: t("scanPage.cameraUnavailable"), detail: window.isSecureContext ? t("scanPage.noCameraBrowser") : t("scanPage.needHttps") });
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
        icon: "camera",
        title: name === "NotAllowedError" ? t("scanPage.permDenied") : name === "NotFoundError" ? t("scanPage.noCameraFound") : t("scanPage.couldNotStart"),
        detail:
          name === "NotAllowedError"
            ? t("scanPage.allowCamera")
            : name === "NotFoundError"
              ? t("scanPage.deviceNoCamera")
              : (err as Error).message,
      });
    }
  }, [onDecoded, t]);

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
        <div className="eyebrow mb-3">{t("scanPage.eyebrow")}</div>
        <h1 className="mb-2 text-4xl font-extralight tracking-tight">{t("scanPage.h1a")} <span className="text-gradient">{t("scanPage.h1b")}</span></h1>
        <p className="mb-6 text-sm font-light text-ink/55">{t("scanPage.lead")}</p>

        <Card className="overflow-hidden !rounded-[32px]">
          <div className={`relative aspect-[3/4] bg-black sm:aspect-square ${showVideo ? "" : "hidden"}`}>
            <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_50%,transparent_55%,rgba(0,0,0,0.6)_100%)]" />
            <div aria-hidden className="pointer-events-none absolute inset-[14%]">
              {["left-0 top-0 border-l-2 border-t-2 rounded-tl-3xl", "right-0 top-0 border-r-2 border-t-2 rounded-tr-3xl", "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-3xl", "bottom-0 right-0 border-b-2 border-r-2 rounded-br-3xl"].map((c) => (<span key={c} className={`absolute h-10 w-10 border-accent ${c}`} />))}
              {state.kind === "scanning" && <span className="scan-beam !left-0 !right-0" />}
            </div>
            {state.kind === "starting" && <div className="absolute inset-0 flex items-center justify-center text-white">{t("scanPage.startingCamera")}</div>}
            {torch.supported && (
              <button onClick={() => void toggleTorch()} className={`absolute bottom-3 right-3 rounded-full p-3 ${torch.on ? "bg-yellow-300 text-black" : "bg-black/60 text-white"}`} aria-label={t("scanPage.toggleFlash")}>
                <Flashlight className="h-5 w-5" />
              </button>
            )}
          </div>
          {!showVideo && (
            <div className="p-8 text-center">
              {state.kind === "checking" ? (
                <>
                  <RefreshCw className="mx-auto mb-3 h-10 w-10 animate-spin text-accent" />
                  <div className="font-medium">{t("scanPage.checking")}</div>
                </>
              ) : state.kind === "problem" ? (
                <>
                  {state.icon === "camera" ? <CameraOff className="mx-auto mb-3 h-10 w-10 text-amber-500" /> : state.icon === "network" ? <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" /> : <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-rose-500" />}
                  <div className="text-lg font-medium">{state.title}</div>
                  <p className="mt-1 text-sm text-ink/60">{state.detail}</p>
                  <Button onClick={() => (state.retryToken ? void resolve(state.retryToken, "in_app_scanner") : void start())} className="mt-4 rounded-full">
                    <RefreshCw className="mr-2 h-4 w-4" />{state.retryToken ? t("scanPage.retry") : t("scanPage.scanAgain")}
                  </Button>
                </>
              ) : (
                <>
                  <ScanLine className="mx-auto mb-3 h-12 w-12 text-accent" />
                  <Button onClick={() => void start()} className="h-12 px-8 text-base"><Camera className="mr-2 h-5 w-5" />{t("scanPage.openCamera")}</Button>
                  <p className="mt-3 text-xs text-ink/45">{t("scanPage.normalCamera")}</p>
                </>
              )}
            </div>
          )}
        </Card>
        {showVideo && <Button variant="ghost" className="mt-3 w-full" onClick={() => { stop(); setState({ kind: "idle" }); }}>{t("scanPage.stopCamera")}</Button>}

        <form
          className="mt-6 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            const token = extractToken(manual);
            if (!token) setState({ kind: "problem", title: t("scanPage.notLink"), detail: t("scanPage.pasteFull") });
            else void resolve(token, "manual_entry");
          }}
        >
          <label className="text-xs font-medium uppercase tracking-wide text-ink/50">{t("scanPage.orPaste")}</label>
          <div className="flex gap-2">
            <input className={inputCls} value={manual} onChange={(e) => setManual(e.target.value)} placeholder="https://…/trace/…" inputMode="url" />
            <Button type="submit" variant="outline" className="h-11 rounded-2xl">{t("scanPage.verify")}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
