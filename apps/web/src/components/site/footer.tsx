import { ArrowRight } from "lucide-react";
import { Logo } from "./logo";

const COMPANY = [
  { label: "About Us", href: "#why" },
  { label: "Features", href: "#why" },
  { label: "Updates", href: "#coming-soon" },
  { label: "Contact", href: "#contact" },
];
const SUPPORT = [
  { label: "Help Center", href: "#" },
  { label: "FAQs", href: "#" },
  { label: "Privacy Policy", href: "#" },
  { label: "Terms & Conditions", href: "#" },
];

function Social({ label, d }: { label: string; d: string }) {
  return (
    <a
      href="#"
      aria-label={label}
      className="grid size-9 place-items-center rounded-xl text-navy/40 transition-colors hover:bg-brand-50 hover:text-brand"
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor" aria-hidden>
        <path d={d} />
      </svg>
    </a>
  );
}

export function Footer() {
  return (
    <footer id="contact" className="border-t border-navy/8 bg-white pb-10 pt-[72px]">
      <div className="container">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.5fr_0.8fr_0.8fr_1.3fr]">
          {/* brand */}
          <div className="max-w-xs">
            <Logo className="h-10" />
            <p className="mt-5 text-[14px] leading-relaxed text-navy/50">
              India&apos;s upcoming intercity cab &amp; bus booking app. Travel
              across 500+ cities with ease.
            </p>
          </div>

          {/* company */}
          <div>
            <h4 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-navy/40">
              Company
            </h4>
            <ul className="mt-5 space-y-3.5">
              {COMPANY.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-[14.5px] text-navy/60 transition-colors hover:text-brand"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* support */}
          <div>
            <h4 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-navy/40">
              Support
            </h4>
            <ul className="mt-5 space-y-3.5">
              {SUPPORT.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-[14.5px] text-navy/60 transition-colors hover:text-brand"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* stay updated */}
          <div>
            <h4 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-navy/40">
              Stay Updated
            </h4>
            <p className="mt-5 text-[14px] leading-relaxed text-navy/50">
              Subscribe to get the latest updates about our launch.
            </p>
            {/* Concept only — not wired to a backend yet. */}
            <form
              className="mt-4 flex items-center gap-2 rounded-full border border-navy/12 bg-white p-1.5 shadow-sm"
              action="#"
            >
              <label htmlFor="footer-email" className="sr-only">
                Email address
              </label>
              <input
                id="footer-email"
                type="email"
                placeholder="Enter your email"
                className="min-w-0 flex-1 bg-transparent px-3 text-[14px] text-navy outline-none placeholder:text-navy/40"
              />
              <button
                type="submit"
                aria-label="Subscribe"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-white transition-colors hover:bg-brand-600"
              >
                <ArrowRight className="size-4" />
              </button>
            </form>
          </div>
        </div>

        {/* bottom bar */}
        <div className="mt-16 border-t border-navy/8 pt-8">
          <div className="flex flex-col items-center gap-5">
            <div className="flex items-center gap-1.5">
              <Social
                label="Facebook"
                d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5H16.7V3.6c-.29-.04-1.3-.13-2.47-.13-2.44 0-4.11 1.49-4.11 4.23v2.36H7.4V13h2.72v8z"
              />
              <Social
                label="Instagram"
                d="M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.42.37 1.06.42 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.42 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.17-1.06.37-2.23.42-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.42a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.17-.42-.37-1.06-.42-2.23C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85c.05-1.17.25-1.8.42-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.17 1.06-.37 2.23-.42C8.42 2.21 8.8 2.2 12 2.2zm0 1.8c-3.15 0-3.5.01-4.74.07-.9.04-1.38.19-1.71.32-.43.17-.74.37-1.06.69-.32.32-.52.63-.69 1.06-.13.33-.28.81-.32 1.71C3.21 8.5 3.2 8.85 3.2 12s.01 3.5.07 4.74c.04.9.19 1.38.32 1.71.17.43.37.74.69 1.06.32.32.63.52 1.06.69.33.13.81.28 1.71.32 1.24.06 1.59.07 4.74.07s3.5-.01 4.74-.07c.9-.04 1.38-.19 1.71-.32.43-.17.74-.37 1.06-.69.32-.32.52-.63.69-1.06.13-.33.28-.81.32-1.71.06-1.24.07-1.59.07-4.74s-.01-3.5-.07-4.74c-.04-.9-.19-1.38-.32-1.71a2.86 2.86 0 0 0-.69-1.06 2.86 2.86 0 0 0-1.06-.69c-.33-.13-.81-.28-1.71-.32C15.5 4.01 15.15 4 12 4zm0 3.06A4.94 4.94 0 1 1 12 17a4.94 4.94 0 0 1 0-9.94zm0 8.14A3.2 3.2 0 1 0 12 8.8a3.2 3.2 0 0 0 0 6.4zm6.3-8.34a1.15 1.15 0 1 1-2.3 0 1.15 1.15 0 0 1 2.3 0z"
              />
              <Social
                label="Twitter"
                d="M17.53 3H20l-6.16 7.03L21 21h-5.64l-4.42-5.78L5.9 21H3.4l6.6-7.53L3 3h5.78l4 5.29L17.53 3zm-.99 16.2h1.36L7.53 4.72H6.07l10.47 14.48z"
              />
            </div>
            <p className="text-[13px] text-navy/45">
              © 2026 Destow. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
