"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function EmailForm({
  cta = "Notify Me",
  className,
  size = "default",
  tone = "light",
}: {
  cta?: string;
  className?: string;
  size?: "default" | "lg";
  tone?: "light" | "dark";
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "error" | "done">("idle");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setState("error");
      return;
    }
    // No backend yet — this is a pre-launch page. Wire to a real endpoint
    // (e.g. POST /api/waitlist) when the API's waitlist route ships.
    setState("done");
  }

  if (state === "done") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-full border border-brand/20 bg-brand-50 px-6 py-4 text-navy",
          className
        )}
      >
        <span className="grid size-6 place-items-center rounded-full bg-brand text-white">
          <Check className="size-3.5" strokeWidth={3} />
        </span>
        <p className="text-[15px] font-medium">
          You&apos;re on the list. We&apos;ll be in touch at launch.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className={cn("w-full", className)}>
      <div
        className={cn(
          "flex flex-col gap-2.5 sm:flex-row",
          size === "lg" && "sm:gap-3"
        )}
      >
        <div className="relative flex-1">
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-label="Email address"
            aria-invalid={state === "error"}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (state === "error") setState("idle");
            }}
            className={cn(
              size === "lg" && "h-[54px] text-base",
              state === "error" && "border-red-400 focus-visible:ring-red-200"
            )}
          />
        </div>
        <Button
          type="submit"
          size={size === "lg" ? "lg" : "default"}
          className="shrink-0"
        >
          {cta}
          <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
        </Button>
      </div>
      <p
        className={cn(
          "mt-2.5 min-h-[1.1em] text-[13px]",
          state === "error"
            ? tone === "dark"
              ? "text-red-300"
              : "text-red-500"
            : tone === "dark"
              ? "text-white/50"
              : "text-navy/45"
        )}
      >
        {state === "error"
          ? "Please enter a valid email address."
          : "No spam. We’ll email only important updates."}
      </p>
    </form>
  );
}
