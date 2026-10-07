import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

type Mode = "live" | "polling" | "offline";
const RealtimeContext = createContext<Mode>("polling");
export const useRealtimeMode = () => useContext(RealtimeContext);

const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ?? "";

/**
 * Server-Sent Events from the backend (PostgreSQL LISTEN/NOTIFY fan-out)
 * invalidate React Query caches so screens refetch real data. If the stream
 * cannot be established, the app falls back to 20 s polling and says so.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>("polling");
  const failures = useRef(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    let es: EventSource | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    // Includes /api/auth/me so account changes (e.g. admin approval) show up immediately.
    const refetchAll = () => qc.invalidateQueries();
    const startPolling = () => {
      setMode(navigator.onLine ? "polling" : "offline");
      poll ??= setInterval(() => document.visibilityState === "visible" && void refetchAll(), 20_000);
    };
    const stopPolling = () => {
      if (poll) clearInterval(poll);
      poll = null;
    };
    const connect = () => {
      es = new EventSource(`${apiBase}/api/stream`, { withCredentials: true });
      es.addEventListener("ready", () => {
        failures.current = 0;
        stopPolling();
        setMode("live");
        void refetchAll(); // catch up on anything missed while disconnected
      });
      es.addEventListener("change", () => {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(() => void refetchAll(), 250);
      });
      es.onerror = () => {
        failures.current++;
        startPolling();
        if (failures.current > 5) {
          es?.close();
          setTimeout(connect, 30_000);
        }
      };
    };
    connect();
    const onOnline = () => void refetchAll();
    window.addEventListener("online", onOnline);
    return () => {
      es?.close();
      stopPolling();
      if (debounce) clearTimeout(debounce);
      window.removeEventListener("online", onOnline);
    };
  }, [isAuthenticated, qc]);

  return <RealtimeContext.Provider value={mode}>{children}</RealtimeContext.Provider>;
}
