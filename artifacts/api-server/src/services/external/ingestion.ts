import { ingestFaostat } from "./adapters/faostat";
import { ingestMarketPrices } from "./adapters/mandi";
import { ingestPau } from "./adapters/pau";
import { ingestWeather } from "./adapters/weather";
import { AUTOMATED_SOURCES, type AutomatedSourceId } from "./registry";

/** Facade over the pipeline: one place to run, list and check external sources. */
export { ingestFaostat, ingestMarketPrices, ingestPau, ingestWeather, AUTOMATED_SOURCES };
export { sourceStatus as integrationStatus, allSourceStatuses, serializeRun, computeFreshness } from "./status";
export { redactUrl } from "./pipeline";
export { normaliseMarketRecord, parseIndianDate } from "./adapters/mandi";
export { describeWeatherCode } from "./adapters/weather";

export type SourceKey = AutomatedSourceId;

export async function runSource(key: SourceKey) {
  switch (key) {
    case "datagov_mandi_daily":
      return ingestMarketPrices();
    case "open_meteo_current":
      return ingestWeather();
    case "pau_potato_punjab":
      return ingestPau();
    case "faostat_potato_india":
      return ingestFaostat();
  }
}
