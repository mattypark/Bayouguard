export default function WeatherStrip() {
  return (
    <div className="bg-cs-navy/95 text-white">
      <div className="mx-auto flex h-10 max-w-6xl items-center justify-between gap-4 px-4 text-xs md:text-sm">
        <span className="flex items-center gap-2">
          <span aria-hidden>☁️</span>
          <span>Houston · 78°F · Partly cloudy</span>
        </span>
        <span className="hidden sm:inline opacity-80">Wind 12 mph SE · Humidity 71%</span>
        <span className="opacity-70">Updated 2 min ago</span>
      </div>
    </div>
  );
}
