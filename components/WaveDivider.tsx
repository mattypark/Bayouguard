/* Reusable thin wavy section divider. */
export default function WaveDivider({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      className={`block h-6 w-full ${flip ? 'rotate-180' : ''}`}
      viewBox="0 0 1440 40"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        fill="#E3EDFF"
        d="M0,20 C240,40 480,0 720,20 C960,40 1200,0 1440,20 L1440,40 L0,40 Z"
      />
    </svg>
  );
}
