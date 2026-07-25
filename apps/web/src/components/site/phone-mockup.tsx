import Image from "next/image";
import { ArrowRight } from "lucide-react";
import wordmark from "../../../public/destow-wordmark.png";

/**
 * A premium, gently-tilted phone showing a *concept* preview of the app:
 * centred brand, a welcome line, and a single "book a vehicle" route card that
 * fades into a road heading for the horizon. Concept only — vehicle-agnostic,
 * no live/booking UI.
 */
export function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[300px] animate-float [transform:rotate(-4deg)] sm:w-[330px]">
      <div className="relative rounded-[46px] bg-navy p-[10px] shadow-float ring-1 ring-black/5">
        <div className="relative aspect-[9/19] overflow-hidden rounded-[38px] bg-white">
          {/* notch */}
          <div className="absolute left-1/2 top-2.5 z-20 h-[22px] w-[92px] -translate-x-1/2 rounded-full bg-navy" />

          <div className="flex h-full flex-col">
            {/* top / centred brand */}
            <div className="px-6 pt-12 text-center">
              <Image
                src={wordmark}
                alt="Destow"
                width={112}
                height={38}
                className="mx-auto"
              />
              <h3 className="mt-6 text-[19px] font-bold leading-tight tracking-tight text-navy">
                Your journey
                <span className="block text-brand">starts here</span>
              </h3>
              <p className="mx-auto mt-2 max-w-[210px] text-[11px] leading-snug text-navy/45">
                Book a vehicle for any intercity route across India.
              </p>
            </div>

            {/* one concept card: pick a route, book a vehicle */}
            <div className="mt-5 px-5">
              <div className="rounded-2xl border border-navy/8 bg-white p-3.5 shadow-[0_8px_20px_-14px_rgba(28,35,49,.6)]">
                <div className="flex items-center gap-2.5">
                  <span className="flex flex-col items-center gap-1 pt-0.5">
                    <span className="size-2 rounded-full border-2 border-navy/40" />
                    <span className="h-4 w-px bg-navy/15" />
                    <span className="size-2 rounded-full bg-brand" />
                  </span>
                  <span className="flex-1 text-left">
                    <span className="block text-[12.5px] font-semibold text-navy">
                      Delhi
                    </span>
                    <span className="mt-3 block text-[12.5px] font-semibold text-navy">
                      Jaipur
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  tabIndex={-1}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-brand py-2 text-[12px] font-semibold text-white"
                >
                  Book a vehicle
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            </div>

            {/* road heading for the horizon — no pin */}
            <div className="relative mt-auto">
              <svg viewBox="0 0 300 210" className="block w-full" aria-hidden>
                <defs>
                  <linearGradient id="pm-sky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#FFFFFF" />
                    <stop offset="1" stopColor="#EAF1FE" />
                  </linearGradient>
                  <linearGradient id="pm-far" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#C7D8F4" />
                    <stop offset="1" stopColor="#A9C2EA" />
                  </linearGradient>
                  <linearGradient id="pm-near" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#7CA0DC" />
                    <stop offset="1" stopColor="#4E7BC9" />
                  </linearGradient>
                  <linearGradient id="pm-ground" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#EEF3FD" />
                    <stop offset="1" stopColor="#DFE9F8" />
                  </linearGradient>
                  <linearGradient id="pm-road" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#5C7CB4" />
                    <stop offset="1" stopColor="#33507F" />
                  </linearGradient>
                </defs>
                <rect width="300" height="210" fill="url(#pm-sky)" />
                <g fill="#FFFFFF" opacity="0.7">
                  <ellipse cx="60" cy="40" rx="22" ry="8" />
                  <ellipse cx="240" cy="30" rx="18" ry="7" />
                </g>
                <g fill="#B9CFEE" opacity="0.5">
                  <rect x="34" y="86" width="10" height="34" rx="1.4" />
                  <rect x="47" y="74" width="8" height="46" rx="1.4" />
                  <rect x="58" y="92" width="12" height="28" rx="1.4" />
                  <rect x="232" y="80" width="9" height="40" rx="1.4" />
                  <rect x="244" y="94" width="12" height="26" rx="1.4" />
                </g>
                <path d="M0 120 L54 74 L104 120 Z" fill="url(#pm-far)" />
                <path d="M78 120 L150 60 L222 120 Z" fill="url(#pm-near)" />
                <path d="M150 60 L172 78 L150 88 L130 78 Z" fill="#EEF4FF" opacity="0.85" />
                <path d="M196 120 L246 80 L300 120 Z" fill="url(#pm-far)" />
                <path d="M0 116 Q150 96 300 116 L300 210 L0 210 Z" fill="url(#pm-ground)" />
                <path
                  d="M132 210 Q120 170 150 138 Q178 112 156 116 L172 116 Q196 150 176 190 Q166 214 176 210 Z"
                  fill="url(#pm-road)"
                />
                <path
                  d="M150 150 Q140 185 158 210"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="2.4"
                  strokeDasharray="6 9"
                  strokeLinecap="round"
                  opacity="0.9"
                />
              </svg>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-6 -translate-y-full bg-gradient-to-t from-white/0 to-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
