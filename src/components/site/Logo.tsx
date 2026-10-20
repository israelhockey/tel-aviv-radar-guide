import { Link } from "react-router-dom";

// The sun over the sea: a yellow disc with a coral dot. The word mark takes each zone's display face.
export const Logo = ({ className = "" }: { className?: string }) => (
  <Link to="/" dir="ltr" aria-label="Discover Tel Aviv home" className={`inline-flex min-w-0 items-center gap-2 sm:gap-2.5 ${className}`}>
    <span className="inline-flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-[#ffcb05]" aria-hidden>
      <span className="h-3 w-3 rounded-full bg-[#ff5a4e]" />
    </span>
    <span className="font-display text-[17px] sm:text-[21px] leading-none text-foreground whitespace-nowrap">Discover Tel Aviv</span>
  </Link>
);
