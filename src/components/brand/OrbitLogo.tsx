/**
 * Rohde brand mark — faithful SVG trace of the delivered logo: the ROHDE
 * bubble wordmark (white fill, heavy outline, black 3D offset) riding tilted
 * concentric orbit rings, three outline stars upper-right and the swoosh
 * accent left of the R.
 *
 * Wide lockup (800×320, aspect 2.5:1). `size` sets the height. Defaults to
 * currentColor so UI surfaces (nav, footer, empty states) keep working; the
 * print system passes explicit ink/fill for garments.
 */
export function OrbitLogo({
  size = 32,
  ink,
  letterFill,
  className = "",
}: {
  /** Rendered height in px; width follows the 2.5:1 aspect. */
  size?: number;
  /** Stroke ink for rings, stars, swoosh, letter outlines + shadow. */
  ink?: string;
  /** Letter fill; "none" keeps letters hollow (streetwear stencil look). */
  letterFill?: string;
  className?: string;
}) {
  const stroke = ink ?? "currentColor";
  const fill = letterFill ?? "none";

  return (
    <svg
      width={size * 2.5}
      height={size}
      viewBox="0 0 800 320"
      fill="none"
      role="img"
      aria-label="Rohde logo"
      className={className}
    >
      {/* ── Orbit rings — tilted −12°, four concentric ellipses ── */}
      <g stroke={stroke} strokeWidth="8" transform="rotate(-12 415 205)">
        <ellipse cx="415" cy="205" rx="345" ry="112" />
        <ellipse cx="415" cy="205" rx="288" ry="93" />
        <ellipse cx="415" cy="205" rx="231" ry="74" />
        <ellipse cx="415" cy="205" rx="174" ry="56" />
      </g>

      {/* ── Three outline stars, upper right — strictly monochrome ── */}
      <g stroke={stroke} strokeWidth="7" strokeLinejoin="round">
        <polygon
          points="0,-40 10,-13.8 38,-12.4 16.2,5.3 23.5,32.4 0,17 -23.5,32.4 -16.2,5.3 -38,-12.4 -10,-13.8"
          transform="translate(588 100) scale(1)"
        />
        <polygon
          points="0,-40 10,-13.8 38,-12.4 16.2,5.3 23.5,32.4 0,17 -23.5,32.4 -16.2,5.3 -38,-12.4 -10,-13.8"
          transform="translate(640 82) scale(0.68)"
        />
        <polygon
          points="0,-40 10,-13.8 38,-12.4 16.2,5.3 23.5,32.4 0,17 -23.5,32.4 -16.2,5.3 -38,-12.4 -10,-13.8"
          transform="translate(612 152) scale(0.54)"
        />
      </g>

      {/* ── Swoosh accent, left of the R ── */}
      <path
        d="M94 172 C84 132 102 100 136 88 M120 134 C128 148 140 154 152 156"
        stroke={stroke}
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* ── ROHDE bubble wordmark — shadow copy behind stroked letters ── */}
      <g transform="rotate(-4 380 200)">
        <text
          x="164"
          y="264"
          fontFamily="'Unbounded', 'Google Sans', Arial, sans-serif"
          fontWeight="900"
          fontSize="128"
          letterSpacing="2"
          fill={stroke}
          stroke={stroke}
          strokeWidth="9"
          strokeLinejoin="round"
          transform="translate(10 14)"
        >
          ROHDE
        </text>
        <text
          x="164"
          y="264"
          fontFamily="'Unbounded', 'Google Sans', Arial, sans-serif"
          fontWeight="900"
          fontSize="128"
          letterSpacing="2"
          fill={fill}
          stroke={stroke}
          strokeWidth="8"
          strokeLinejoin="round"
          paintOrder="stroke"
        >
          ROHDE
        </text>
      </g>
    </svg>
  );
}

export function OrbitWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <OrbitLogo size={26} />
      <span className="font-display text-sm font-bold uppercase tracking-[0.3em]">Studio</span>
    </span>
  );
}
