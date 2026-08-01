type GearSpec = {
  cx: number;
  cy: number;
  r: number;
  teeth: number;
  color: string;
  dur: number;
  dir: 1 | -1;
  opacity: number;
};

const GEARS: GearSpec[] = [
  { cx: 1460, cy: 110, r: 250, teeth: 22, color: "#E18D01", dur: 28, dir: 1, opacity: 0.5 },
  { cx: 120, cy: 840, r: 300, teeth: 26, color: "#4aa8ff", dur: 36, dir: -1, opacity: 0.42 },
  { cx: 1210, cy: 830, r: 180, teeth: 18, color: "#E18D01", dur: 22, dir: -1, opacity: 0.4 },
  { cx: 520, cy: 540, r: 150, teeth: 16, color: "#4aa8ff", dur: 18, dir: 1, opacity: 0.38 },
  { cx: 300, cy: 410, r: 92, teeth: 12, color: "#E18D01", dur: 12, dir: -1, opacity: 0.4 },
];

function Gear({ cx, cy, r, teeth, color, dur, dir, opacity }: GearSpec) {
  const circ = 2 * Math.PI * r;
  const dash = circ / (teeth * 2);
  const stroke = r * 0.26;
  const k = r * 0.58;
  const spokes = [0, 60, 120].map((a) => {
    const rad = (a * Math.PI) / 180;
    return {
      a,
      x1: cx - k * Math.cos(rad),
      y1: cy - k * Math.sin(rad),
      x2: cx + k * Math.cos(rad),
      y2: cy + k * Math.sin(rad),
    };
  });

  return (
    <g
      className="mm-gear"
      opacity={opacity}
      style={
        {
          // Rotate about the gear's own centre in user-space units.
          transformOrigin: `${cx}px ${cy}px`,
          animationDuration: `${dur}s`,
          animationDirection: dir > 0 ? "normal" : "reverse",
        } as React.CSSProperties
      }
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${dash}`}
      />
      <circle cx={cx} cy={cy} r={r * 0.64} fill="none" stroke={color} strokeWidth={2.5} opacity={0.55} />
      {spokes.map((s) => (
        <line key={s.a} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={color} strokeWidth={r * 0.05} opacity={0.5} />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.17} fill={color} />
    </g>
  );
}

/**
 * Animated factory-floor backdrop — interlocking cogs turning.
 *
 * The gears rotate via a CSS animation (`.mm-gear` in globals.css) rather than
 * SVG SMIL `<animateTransform>`. SMIL drove the transform through the SVG
 * animation engine, which re-rasterised each gear's stroked, dashed geometry
 * every frame at full refresh rate; a CSS transform animation is a property the
 * compositor can handle, so the gear rasterises once and is then just moved.
 */
export function FactoryScene({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="A working factory floor of turning cogs"
    >
      <defs>
        <linearGradient id="fsky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#080b16" />
          <stop offset="55%" stopColor="#0c1326" />
          <stop offset="100%" stopColor="#0a0f1f" />
        </linearGradient>
        <radialGradient id="furnace" cx="50%" cy="100%" r="55%">
          <stop offset="0%" stopColor="#e0892f" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#e0892f" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1600" height="900" fill="url(#fsky)" />
      <rect width="1600" height="900" fill="url(#furnace)" />

      {/* faint structural pipes */}
      <g stroke="#2c7be5" strokeWidth="3" opacity="0.12">
        <line x1="0" y1="250" x2="1600" y2="250" />
        <line x1="0" y1="650" x2="1600" y2="650" />
        <line x1="400" y1="0" x2="400" y2="900" />
        <line x1="1120" y1="0" x2="1120" y2="900" />
      </g>

      {GEARS.map((g, i) => (
        <Gear key={i} {...g} />
      ))}
    </svg>
  );
}
