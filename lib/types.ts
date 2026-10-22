import type { RawTier } from './contract';

export type Tier = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/** live — /risk and /gauges both answered; partial — some real data (one of
 * them, or gauges read straight from HCFWS); demo — fixtures only. */
export type DataSource = 'live' | 'partial' | 'demo';

/** model — the backend's random forest; rules — the backend answered but not
 * with the model; gauge-estimate — /risk failed, scored from the nearest
 * gauge's headroom here; demo — fixtures. */
export type RiskSource = 'model' | 'rules' | 'gauge-estimate' | 'demo';

export interface RiskSnapshot {
  address: string;
  zip: string;
  score: number;          // 0..100
  tier: Tier;
  rawTier: RawTier;       // the backend's five-tier value (SAFE folds into LOW for display)
  source: RiskSource;
  bufferFt: number | null;        // headroom at the nearest gauge
  nearestMiles: number | null;    // distance to that gauge
  nearestName: string | null;
  /** The backend's English sentence — debugging only, never shown raw. */
  backendMessage?: string;
  updatedAt: string;      // ISO timestamp
}

export interface BayouReading {
  id: number;
  name: string;
  miles: number;          // from the searched address
  stage: number;          // current ft
  flood: number;          // flood-stage ft
  spark: number[];        // recent readings
  trend?: number;         // ft/hr; >0 rising, <0 falling
}

export interface WeatherNow {
  tempF: number;
  code: number;           // WMO weather code; the UI translates it
  windMph: number;
  humidity: number;
}

// Hourly precipitation forecast for the searched point (next ~12h).
export interface RainForecast {
  hours: string[];        // ISO hour timestamps
  inches: number[];       // precipitation per hour, inches
  totalNext6h: number;    // summed inches over the next 6 hours
  totalNext12h: number;   // summed inches over the next 12 hours
}

export interface DriveVerdict {
  state: 'YES' | 'CAUTION' | 'NO';
}

// Where the water is heading over the next ~6 hours. Combines the nearest
// gauge's live trend, its remaining headroom, and the incoming rain forecast.
// Carries the numbers, not sentences — the UI words it in the reader's language.
export interface Outlook {
  level: 'CLEAR' | 'WATCH' | 'WARNING';
  kind: 'worsening' | 'rising' | 'rain' | 'receding' | 'steady';
  trend: 'rising' | 'falling' | 'steady';
  trendFtHr: number;
  bufferFt: number;
  rain6: number;          // inches forecast over the next 6 hours
}

export interface HomeSnapshot {
  risk: RiskSnapshot;
  weather: WeatherNow | null;
  drive: DriveVerdict;
  bayous: BayouReading[];
  rain?: RainForecast;
  outlook?: Outlook;
}

// A single flood gauge with location, for plotting on the map.
export interface GaugePoint {
  id: number;
  lat: number;
  lng: number;
  current: number;        // current level ft
  flood: number;          // flood-stage ft
  buffer: number;         // ft until flood (flood - current)
  tier: Tier;
  rawTier: RawTier;
  name: string;           // "Brays Bayou @ Main Street", or "Gauge 123"
  trend?: number;         // ft/hr from HCFWS (CurrentGageTrend)
  rainfall?: number;      // inches at this site over the feed window
  readAt?: string;        // ISO timestamp of the latest reading
  county?: string;        // owning flood-warning network
}

// Everything the map view needs: the snapshot, the searched location, all gauges.
export interface FloodView {
  /** Null until an address has been searched (or when it can't be scored). */
  snapshot: HomeSnapshot | null;
  center: { lat: number; lng: number } | null;
  /** The searched address as resolved, when there is one. */
  address: string | null;
  gauges: GaugePoint[];
  dataSource: DataSource;
  /** Where the gauge list came from. */
  gaugeSource: 'backend' | 'hcfws' | 'demo';
  /** The backend was configured but didn't answer in time — likely asleep. */
  backendTimedOut: boolean;
  /** The server render gave up waiting; the client should fetch the live view. */
  pending?: boolean;
  /** The address couldn't be geocoded. */
  notFound?: boolean;
  /** The address is outside the Houston service area. */
  outOfArea?: boolean;
  fetchedAt: string;
  /** Served by the service worker from the last good answer while offline. */
  offline?: boolean;
}
