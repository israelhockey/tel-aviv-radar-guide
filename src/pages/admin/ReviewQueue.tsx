import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Sub = Database["public"]["Tables"]["submitted_items"]["Row"];

const ReviewQueue = () => {
  const [items, setItems] = useState<Sub[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("submitted_items")
      .select("*").eq("status", "review").order("created_at", { ascending: false });
    setItems(data ?? []);
  };

  useEffect(() => { document.title = "Review queue — Discover Tel Aviv"; load(); }, []);

  const approve = async (s: Sub) => {
    setBusy(s.id);
    const slug = s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) + "-" + Date.now().toString(36);
    const { data: created, error } = await supabase.from("content_items").insert({
      slug, type: s.type, title: s.title, summary: s.description?.slice(0, 280) ?? null, body: s.description,
      venue: s.venue, neighborhood: s.neighborhood, starts_at: s.starts_at, ends_at: s.ends_at,
      source_url: s.url, hero_image_url: s.image_url, status: "published", published_at: new Date().toISOString(),
    }).select().single();
    if (error) { setBusy(null); return toast.error(error.message); }
    await supabase.from("submitted_items").update({ status: "published", promoted_content_id: created.id }).eq("id", s.id);
    setBusy(null);
    toast.success("Approved & published.");
    load();
  };

  const reject = async (s: Sub) => {
    await supabase.from("submitted_items").update({ status: "archived" }).eq("id", s.id);
    toast.success("Rejected.");
    load();
  };

  return (
    <AdminShell>
      <h1 className="font-display text-4xl font-black tracking-tight">Review queue</h1>
      <p className="text-muted-foreground mt-1">User-submitted events awaiting editorial approval.</p>
      <div className="mt-6 space-y-3">
        {items.length === 0 && <p className="text-muted-foreground">Queue is empty 🍾</p>}
        {items.map((s) => (
          <Card key={s.id} className="p-5 border-2">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <p className="kicker text-accent">{s.type}{s.neighborhood && ` · ${s.neighborhood}`}</p>
                <h3 className="font-display text-2xl font-bold mt-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{s.description}</p>
                <div className="text-xs text-muted-foreground mt-3 flex flex-wrap gap-3">
                  {s.venue && <span>📍 {s.venue}</span>}
                  {s.starts_at && <span>🗓 {new Date(s.starts_at).toLocaleString("en-GB")}</span>}
                  {s.contact_email && <span>✉ {s.contact_email}</span>}
                  {s.url && <a href={s.url} target="_blank" rel="noreferrer" className="text-accent">Link →</a>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => approve(s)} disabled={busy === s.id} className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold">Approve</Button>
                <Button onClick={() => reject(s)} variant="outline">Reject</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
};

export default ReviewQueue;
