import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./map.css";

export interface MapPin {
  id: string;
  lat: number;
  lon: number;
  title: string;
  lines?: string[];
  /** Short text drawn inside a numbered marker (journey steps). Omit for a plain dot. */
  badge?: string;
}
export interface MapArea {
  id: string;
  lat: number;
  lon: number;
  /** Real radius in kilometres of the approximate area. */
  radiusKm: number;
  title: string;
  lines?: string[];
  /** 0..1, drives fill opacity. */
  intensity: number;
}

function popup(title: string, lines?: string[]): HTMLElement {
  const root = document.createElement("div");
  const t = document.createElement("div");
  t.style.fontWeight = "600";
  t.textContent = title; // textContent on purpose: names come from users
  root.appendChild(t);
  for (const l of lines ?? []) {
    const d = document.createElement("div");
    d.style.opacity = "0.7";
    d.textContent = l;
    root.appendChild(d);
  }
  return root;
}

/** Thin Leaflet wrapper. OpenStreetMap tiles need no key; attribution is mandatory and shown. */
export default function MapView({ pins = [], areas = [], path, height = 360, attribution }: { pins?: MapPin[]; areas?: MapArea[]; path?: [number, number][]; height?: number; attribution: string }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!el.current) return;
    const map = L.map(el.current, { zoomControl: true, scrollWheelZoom: false, attributionControl: true });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution }).addTo(map);
    const bounds: L.LatLngTuple[] = [];

    for (const a of areas) {
      L.circle([a.lat, a.lon], { radius: a.radiusKm * 1000, color: "#e0c36a", weight: 1, fillColor: "#e0c36a", fillOpacity: 0.12 + 0.35 * a.intensity })
        .bindPopup(popup(a.title, a.lines))
        .addTo(map);
      bounds.push([a.lat, a.lon]);
    }
    if (path && path.length > 1) L.polyline(path, { color: "#86d6a0", weight: 2, opacity: 0.7, dashArray: "6 6" }).addTo(map);
    for (const p of pins) {
      const m = p.badge
        ? L.marker([p.lat, p.lon], { icon: L.divIcon({ className: "", html: `<div class="sc-pin-num">${p.badge.replace(/[^\w+-]/g, "")}</div>`, iconSize: [24, 24], iconAnchor: [12, 12] }) })
        : L.circleMarker([p.lat, p.lon], { radius: 8, color: "#07130c", weight: 2, fillColor: "#86d6a0", fillOpacity: 1 });
      m.bindPopup(popup(p.title, p.lines)).addTo(map);
      bounds.push([p.lat, p.lon]);
    }

    if (bounds.length === 1) map.setView(bounds[0], areas.length ? 7 : 12);
    else if (bounds.length > 1) map.fitBounds(L.latLngBounds(bounds), { padding: [36, 36], maxZoom: 12 });
    else map.setView([30.9, 75.85], 7); // Punjab overview, no markers
    const onFocus = () => map.scrollWheelZoom.enable();
    map.on("focus", onFocus);
    map.on("blur", () => map.scrollWheelZoom.disable());
    return () => {
      map.remove();
    };
  }, [pins, areas, path, attribution]);

  return <div ref={el} className="sc-map" style={{ height }} role="region" aria-label="Map" />;
}
