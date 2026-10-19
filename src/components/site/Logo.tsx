import { Link } from "react-router-dom";

export const Logo = ({ className = "" }: { className?: string }) => (
  <Link to="/" dir="ltr" aria-label="Discover Tel Aviv home" className={`inline-flex items-center gap-2 ${className}`}>
    <span className="relative inline-flex h-6 w-6 items-center justify-center" aria-hidden>
      <span className="absolute inset-0 rounded-full border-2 border-sea" />
      <span className="absolute inset-[5px] rounded-full border-[1.5px] border-sea/50" />
      <span className="absolute inset-[9px] rounded-full bg-accent" />
    </span>
    <span className="font-display text-[20px] leading-none text-foreground">Discover Tel Aviv</span>
  </Link>
);
