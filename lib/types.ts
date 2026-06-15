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
}

export interface WeatherNow {
  tempF: number;
  conditions: string;     // "Partly cloudy"
  windMph: number;
  humidity: number;
}

export interface DriveVerdict {
  state: 'YES' | 'CAUTION' | 'NO';
  message: string;
}

export interface HomeSnapshot {
  risk: RiskSnapshot;
  weather: WeatherNow;
  drive: DriveVerdict;
  bayous: BayouReading[];
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
}

// Everything the map view needs: the snapshot, the searched location, all gauges.
export interface FloodView {
  snapshot: HomeSnapshot;
  center: { lat: number; lng: number } | null;
  gauges: GaugePoint[];
}
