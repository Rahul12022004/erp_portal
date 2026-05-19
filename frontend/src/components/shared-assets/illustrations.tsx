export function Illustration({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 240 180"
      aria-hidden="true"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="20" y="24" width="200" height="132" rx="24" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
      <rect x="40" y="48" width="72" height="88" rx="18" fill="hsl(var(--primary) / 0.12)" />
      <rect x="128" y="48" width="72" height="20" rx="10" fill="hsl(var(--primary) / 0.18)" />
      <rect x="128" y="80" width="56" height="12" rx="6" fill="hsl(var(--muted))" />
      <rect x="128" y="102" width="48" height="12" rx="6" fill="hsl(var(--muted))" />
      <circle cx="76" cy="82" r="18" fill="hsl(var(--primary))" />
      <path d="M64 118C68 108 78 104 88 106C94 108 98 112 100 118" stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round" />
      <path d="M54 82L64 92L96 60" stroke="hsl(var(--primary-foreground))" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
