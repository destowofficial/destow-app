import { PhoneMockup } from "./phone-mockup";
import { WaitlistCard } from "./waitlist-card";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      {/* drifting soft blobs */}
      <div
        className="pointer-events-none absolute -right-40 -top-24 h-[560px] w-[560px] animate-float rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(11,82,245,.18), transparent 66%)",
        }}
      />
      <div
        className="pointer-events-none absolute -left-32 top-40 h-[420px] w-[420px] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(61,116,255,.14), transparent 66%)",
          animation: "float 8s ease-in-out infinite",
        }}
      />

      <div className="container relative grid items-center gap-12 pb-24 pt-16 lg:grid-cols-[48fr_52fr] lg:gap-8 lg:pb-32 lg:pt-20">
        {/* left */}
        <div className="max-w-[520px]">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand-50 px-3.5 py-1.5 text-[13px] font-semibold text-brand-600">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-brand" />
            </span>
            Coming soon to India
          </span>

          <h1 className="mt-6 text-[clamp(2.9rem,5.2vw,4.4rem)] font-extrabold leading-[1.02] tracking-[-0.04em] text-navy">
            Intercity Travel,
            <br />
            <span className="text-brand">Simplified.</span>
          </h1>

          <p className="mt-6 max-w-[500px] text-[17px] leading-relaxed text-navy/55">
            Destow is an upcoming intercity cab &amp; bus booking app for India.
            Reliable. Convenient. Coming Soon.
          </p>

          <WaitlistCard className="mt-8 max-w-[460px]" />
        </div>

        {/* right — phone mockup */}
        <div className="relative flex justify-center lg:justify-end">
          <PhoneMockup />
        </div>
      </div>
    </section>
  );
}
