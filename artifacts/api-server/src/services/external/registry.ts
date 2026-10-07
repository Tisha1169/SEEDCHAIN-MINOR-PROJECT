import { db, dataSourcesTable } from "@workspace/db";
import pau from "../../../../../data/source_registry/pau_potato_punjab.json";
import mandi from "../../../../../data/source_registry/datagov_mandi_daily.json";
import agmarknet from "../../../../../data/source_registry/agmarknet_portal.json";
import faostat from "../../../../../data/source_registry/faostat_potato_india.json";
import weather from "../../../../../data/source_registry/open_meteo_current.json";
import imd from "../../../../../data/source_registry/imd_mausam.json";
import icar from "../../../../../data/source_registry/icar_cpri_jalandhar.json";
import des from "../../../../../data/source_registry/des_agri.json";
import nhb from "../../../../../data/source_registry/nhb_statistics.json";

export interface RegistryEntry {
  id: string;
  name: string;
  organization: string;
  url: string;
  dataset: string;
  geography: string;
  frequency: string;
  units: string | null;
  licence: string | null;
  usageNotes: string | null;
  dataClass: "operational_external" | "historical" | "reference";
  integration: "automated" | "file_import" | "reference_only";
  staleAfterHours: number | null;
  integrationNote: string | null;
}

/** The files in /data/source_registry are the source of truth; they are bundled into the API and mirrored into the database. */
export const REGISTRY: RegistryEntry[] = [pau, mandi, agmarknet, faostat, weather, imd, icar, des, nhb] as RegistryEntry[];

export type AutomatedSourceId = "pau_potato_punjab" | "datagov_mandi_daily" | "faostat_potato_india" | "open_meteo_current";
export const AUTOMATED_SOURCES: AutomatedSourceId[] = ["datagov_mandi_daily", "open_meteo_current", "pau_potato_punjab", "faostat_potato_india"];

export const registryEntry = (id: string): RegistryEntry => {
  const e = REGISTRY.find((r) => r.id === id);
  if (!e) throw new Error(`Unknown data source ${id}`);
  return e;
};

export async function syncRegistry(): Promise<void> {
  for (const e of REGISTRY) {
    await db
      .insert(dataSourcesTable)
      .values({ ...e, updatedAt: new Date() })
      .onConflictDoUpdate({ target: dataSourcesTable.id, set: { ...e, updatedAt: new Date() } });
  }
}
