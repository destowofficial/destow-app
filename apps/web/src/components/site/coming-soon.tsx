import { ArrowRight } from "lucide-react";
import { Reveal } from "./reveal";
import { RoadJourney } from "./road-journey";

export function ComingSoon() {
  return (
    <section id="coming-soon" className="pb-[120px]">
      <div className="container">
        <Reveal>
          <div className="relative overflow-hidden rounded-[28px] border border-navy/8 bg-white shadow-soft">
            {/* faint blue wash on the copy side only */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-brand-50/70 to-transparent" />

            <div className="relative grid items-center gap-8 md:grid-cols-2">
              {/* left copy */}
              <div className="max-w-[460px] px-8 py-14 sm:px-12 sm:py-16">
                <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-brand">
                  Coming soon
                </p>
                <h2 className="mt-4 text-[clamp(2rem,3.4vw,2.6rem)] font-bold leading-[1.06] tracking-[-0.03em] text-navy">
                  Big Journeys.
                  <br />
                  <span className="text-brand">Better</span> Together.
                </h2>
                <p className="mt-5 text-[16px] leading-relaxed text-navy/55">
                  We&apos;re working hard to bring you the best intercity travel
                  experience.
                </p>
                <a
                  href="#top"
                  className="group mt-7 inline-flex items-center gap-1.5 text-[15px] font-semibold text-brand"
                >
                  Stay tuned!
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </a>
              </div>

              {/* right — creative route-network visual */}
              <div className="relative flex items-center justify-center px-8 py-10 sm:py-14">
                <RoadJourney />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
