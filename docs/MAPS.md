# Maps (farm locations, lot journey, scan areas)

Built with Leaflet and OpenStreetMap tiles: free, no API key. Attribution ("Map data © OpenStreetMap contributors") is shown on every map as the tile policy requires. For heavy production traffic move to a hosted tile provider or self-hosted tiles; the OSM tile servers are for light use.

| View | Who | Source of positions | Where |
|---|---|---|---|
| Farm map | Farmer (own farms) · Admin (all farms, with farmer name) | Coordinates the farmer entered or captured with "Use my location". Farms without coordinates are counted, never placed by guessing. | Farmer → Farms & products · Admin → Farm & scan map |
| Journey map | Farmer (own lots) · Admin | Latitude/longitude stored on each trace event (lot registration and harvest use the farm's GPS; order handover can attach GPS). Only events that really carry coordinates are drawn; the rest are listed as "no coordinates". Steps at the same point share one numbered pin. | Lot detail page |
| Scan areas | **Admin only** (API returns 403 to everyone else) | OK scans whose scanner chose to share a location; positions are rounded to 0.1° on write and then grouped into 0.5° (about 55 km) cells. Drawn as circles of that size, never as points. | Admin → Farm & scan map; `GET /api/admin/scans/areas?days=` |

## Privacy rules enforced
- The public QR page never shows coordinates, only place names.
- No IP address or precise scan location is stored.
- Scan-area responses contain cell centres on a fixed grid, so they cannot equal an exact submitted point (covered by `test/map.test.ts`).
- Tile images send only the site origin as Referer (`referrerPolicy: "origin"`) because OpenStreetMap blocks requests without one (HTTP 403 "Access blocked"); every other request keeps `Referrer-Policy: no-referrer`.
- Farmer and admin map views refresh every 30 seconds; this is polling, not a live GPS feed.

## Not built
Continuous tracking of produce in transit (no logistics role or IoT by design), district boundary polygons (cells are a coarse grid, not administrative districts), and a public map.
