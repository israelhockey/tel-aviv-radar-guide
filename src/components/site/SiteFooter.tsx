import { Link } from "react-router-dom";
import { NewsletterForm } from "./NewsletterForm";

export const SiteFooter = () => (
  <footer className="mt-20 border-t-2 border-foreground bg-primary text-primary-foreground">
    <div className="container-page grid gap-10 py-12 md:grid-cols-3">
      <div>
        <h3 className="font-display text-3xl font-black tracking-tight">TLV·RADAR</h3>
        <p className="mt-2 text-sm opacity-80">
          A daily local-media engine for Tel Aviv — news, events, openings, food, nightlife and the weekend guide.
        </p>
      </div>
      <div className="text-sm">
        <p className="kicker mb-3 text-highlight">Sections</p>
        <ul className="space-y-1">
          {["News","Events","Food","Nightlife","Business","Weekend"].map(s => (
            <li key={s}><Link to={`/${s.toLowerCase()}`} className="hover:text-highlight">{s}</Link></li>
          ))}
          <li><Link to="/submit" className="hover:text-highlight">Submit an event</Link></li>
          <li><Link to="/admin" className="hover:text-highlight">Editor login</Link></li>
        </ul>
      </div>
      <div>
        <p className="kicker mb-3 text-highlight">The morning brief</p>
        <p className="text-sm opacity-80 mb-3">One short email every morning. What's open, what's on, what changed.</p>
        <NewsletterForm variant="dark" />
      </div>
    </div>
    <div className="border-t border-primary-foreground/20">
      <div className="container-page py-4 text-xs uppercase tracking-widest opacity-70">
        © {new Date().getFullYear()} TLV Radar — Independent local media
      </div>
    </div>
  </footer>
);
