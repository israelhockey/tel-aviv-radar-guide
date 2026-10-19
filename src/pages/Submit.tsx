import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Submit = () => {
  // ?kind=happy turns this into the happy hour / lunch deal form.
  const kind = useSearchParams()[0].get("kind");
  const deal = kind === "happy";
  const job = kind === "job";
  const [form, setForm] = useState({
    title: "", description: "", venue: "", neighborhood: "",
    starts_at: "", url: "", contact_name: "", contact_email: "",
  });
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("submitted_items").insert({
      type: deal ? "nightlife" : job ? "business" : "event",
      title: deal ? `Happy hour / deal: ${form.title}` : job ? `Job: ${form.title}` : form.title,
      description: form.description,
      venue: form.venue || null,
      neighborhood: form.neighborhood || null,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      url: form.url || null,
      contact_name: form.contact_name || null,
      contact_email: form.contact_email || null,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Submitted. The editors will review it.");
    setForm({ title: "", description: "", venue: "", neighborhood: "", starts_at: "", url: "", contact_name: "", contact_email: "" });
  };

  return (
    <SiteLayout>
      <header className="container-page py-10">
        <p className="text-xs uppercase tracking-widest font-bold text-accent">Submit</p>
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mt-2">{deal ? "Add a happy hour or deal" : job ? "Post a job" : "Add an event"}</h1>
        <p className="mt-3 text-muted-foreground max-w-xl">
          {deal
            ? "Tell us the place and the deal: which days, which hours, what's discounted. Editors check every tip before it goes live."
            : "Got a gig, opening, market, talk, or party? Tell us. Editors review every submission before it goes live."}
        </p>
      </header>
      <form onSubmit={submit} className="container-page pb-16 max-w-2xl space-y-4">
        <Field label={deal ? "Place name *" : job ? "Job title and company *" : "Event title *"}><Input required value={form.title} onChange={set("title")} /></Field>
        <Field label={deal ? "The deal: days, hours, what's included *" : "Description *"}><Textarea required rows={5} value={form.description} onChange={set("description")} placeholder={deal ? "e.g. Sun–Thu 17:00–20:00, 1+1 on draught beer and cocktails" : undefined} /></Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Venue"><Input value={form.venue} onChange={set("venue")} /></Field>
          <Field label="Neighborhood"><Input value={form.neighborhood} onChange={set("neighborhood")} placeholder="e.g. Florentin" /></Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Starts at"><Input type="datetime-local" value={form.starts_at} onChange={set("starts_at")} /></Field>
          <Field label="Link / tickets"><Input type="url" value={form.url} onChange={set("url")} /></Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Your name"><Input value={form.contact_name} onChange={set("contact_name")} /></Field>
          <Field label="Your email"><Input type="email" value={form.contact_email} onChange={set("contact_email")} /></Field>
        </div>
        <button type="submit" disabled={loading} className="h-12 px-8 rounded-full bg-accent text-accent-foreground font-bold hover:bg-accent/90 transition disabled:opacity-60">
          {loading ? "Submitting…" : deal ? "Submit deal" : job ? "Submit job" : "Submit event"}
        </button>
      </form>
    </SiteLayout>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <Label className="text-xs uppercase tracking-widest">{label}</Label>
    {children}
  </div>
);

export default Submit;
