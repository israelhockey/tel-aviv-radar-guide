import type { ReactNode } from "react";
import { Link } from "react-router-dom";

// Shared pieces of the Postcard look, used across the inner pages.

/** A full-bleed photo with a giant title along the bottom edge, an optional stamp, and a colour band below. */
export const PhotoHero = ({
  photo, title, kicker, stamp, band, bandColor = "#0057ff", alt = "", small = false,
}: {
  photo?: string; title: ReactNode; kicker?: ReactNode; stamp?: ReactNode; band?: ReactNode; bandColor?: string; alt?: string; small?: boolean;
}) => (
  <>
    <section className={`relative overflow-hidden ${small ? "h-[340px] sm:h-[440px]" : "h-[400px] sm:h-[520px]"}`} style={{ background: bandColor }}>
      {photo && <img src={photo} alt={alt} referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${bandColor} 0%, ${bandColor}99 22%, transparent 60%)` }} />
      {stamp && <div className="stamp absolute top-5 end-[4%] w-[150px] sm:w-[180px] p-3 rotate-[4deg] text-foreground">{stamp}</div>}
      <div className="absolute inset-x-0 bottom-0">
        <div className="container-page pb-6">
          {kicker && <div className="mb-2 text-[15px] font-bold text-white/90">{kicker}</div>}
          <h1 className="font-display text-white leading-[0.88] text-[44px] sm:text-[80px] lg:text-[104px] [text-wrap:balance]">{title}</h1>
        </div>
      </div>
    </section>
    {band && <section className="text-white" style={{ background: bandColor }}><div className="container-page pb-8 pt-2">{band}</div></section>}
  </>
);

/** A solid colour hero for pages without a photo. */
export const BandHero = ({ title, dek, color = "#0057ff", ink = "#fff", children }: { title: ReactNode; dek?: ReactNode; color?: string; ink?: string; children?: ReactNode }) => (
  <section style={{ background: color, color: ink }}>
    <div className="container-page pt-12 pb-10 sm:pt-16 sm:pb-12">
      <h1 className="font-display leading-[0.88] text-[52px] sm:text-[96px] lg:text-[120px]">{title}</h1>
      {dek && <p className="mt-4 max-w-2xl text-[19px] sm:text-[22px] leading-snug opacity-95">{dek}</p>}
      {children}
    </div>
  </section>
);

/** Section heading with the heavy ink rule underneath. */
export const SectionHead = ({ title, to, link, id }: { title: ReactNode; to?: string; link?: ReactNode; id?: string }) => (
  <div className="flex items-baseline justify-between gap-3 border-b-[3px] border-foreground pb-2">
    <h2 id={id} className="font-display text-[30px] sm:text-[40px] leading-none">{title}</h2>
    {to && link && <Link to={to} className="shrink-0 text-[15px] font-bold text-sea hover:underline underline-offset-4">{link}</Link>}
  </div>
);

export const PASTELS = ["#fff4c2", "#ffd9d4", "#d6e4ff", "#d3f9d8", "#f3d9fa", "#ffe8cc"];
export const TILTS = ["-rotate-2", "rotate-[1.5deg]", "-rotate-1", "rotate-2", "rotate-1", "-rotate-[1.5deg]"];

/** A ticket stub: pastel paper with a dashed tear line. */
export const Stub = ({ i = 0, className = "", children }: { i?: number; className?: string; children: ReactNode }) => (
  <div className={`rounded-[10px] text-[#0b1a33] ${className}`} style={{ background: PASTELS[i % PASTELS.length] }}>{children}</div>
);
