/* Current conditions + hourly rain forecast from Open-Meteo (free, no key). */

import type { WeatherNow, RainForecast } from './types';

// WMO weather interpretation codes -> plain-language conditions.
const WMO: Record<number, string> = {
  0: 'Clear',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  80: 'Rain showers',
  81: 'Rain showers',
  82: 'Violent showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm + hail',
  99: 'Severe thunderstorm',
};

export async function getWeather(
  lat: number,
  lng: number,
): Promise<WeatherNow | null> {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${lat}&longitude=${lng}` +
    '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code' +
    '&temperature_unit=fahrenheit&wind_speed_unit=mph';

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const c = data?.current;
    if (!c) return null;
    return {
      tempF: Math.round(c.temperature_2m),
      conditions: WMO[c.weather_code] ?? '—',
      windMph: Math.round(c.wind_speed_10m),
      humidity: Math.round(c.relative_humidity_2m),
    };
  } catch {
    return null;
  }
}

const FORECAST_HOURS = 12;

/* Hourly precipitation for the next 12 hours at a point. Drives the rain bars
 * in the inspector and the 6-hour outlook. Null on any failure. */
export async function getRainForecast(
  lat: number,
  lng: number,
): Promise<RainForecast | null> {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${lat}&longitude=${lng}` +
    '&hourly=precipitation&precipitation_unit=inch' +
    '&forecast_hours=' + FORECAST_HOURS +
    '&timezone=America%2FChicago';

  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const data = await res.json();
    const hours: string[] = data?.hourly?.time ?? [];
    const raw: Array<number | null> = data?.hourly?.precipitation ?? [];
    if (hours.length === 0 || raw.length === 0) return null;

    const inches = raw.map((v) => (Number.isFinite(v as number) ? (v as number) : 0));
    const sum = (n: number) =>
      inches.slice(0, n).reduce((acc, v) => acc + v, 0);

    return {
      hours: hours.slice(0, FORECAST_HOURS),
      inches: inches.slice(0, FORECAST_HOURS),
      totalNext6h: Math.round(sum(6) * 100) / 100,
      totalNext12h: Math.round(sum(12) * 100) / 100,
    };
  } catch {
    return null;
  }
}
