import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useGetScanAreas, useListFarms } from "@workspace/api-client-react";
import { Card, Empty, ErrorState, Loading, PageHeader, Pill } from "@/components/app/common";
import { FarmMap, ScanAreasMap } from "@/components/app/geo-maps";

export default function AdminMapPage() {
  const { t } = useTranslation();
  const [days, setDays] = useState(30);
  const [showScans, setShowScans] = useState(true);
  const farms = useListFarms({ query: { queryKey: ["/api/farms", "admin-map"], refetchInterval: 30_000 } });
  const areas = useGetScanAreas({ days }, { query: { queryKey: ["/api/admin/scans/areas", days], refetchInterval: 30_000, enabled: showScans } });
  return (
    <>
      <PageHeader title={t("map.page.title")} subtitle={t("map.page.subtitle")} />
      <div className="space-y-5">
        {farms.isLoading ? <Loading /> : farms.error || !farms.data ? <ErrorState error={farms.error} onRetry={() => void farms.refetch()} /> : <FarmMap farms={farms.data} showFarmer />}
        <Card className="p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-2xl">
              <h3 className="font-medium">{t("map.scans.title")}</h3>
              <p className="text-xs text-ink/50">{t("map.scans.subtitle", { km: areas.data?.approxCellKm ?? 55 })}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-ink/70">
              <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={showScans} onChange={(e) => setShowScans(e.target.checked)} />{t("map.scans.layer")}</label>
              <label className="inline-flex items-center gap-1.5">{t("map.scans.window")}
                <select className="rounded-full border bg-glass-2 px-3 py-1.5" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                  {[7, 30, 90, 365].map((n) => <option key={n} value={n}>{t("map.scans.days", { n })}</option>)}
                </select>
              </label>
              <Pill className="bg-white/10 text-ink/60">{t("map.live")}</Pill>
            </div>
          </div>
          {!showScans ? null : areas.isLoading ? <Loading /> : areas.error || !areas.data ? <ErrorState error={areas.error} onRetry={() => void areas.refetch()} /> : (
            <>
              <div className="mb-2 text-xs text-ink/60">{t("map.scans.summary", { located: areas.data.scansWithSharedLocation, ok: areas.data.okScans, days: areas.data.days })}</div>
              {areas.data.cells.length ? <ScanAreasMap cells={areas.data.cells} approxCellKm={areas.data.approxCellKm} /> : <Empty title={t("map.scans.none")} hint={t("map.scans.noneHint")} />}
            </>
          )}
        </Card>
      </div>
    </>
  );
}
