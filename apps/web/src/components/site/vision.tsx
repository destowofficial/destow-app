import { ShieldCheck, BadgeIndianRupee, Headphones, Sofa } from "lucide-react";
import { Reveal } from "./reveal";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Safe & Reliable",
    body: "Verified partners for your safety.",
  },
  {
    icon: BadgeIndianRupee,
    title: "No Hidden Charges",
    body: "Transparent pricing, always.",
  },
  {
    icon: Headphones,
    title: "24×7 Support",
    body: "We’re here for you, anytime.",
  },
  {
    icon: Sofa,
    title: "Comfort First",
    body: "Well maintained cabs and buses.",
  },
];

export function Vision() {
  return (
    <section id="why" className="py-[120px]">
      <div className="container">
        <Reveal className="text-center">
          <h2 className="text-[clamp(2.1rem,3.6vw,2.7rem)] font-bold tracking-[-0.03em] text-navy">
            Why Destow?
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }, i) => (
            <Reveal
              key={title}
              delay={i * 90}
              className={
                "group px-8 text-center lg:text-left" +
                (i > 0 ? " lg:border-l lg:border-navy/10" : "")
              }
            >
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand-50 text-brand transition-transform duration-300 group-hover:scale-110 lg:mx-0">
                <Icon className="size-7" strokeWidth={1.75} />
              </span>
              <h3 className="mt-6 text-[17px] font-semibold tracking-tight text-navy">
                {title}
              </h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-navy/50">
                {body}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
