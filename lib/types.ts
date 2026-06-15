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
