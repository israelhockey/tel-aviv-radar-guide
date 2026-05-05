import { Link } from "react-router-dom";
import { Instagram, Facebook, Send } from "lucide-react";
import { NewsletterForm } from "./NewsletterForm";
import { Logo } from "./Logo";

export const SiteFooter = () => (
  <footer className="mt-16 border-t border-border bg-background">
    {/* Blue weekend CTA bar */}
    <div className="bg-[hsl(220_85%_22%)] text-white">
      <div className="container-page py-6 grid gap-4 md:grid-cols-[1fr,auto] items-center">
        <div>
          <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight">Get the TLV Weekend Guide every Thursday</h3>
          <p className="text-sm text-white/75 mt-1">The best events, openings, and things to do in Tel Aviv — straight to your inbox.</p>
        </div>
        <div className="md:w-[420px]"><NewsletterForm variant="dark" cta="Get the Guide" /></div>
      </div>
    </div>

    <div className="container-page py-10 grid gap-10 md:grid-cols-4">
      <div className="md:col-span-2">
        <Logo />
        <p className="text-sm text-muted-foreground mt-3 max-w-sm">
          The local media engine for Tel Aviv. Daily news, events, food, nightlife and the weekend guide.
        </p>
        <div className="flex items-center gap-4 mt-5 text-foreground/60">
          <span className="text-sm font-semibold text-foreground">Follow TLV Radar</span>
          <Instagram className="h-5 w-5" />
          <Facebook className="h-5 w-5" />
          <Send className="h-5 w-5" />
        </div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Sections</p>
        <ul className="space-y-2 text-sm">
          {[["Tonight","/events"],["Weekend","/weekend"],["Food & Drink","/food"],["Nightlife","/nightlife"],["Business","/business"],["Local News","/news"]].map(([l,h])=>(
            <li key={h}><Link to={h} className="hover:text-accent">{l}</Link></li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">About</p>
        <ul className="space-y-2 text-sm">
          <li><Link to="/submit" className="hover:text-accent">Submit an event</Link></li>
          <li><Link to="/auth" className="hover:text-accent">Editor login</Link></li>
        </ul>
      </div>
    </div>
    <div className="border-t border-border">
      <div className="container-page py-4 text-xs text-muted-foreground">
        © {new Date().getFullYear()} TLV Radar — Independent local media
      </div>
    </div>
  </footer>
);
