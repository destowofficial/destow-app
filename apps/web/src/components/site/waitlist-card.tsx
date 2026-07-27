import { Mail } from "lucide-react";
import { EmailForm } from "./email-form";
import { cn } from "@/lib/utils";

export function WaitlistCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-navy/8 bg-white p-6 shadow-soft sm:p-7",
        className
      )}
    >
      <div className="flex items-center gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-white shadow-[0_10px_22px_-12px_rgba(11,82,245,.7)]">
          <Mail className="size-[18px]" strokeWidth={2} />
        </span>
        <div>
          <p className="text-[15px] font-bold tracking-tight text-navy">
            Be the first to know!
          </p>
          <p className="text-[13px] text-navy/50">
            Get early access and exclusive updates.
          </p>
        </div>
      </div>
      <div className="mt-5">
        <EmailForm cta="Notify Me" />
      </div>
    </div>
  );
}
