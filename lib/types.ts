export type Tier = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskSnapshot {
  address: string;
  zip: string;
  score: number;          // 0..100
  tier: Tier;
  message: string;        // plain-language one-liner
  updatedAt: string;      // ISO timestamp
}

export interface BayouReading {
  name: string;
  stage: number;          // current ft
  flood: number;          // flood-stage ft
  spark: number[];        // recent readings
  trend?: number;         // ft/hr; >0 rising, <0 falling
}

export interface WeatherNow {
  tempF: number;
  conditions: string;     // "Partly cloudy"
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
  message: string;
}

// Where the water is heading over the next ~6 hours, in plain language.
// Combines the nearest gauge's live trend, its remaining headroom, and the
// incoming rain forecast.
export interface Outlook {
  level: 'CLEAR' | 'WATCH' | 'WARNING';
  headline: string;       // "Holding steady", "Rising — watch conditions", ...
  detail: string;         // one-sentence explanation with the numbers
}

export interface HomeSnapshot {
  risk: RiskSnapshot;
  weather: WeatherNow;
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
  trend?: number;         // ft/hr from HCFWS (CurrentGageTrend)
  rainfall?: number;      // inches at this site over the feed window
  readAt?: string;        // ISO timestamp of the latest reading
  county?: string;        // owning flood-warning network
}

// Everything the map view needs: the snapshot, the searched location, all gauges.
export interface FloodView {
  snapshot: HomeSnapshot;
  center: { lat: number; lng: number } | null;
  gauges: GaugePoint[];
}
