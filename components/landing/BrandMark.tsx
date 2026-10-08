/* BayouGuard's mark: a gauge reading at the centre and the ripple it sends out. */

export default function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="3.4" fill="currentColor" />
      <path d="M16 7.5a8.5 8.5 0 0 1 8.5 8.5M16 24.5A8.5 8.5 0 0 1 7.5 16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="M16 2.5A13.5 13.5 0 0 1 29.5 16M16 29.5A13.5 13.5 0 0 1 2.5 16"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}
