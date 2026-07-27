"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: keyof React.JSX.IntrinsicElements;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Already in view on mount (or IO unsupported)? Show immediately — avoids a
    // flash of hidden content and keeps things robust when IO callbacks lag.
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (typeof IntersectionObserver === "undefined" || rect.top < vh * 0.92) {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Comp = Tag as any;
  return (
    <Comp
      ref={ref as any}
      style={{
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: "cubic-bezier(.22,.7,.3,1)",
      }}
      className={cn(
        "transition-all duration-700 will-change-transform motion-reduce:transition-none",
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5",
        className
      )}
    >
      {children}
    </Comp>
  );
}
