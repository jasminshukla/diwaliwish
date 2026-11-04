export function Diya({ lit, size = 120 }: { lit: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden>
      <defs>
        <radialGradient id="fg" cx="50%" cy="70%" r="60%">
          <stop offset="0%" stopColor="#FFF8E7" />
          <stop offset="45%" stopColor="#FF9933" />
          <stop offset="100%" stopColor="#FF6B20" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bowl" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#8a4b12" />
        </linearGradient>
      </defs>
      {lit && <circle cx="60" cy="52" r="40" fill="url(#fg)" opacity="0.35" />}
      {lit && (
        <g className="flame">
          <path d="M60 22 C70 40 70 55 60 62 C50 55 50 40 60 22Z" fill="url(#fg)" />
          <path d="M60 38 C64 47 64 54 60 58 C56 54 56 47 60 38Z" fill="#FFF8E7" />
        </g>
      )}
      <path d="M14 66 Q60 64 106 66 Q98 98 60 100 Q22 98 14 66Z" fill="url(#bowl)" />
      <path d="M20 70 Q60 78 100 70" stroke="#FFD86B" strokeWidth="2" fill="none" />
      <circle cx="40" cy="84" r="3" fill="#FF9933" /><circle cx="60" cy="88" r="3" fill="#FF9933" /><circle cx="80" cy="84" r="3" fill="#FF9933" />
    </svg>
  );
}

export function Mandala({ className = "" }: { className?: string }) {
  const petals = Array.from({ length: 16 });
  return (
    <svg viewBox="-100 -100 200 200" className={className} aria-hidden>
      <g fill="none" stroke="#D4AF37" strokeWidth="0.6" opacity="0.5">
        {[90, 70, 50, 30].map((r) => <circle key={r} r={r} />)}
        {petals.map((_, i) => (
          <g key={i} transform={`rotate(${i * 22.5})`}>
            <path d="M0 -30 Q12 -60 0 -90 Q-12 -60 0 -30Z" />
            <path d="M0 -50 Q6 -60 0 -70 Q-6 -60 0 -50Z" fill="#FF9933" fillOpacity="0.3" />
            <circle cy="-80" r="3" />
          </g>
        ))}
      </g>
    </svg>
  );
}
