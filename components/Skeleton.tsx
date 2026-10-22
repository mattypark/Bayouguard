/* Loading placeholder in the shape of what's coming. Static under
 * prefers-reduced-motion (the global rule stops the pulse). */

export default function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-ob-bg2 ${className}`} />;
}
