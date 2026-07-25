/**
 * "Big Journeys · Better Together" visual: an open intercity road sweeping
 * toward a distant horizon — layered hills, a soft skyline, dawn sky. This is
 * literally what Destow is about (road journeys between cities). Pure SVG + CSS,
 * vehicle-agnostic, no pins. Decorative.
 */
export function RoadJourney() {
  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <div
        className="pointer-events-none absolute inset-0 animate-float rounded-full opacity-70 blur-2xl"
        style={{
          background:
            "radial-gradient(55% 55% at 55% 40%, rgba(11,82,245,.12), transparent 70%)",
        }}
      />
      <svg
        viewBox="0 0 560 420"
        className="relative block w-full overflow-visible"
        role="img"
        aria-label="An open road sweeping toward the horizon between cities"
      >
        <defs>
          <linearGradient id="rj-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F4F8FF" />
            <stop offset="1" stopColor="#E3EDFC" />
          </linearGradient>
          <linearGradient id="rj-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#CBDBF5" />
            <stop offset="1" stopColor="#AFC6EC" />
          </linearGradient>
          <linearGradient id="rj-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8FB0E4" />
            <stop offset="1" stopColor="#6690D2" />
          </linearGradient>
          <linearGradient id="rj-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#EAF1FE" />
            <stop offset="1" stopColor="#D3E1F6" />
          </linearGradient>
          <linearGradient id="rj-road" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#22375F" />
            <stop offset="0.7" stopColor="#3D74FF" />
            <stop offset="1" stopColor="#7CA0DC" />
          </linearGradient>
          <radialGradient id="rj-sun" cx="0.62" cy="0.28" r="0.42">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <clipPath id="rj-clip">
            <rect width="560" height="420" rx="20" />
          </clipPath>
        </defs>

        <g clipPath="url(#rj-clip)">
          {/* sky + dawn glow */}
          <rect width="560" height="300" fill="url(#rj-sky)" />
          <circle cx="350" cy="96" r="120" fill="url(#rj-sun)" />

          {/* soft clouds */}
          <g fill="#FFFFFF" opacity="0.75">
            <ellipse cx="120" cy="70" rx="34" ry="11" />
            <ellipse cx="150" cy="60" rx="22" ry="9" />
            <ellipse cx="440" cy="58" rx="30" ry="10" />
          </g>

          {/* distant skyline */}
          <g fill="#BACFEF" opacity="0.5">
            <rect x="70" y="150" width="14" height="60" rx="2" />
            <rect x="90" y="128" width="11" height="82" rx="2" />
            <rect x="106" y="160" width="16" height="50" rx="2" />
            <rect x="430" y="140" width="12" height="70" rx="2" />
            <rect x="448" y="160" width="15" height="50" rx="2" />
            <rect x="468" y="132" width="11" height="78" rx="2" />
          </g>

          {/* layered hills / mountains */}
          <path d="M0 210 L120 150 L240 210 Z" fill="url(#rj-far)" opacity="0.9" />
          <path d="M300 210 L410 150 L520 210 Z" fill="url(#rj-far)" opacity="0.9" />
          <path d="M120 210 L250 138 L390 210 Z" fill="url(#rj-mid)" />
          <path d="M250 138 L280 168 L250 180 L222 168 Z" fill="#EEF4FF" opacity="0.85" />

          {/* rolling ground */}
          <path d="M0 206 Q280 168 560 206 L560 420 L0 420 Z" fill="url(#rj-ground)" />

          {/* the road, sweeping from foreground to the vanishing point */}
          <path
            d="M232 420 Q250 300 274 250 Q292 214 286 206 L300 206 Q308 232 300 268 Q286 340 322 420 Z"
            fill="url(#rj-road)"
          />
          {/* lane markings, gently drawing */}
          <path
            d="M290 214 Q296 300 280 410"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeDasharray="10 16"
            strokeLinecap="round"
            opacity="0.9"
            pathLength={100}
            className="[stroke-dashoffset:100] animate-dash motion-reduce:[stroke-dashoffset:0]"
            style={{ strokeDasharray: "9 15" }}
          />
        </g>

        <rect
          x="0.5"
          y="0.5"
          width="559"
          height="419"
          rx="19.5"
          fill="none"
          stroke="#1C2331"
          strokeOpacity="0.06"
        />
      </svg>
    </div>
  );
}
