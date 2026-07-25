import Image from "next/image";
import { cn } from "@/lib/utils";
import wordmark from "../../../public/destow-wordmark.png";

// Source lockup is 560 x 189 (destow wordmark + road swoosh).
// Size the logo by *height* via className (e.g. `h-9 sm:h-11`) so it stays
// responsive and never forces a fixed pixel width that could overflow.
export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src={wordmark}
      alt="Destow"
      width={560}
      height={189}
      priority
      className={cn("w-auto select-none", className)}
    />
  );
}
