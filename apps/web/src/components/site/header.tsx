"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Home", href: "#top" },
  { label: "About", href: "#why" },
  { label: "Features", href: "#why" },
  { label: "Updates", href: "#coming-soon" },
  { label: "Contact", href: "#contact" },
];

export function Header() {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        stuck
          ? "border-b border-navy/8 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="container flex h-[76px] items-center gap-4 sm:h-[92px] sm:gap-6">
        <a href="#top" aria-label="Destow home" className="shrink-0">
          <Logo className="h-8 sm:h-11" />
        </a>

        <nav className="hidden flex-1 items-center justify-center gap-10 md:flex">
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="group relative py-1 text-[14.5px] font-medium text-navy/70 transition-colors hover:text-navy"
            >
              {item.label}
              <span className="absolute inset-x-0 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-brand transition-transform duration-300 ease-out group-hover:scale-x-100" />
            </a>
          ))}
        </nav>

        <div className="ml-auto shrink-0 md:ml-0">
          <Button
            asChild
            size="sm"
            className="h-10 px-3.5 text-[13px] sm:px-5 sm:text-sm"
          >
            <a href="#early-access">Get Early Access</a>
          </Button>
        </div>
      </div>
    </header>
  );
}
