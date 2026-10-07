import { lazy, Suspense, useEffect } from "react";
import { useGetPublicOverview } from "@workspace/api-client-react";
import { Navbar, HASH_KEY } from "@/components/layout/navbar";
import { CinematicFrame, Hero } from "@/components/landing/hero";
import { Direct, Identity, Journey, QrScene } from "@/components/landing/story";
import type { LandingProps } from "@/components/landing/shared";

// Below-the-fold scenes are split into their own chunk so the title paints first.
const Proof = lazy(() => import("@/components/landing/proof-bundle"));

export default function Landing() {
  const q = useGetPublicOverview({ query: { queryKey: ["/api/public/overview"], staleTime: 30_000, refetchInterval: 60_000, retry: 1 } });
  // Only trust a well-formed overview; anything else (e.g. no backend reachable) is treated as "no data".
  const data = q.data && typeof q.data === "object" && q.data.traceabilityCoverage ? q.data : undefined;
  const props: LandingProps = { data, loading: q.isLoading, failed: !data && !q.isLoading };

  useEffect(() => {
    let hash: string | null = null;
    try {
      hash = sessionStorage.getItem(HASH_KEY);
      sessionStorage.removeItem(HASH_KEY);
    } catch {
      /* ignore */
    }
    if (hash) setTimeout(() => document.getElementById(hash!)?.scrollIntoView({ behavior: "smooth" }), 350);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <Navbar />
      <main id="main" tabIndex={-1} className="relative z-[2] outline-none">
        <Hero />
        <CinematicFrame {...props} />
        <Identity {...props} />
        <QrScene {...props} />
        <Journey {...props} />
        <Direct />
        <Suspense fallback={<div className="h-[60vh]" />}>
          <Proof {...props} />
        </Suspense>
      </main>
    </div>
  );
}
