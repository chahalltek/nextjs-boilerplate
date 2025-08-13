// components/Logo.tsx
export default function Logo({ size = 28 }: { size?: number }) {
  const w = size * 1.1;
  const h = size;
  const id = "grad-" + Math.random().toString(36).slice(2, 7);
  return (
    <svg width={w} height={h} viewBox="0 0 55 50" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#9B5CF6" />
          <stop offset="1" stopColor="#F2C94C" />
        </linearGradient>
      </defs>
      <path
        d="M27.5 2.5l20 6v14c0 11-8 18-20 25C15.3 41.5 7.5 34 7.5 22.5v-14l20-6z"
        fill={`url(#${id})`}
        stroke="rgba(255,255,255,.4)"
        strokeWidth="1.2"
      />
      <circle cx="27.5" cy="20" r="6.5" fill="rgba(0,0,0,.25)" />
      <path d="M22 34h11" stroke="rgba(255,255,255,.5)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
