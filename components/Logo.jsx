export default function Logo({ size = 32 }) {
  const w = size * 1.1, h = size;
  return (
    <svg width={w} height={h} viewBox="0 0 110 100" role="img" aria-label="Skol Sisters Logo">
      <defs>
        <linearGradient id="grad" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#4F2683" />
          <stop offset="100%" stopColor="#FFC62F" />
        </linearGradient>
      </defs>
      <path d="M55 5 L95 25 V55 C95 75 75 90 55 95 C35 90 15 75 15 55 V25 Z" fill="url(#grad)" stroke="#240E44" strokeWidth="4"/>
      <path d="M30 52c8-14 28-10 33-23 3-7-3-13-10-14 10-2 22 6 20 18-3 17-27 18-34 30-4 6-2 13 3 16-11-1-20-14-12-27z" fill="#fff" opacity="0.95"/>
      <circle cx="78" cy="24" r="3" fill="#fff"/>
      <circle cx="86" cy="30" r="2.5" fill="#fff"/>
    </svg>
  );
}