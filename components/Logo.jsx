export default function Logo({ size = 24 }) {
  const w = size * 1.7;
  const id = "grad-" + Math.random().toString(36).slice(2, 8);
  return (
    <svg width={w} height={size} viewBox="0 0 110 65" role="img" aria-label="Skol Sisters">
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#4F2683" />
          <stop offset="100%" stopColor="#FFC62F" />
        </linearGradient>
      </defs>
      {/* shield */}
      <path d="M10 8 L55 2 L100 8 V38 C100 48 82 60 55 63 C28 60 10 48 10 38 Z"
            fill={`url(#${id})`} stroke="#2a164a" strokeWidth="4" />
      {/* sparkles */}
      <circle cx="82" cy="14" r="3" fill="#fff" />
      <circle cx="90" cy="20" r="2.5" fill="#fff" />
    </svg>
  );
}
