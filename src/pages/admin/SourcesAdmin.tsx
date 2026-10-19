import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Source = Database["public"]["Tables"]["sources"]["Row"];

const SourcesAdmin = () => {
  const [sources, setSources] = useState<Source[]>([]);
  const [f, setF] = useState({ name: "", url: "", kind: "rss", category: "news" });

  const load = async () => {
    const { data } = await supabase.from("sources").select("*").order("created_at", { ascending: false });
    setSources(data ?? []);
  };

  useEffect(() => { document.title = "Sources — Discover Tel Aviv"; load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("sources").insert({
      name: f.name, url: f.url || null,
      kind: f.kind as never, category: f.category as never,
    });
    if (error) return toast.error(error.message);
    toast.success("Source added.");
    setF({ name: "", url: "", kind: "rss", category: "news" });
    load();
  };

  const toggle = async (s: Source) => {
    await supabase.from("sources").update({ is_active: !s.is_active }).eq("id", s.id);
    load();
  };
  const del = async (s: Source) => {
    if (!confirm(`Delete source "${s.name}"?`)) return;
    await supabase.from("sources").delete().eq("id", s.id);
    load();
  };

  return (
    <AdminShell>
      <h1 className="font-display text-4xl font-black tracking-tight">Sources</h1>
      <p className="text-muted-foreground mt-1">RSS feeds, NewsAPI queries, Apify actors, manual pipelines.</p>

      <Card className="p-5 border-2 mt-6">
        <form onSubmit={create} className="grid md:grid-cols-5 gap-3 items-end">
          <div className="md:col-span-2"><Label>Name</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Time Out Tel Aviv" /></div>
          <div className="md:col-span-2"><Label>URL (RSS / endpoint)</Label><Input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://..." /></div>
          <div>
            <Label>Kind</Label>
            <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} className="w-full h-10 px-3 border border-input rounded bg-background">
              {["rss","newsapi","apify","manual","submission"].map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <Label>Default category</Label>
            <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className="w-full h-10 px-3 border border-input rounded bg-background">
              {["news","event","opening","food","nightlife","business","guide"].map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <Button type="submit" className="bg-foreground text-background font-bold uppercase tracking-wider">Add source</Button>
        </form>
      </Card>

      <div className="mt-6 space-y-2">
        {sources.map((s) => (
          <Card key={s.id} className="p-4 border flex items-center justify-between">
            <div>
              <p className="font-bold">{s.name} <span className="text-xs text-muted-foreground uppercase tracking-widest ml-2">{s.kind} · {s.category}</span></p>
              <p className="text-xs text-muted-foreground">{s.url || "—"}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => toggle(s)}>{s.is_active ? "Pause" : "Activate"}</Button>
              <Button variant="outline" size="sm" onClick={() => del(s)} className="text-destructive">Delete</Button>
            </div>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
};

export default SourcesAdmin;
