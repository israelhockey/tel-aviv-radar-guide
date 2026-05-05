import { Link } from "react-router-dom";

export const Logo = ({ className = "" }: { className?: string }) => (
  <Link to="/" className={`inline-flex items-center gap-2 ${className}`}>
    <span className="font-extrabold text-[22px] leading-none tracking-tight text-foreground">
      TLV <span className="text-foreground">Radar</span>
    </span>
    <span className="relative inline-flex h-6 w-6 items-center justify-center">
      <span className="absolute inset-0 rounded-full border-[2.5px] border-sea" />
      <span className="absolute inset-1 rounded-full border-[2px] border-sea/60" />
      <span className="absolute inset-[10px] rounded-full bg-accent" />
    </span>
  </Link>
);
