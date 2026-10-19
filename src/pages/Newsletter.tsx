import { SiteLayout } from "@/components/site/SiteLayout";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { CalendarDays, Mail, Sparkles } from "lucide-react";

const Newsletter = () => (
  <SiteLayout>
    <section className="container-page py-16 max-w-3xl">
      <p className="text-xs uppercase tracking-widest font-bold text-accent">Newsletter</p>
      <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mt-2">The Discover Tel Aviv morning brief.</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Tel Aviv in your inbox at 07:30. Tonight's events, openings, and what changed in the city — short, daily, free.
      </p>
      <div className="mt-8 max-w-lg">
        <NewsletterForm cta="Subscribe" />
      </div>
      <div className="mt-12 grid gap-5 sm:grid-cols-3">
        {[
          { icon: Mail, title: "Daily, 07:30", desc: "One short email every weekday." },
          { icon: CalendarDays, title: "Weekend Guide", desc: "Every Thursday — your Friday-to-Sunday plans." },
          { icon: Sparkles, title: "No spam", desc: "Unsubscribe anytime. We don't sell your email." },
        ].map(b => (
          <div key={b.title} className="card-soft p-5">
            <b.icon className="h-5 w-5 text-accent" />
            <p className="font-bold mt-3">{b.title}</p>
            <p className="text-sm text-muted-foreground mt-1">{b.desc}</p>
          </div>
        ))}
      </div>
    </section>
  </SiteLayout>
);

export default Newsletter;
