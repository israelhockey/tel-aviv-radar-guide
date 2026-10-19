import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Digest = Database["public"]["Tables"]["newsletter_digests"]["Row"];

const NewsletterAdmin = () => {
  const [digests, setDigests] = useState<Digest[]>([]);
  const [subCount, setSubCount] = useState(0);
  const [subject, setSubject] = useState("Tel Aviv today — " + new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }));
  const [building, setBuilding] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  const load = async () => {
    const [d, s] = await Promise.all([
      supabase.from("newsletter_digests").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("subscribers").select("*", { count: "exact", head: true }).eq("status", "active"),
    ]);
    setDigests(d.data ?? []);
    setSubCount(s.count ?? 0);
  };

  useEffect(() => { document.title = "Newsletter — Discover Tel Aviv"; load(); }, []);

  const build = async () => {
    setBuilding(true);
    const { data, error } = await supabase.functions.invoke("generate-brief", { body: { subject } });
    setBuilding(false);
    if (error) return toast.error(error.message);
    toast.success(`Draft built with ${data?.content_count ?? 0} items.`);
    load();
  };

  const send = async (id: string) => {
    setSending(id);
    const { data, error } = await supabase.functions.invoke("send-newsletter", { body: { digest_id: id } });
    setSending(null);
    if (error) return toast.error(error.message);
    if (data?.needs_secret) {
      toast.error("Resend API key not configured. Add it in Settings to send newsletters.");
    } else {
      toast.success(`Sent to ${data?.recipient_count ?? 0} subscribers.`);
    }
    load();
  };

  return (
    <AdminShell>
      <h1 className="font-display text-4xl font-black tracking-tight">Newsletter studio</h1>
      <p className="text-muted-foreground mt-1">{subCount} active subscribers.</p>

      <Card className="p-5 border-2 mt-6">
        <p className="kicker text-accent">Build morning brief</p>
        <h2 className="font-display text-2xl font-bold mt-1">Compose tomorrow's digest</h2>
        <div className="mt-4 grid md:grid-cols-[1fr,auto] gap-3 items-end">
          <div><Label>Subject line</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
          <Button onClick={build} disabled={building} className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold uppercase tracking-wider h-10">
            {building ? "Building…" : "Build draft"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Pulls top published items from the last 24h and assembles an HTML draft.</p>
      </Card>

      <h2 className="font-display text-2xl font-bold mt-10">Digests</h2>
      <div className="mt-3 space-y-2">
        {digests.length === 0 && <p className="text-muted-foreground text-sm">No digests yet. Build your first one above.</p>}
        {digests.map((d) => (
          <Card key={d.id} className="p-4 border">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <p className="kicker text-accent">{d.kind} · {d.status}</p>
                <p className="font-bold truncate">{d.subject}</p>
                <p className="text-xs text-muted-foreground">{d.content_ids.length} items · created {new Date(d.created_at).toLocaleString("en-GB")}{d.sent_at ? ` · sent ${new Date(d.sent_at).toLocaleString("en-GB")} → ${d.recipient_count}` : ""}</p>
              </div>
              <div className="flex gap-2">
                {d.status !== "sent" && (
                  <Button size="sm" onClick={() => send(d.id)} disabled={sending === d.id} className="bg-foreground text-background hover:bg-foreground/90 font-bold uppercase tracking-wider">
                    {sending === d.id ? "Sending…" : "Send"}
                  </Button>
                )}
              </div>
            </div>
            {d.html && (
              <details className="mt-3">
                <summary className="text-xs text-muted-foreground cursor-pointer">Preview HTML</summary>
                <iframe title="preview" srcDoc={d.html} className="mt-2 w-full h-96 border" />
              </details>
            )}
          </Card>
        ))}
      </div>
    </AdminShell>
  );
};

export default NewsletterAdmin;
