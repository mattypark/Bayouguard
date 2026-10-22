/* Current conditions + hourly rain forecast from Open-Meteo (free, no key),
 * in one request. Coordinates are rounded to ~1 km so nearby searches share
 * the cached answer for ten minutes. */

import type { WeatherNow, RainForecast } from './types';

const FORECAST_HOURS = 12;

export async function getConditions(
  lat: number,
  lng: number,
  timeoutMs = 6000,
): Promise<{ weather: WeatherNow | null; rain: RainForecast | null }> {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${lat.toFixed(2)}&longitude=${lng.toFixed(2)}` +
    '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code' +
    '&hourly=precipitation&forecast_hours=' + FORECAST_HOURS +
    '&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch' +
    '&timezone=America%2FChicago';

  try {
    const res = await fetch(url, { next: { revalidate: 600 }, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return { weather: null, rain: null };
    const data = await res.json();
    return { weather: toWeather(data?.current), rain: toRain(data?.hourly) };
  } catch {
    return { weather: null, rain: null };
  }
}

function toWeather(c: Record<string, number> | undefined): WeatherNow | null {
  if (!c) return null;
  return {
    tempF: Math.round(c.temperature_2m),
    code: Number.isFinite(c.weather_code) ? c.weather_code : -1,
    windMph: Math.round(c.wind_speed_10m),
    humidity: Math.round(c.relative_humidity_2m),
  };
}

/* Drives the rain bars and the 6-hour outlook. */
function toRain(h: { time?: string[]; precipitation?: Array<number | null> } | undefined): RainForecast | null {
  const hours = h?.time ?? [];
  const raw = h?.precipitation ?? [];
  if (hours.length === 0 || raw.length === 0) return null;
  const inches = raw.map((v) => (Number.isFinite(v as number) ? (v as number) : 0));
  const sum = (n: number) => inches.slice(0, n).reduce((acc, v) => acc + v, 0);
  return {
    hours: hours.slice(0, FORECAST_HOURS),
    inches: inches.slice(0, FORECAST_HOURS),
    totalNext6h: Math.round(sum(6) * 100) / 100,
    totalNext12h: Math.round(sum(12) * 100) / 100,
  };
}
