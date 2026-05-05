import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Source = Database["public"]["Tables"]["sources"]["Row"];
type Run = Database["public"]["Tables"]["automation_runs"]["Row"];

const ImportCenter = () => {
  const [sources, setSources] = useState<Source[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [apifyJson, setApifyJson] = useState("");
  const [actorId, setActorId] = useState("");
  const [actorMode, setActorMode] = useState<"last" | "run">("last");
  const [actorInput, setActorInput] = useState("");
  const [newsQuery, setNewsQuery] = useState('"Tel Aviv"');

  const load = async () => {
    const [s, r] = await Promise.all([
      supabase.from("sources").select("*").order("name"),
      supabase.from("automation_runs").select("*").order("started_at", { ascending: false }).limit(15),
    ]);
    setSources(s.data ?? []);
    setRuns(r.data ?? []);
  };

  useEffect(() => { document.title = "Import — TLV Radar"; load(); }, []);

  const runRss = async (s: Source) => {
    setBusy(s.id);
    const { data, error } = await supabase.functions.invoke("import-rss-feed", { body: { source_id: s.id } });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Imported ${data?.items_in ?? 0} items, created ${data?.items_out ?? 0} drafts.`);
    load();
  };

  const importApify = async () => {
    let parsed: unknown;
    try { parsed = JSON.parse(apifyJson); } catch { return toast.error("Invalid JSON"); }
    if (!Array.isArray(parsed)) return toast.error("Expected a JSON array of items");
    setBusy("apify");
    const { data, error } = await supabase.functions.invoke("import-apify-results", { body: { items: parsed } });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Imported ${data?.items_out ?? 0} drafts from Apify.`);
    setApifyJson("");
    load();
  };

  const runActor = async () => {
    if (!actorId.trim()) return toast.error("Actor ID required (e.g. user~actor-name)");
    let input: unknown = undefined;
    if (actorMode === "run" && actorInput.trim()) {
      try { input = JSON.parse(actorInput); } catch { return toast.error("Actor input must be valid JSON"); }
    }
    setBusy("actor");
    const { data, error } = await supabase.functions.invoke("import-apify-actor", {
      body: { actor_id: actorId.trim(), mode: actorMode, input },
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    if (data?.error) return toast.error(data.error);
    toast.success(`Pulled ${data?.items_in ?? 0} items, created ${data?.items_out ?? 0} drafts.`);
    load();
  };

  const runNewsApi = async () => {
    setBusy("news");
    const { data, error } = await supabase.functions.invoke("import-newsapi", {
      body: { query: newsQuery },
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    if (data?.error) return toast.error(data.error);
    toast.success(`Found ${data?.items_in ?? 0} articles, created ${data?.items_out ?? 0} drafts.`);
    load();
  };

  return (
    <AdminShell>
      <h1 className="font-display text-4xl font-black tracking-tight">Import center</h1>
      <p className="text-muted-foreground mt-1">Pull content from RSS, Apify scrapers, or manual paste. Items land as drafts in the review queue.</p>

      <Tabs defaultValue="rss" className="mt-8">
        <TabsList>
          <TabsTrigger value="rss">RSS sources</TabsTrigger>
          <TabsTrigger value="newsapi">NewsAPI</TabsTrigger>
          <TabsTrigger value="actor">Apify actor</TabsTrigger>
          <TabsTrigger value="apify">Apify paste</TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
          <TabsTrigger value="runs">Recent runs</TabsTrigger>
        </TabsList>

        <TabsContent value="rss" className="mt-4 space-y-3">
          {sources.filter(s => s.kind === "rss").length === 0 && (
            <p className="text-sm text-muted-foreground">No RSS sources yet. Add one in the Sources tab.</p>
          )}
          {sources.filter(s => s.kind === "rss").map((s) => (
            <Card key={s.id} className="p-4 flex items-center justify-between border-2">
              <div>
                <p className="font-bold">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.url}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {s.last_run_at ? `Last run: ${new Date(s.last_run_at).toLocaleString("en-GB")}` : "Never run"}
                </p>
              </div>
              <Button onClick={() => runRss(s)} disabled={busy === s.id} className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold uppercase tracking-wider">
                {busy === s.id ? "Running…" : "Run now"}
              </Button>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="newsapi" className="mt-4">
          <Card className="p-5 border-2 space-y-3">
            <div>
              <Label className="text-xs uppercase tracking-widest">Search query</Label>
              <Input value={newsQuery} onChange={(e) => setNewsQuery(e.target.value)} className="mt-2" placeholder='"Tel Aviv"' />
              <p className="text-xs text-muted-foreground mt-2">
                Pulls articles from NewsAPI.org and filters for Tel Aviv mentions. Saved as drafts.
              </p>
            </div>
            <Button onClick={runNewsApi} disabled={busy === "news"} className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold uppercase tracking-wider">
              {busy === "news" ? "Fetching…" : "Fetch from NewsAPI"}
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="actor" className="mt-4">
          <Card className="p-5 border-2 space-y-3">
            <div>
              <Label className="text-xs uppercase tracking-widest">Apify actor ID</Label>
              <Input value={actorId} onChange={(e) => setActorId(e.target.value)} className="mt-2 font-mono" placeholder="username~actor-name" />
            </div>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="radio" checked={actorMode === "last"} onChange={() => setActorMode("last")} /> Use last successful run</label>
              <label className="flex items-center gap-2"><input type="radio" checked={actorMode === "run"} onChange={() => setActorMode("run")} /> Run actor now</label>
            </div>
            {actorMode === "run" && (
              <div>
                <Label className="text-xs uppercase tracking-widest">Actor input (JSON, optional)</Label>
                <Textarea rows={6} value={actorInput} onChange={(e) => setActorInput(e.target.value)} className="font-mono text-xs mt-2" placeholder='{"startUrls":[{"url":"..."}]}' />
              </div>
            )}
            <Button onClick={runActor} disabled={busy === "actor" || !actorId} className="bg-foreground text-background hover:bg-foreground/90 font-bold uppercase tracking-wider">
              {busy === "actor" ? "Running…" : "Pull from Apify"}
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="apify" className="mt-4">
          <Card className="p-5 border-2">
            <Label className="text-xs uppercase tracking-widest">Paste Apify dataset JSON (array)</Label>
            <Textarea rows={10} value={apifyJson} onChange={(e) => setApifyJson(e.target.value)} className="font-mono text-xs mt-2" placeholder='[{"title":"...", "url":"...", ...}]' />
            <p className="text-xs text-muted-foreground mt-2">
              Get this from your Apify run → Storage → Dataset → "Export → JSON". Once you give me the Apify API key, this can run live by actor ID.
            </p>
            <Button onClick={importApify} disabled={busy === "apify" || !apifyJson} className="mt-3 bg-foreground text-background hover:bg-foreground/90 font-bold uppercase tracking-wider">
              {busy === "apify" ? "Importing…" : "Import as drafts"}
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <ManualForm onSaved={load} />
        </TabsContent>

        <TabsContent value="runs" className="mt-4 space-y-2">
          {runs.length === 0 && <p className="text-sm text-muted-foreground">No runs yet.</p>}
          {runs.map((r) => (
            <Card key={r.id} className={`p-3 border-l-4 ${r.status === "error" ? "border-l-destructive" : "border-l-sea"}`}>
              <div className="flex justify-between text-sm">
                <span className="font-bold">{r.job}</span>
                <span className="text-muted-foreground">{new Date(r.started_at).toLocaleString("en-GB")}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                in: {r.items_in} · out: {r.items_out} · {r.status}{r.error ? ` · ${r.error}` : ""}
              </p>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
};

const ManualForm = ({ onSaved }: { onSaved: () => void }) => {
  const [f, setF] = useState({ title: "", summary: "", body: "", source_url: "", hero_image_url: "", type: "news" });
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const slug = f.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) + "-" + Date.now().toString(36);
    const { error } = await supabase.from("content_items").insert({
      slug, type: f.type as never, title: f.title, summary: f.summary, body: f.body,
      source_url: f.source_url || null, hero_image_url: f.hero_image_url || null, status: "draft",
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Draft created.");
    setF({ title: "", summary: "", body: "", source_url: "", hero_image_url: "", type: "news" });
    onSaved();
  };

  return (
    <Card className="p-5 border-2">
      <form onSubmit={save} className="space-y-3">
        <div><Label>Title</Label><Input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Type</Label>
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className="w-full h-10 px-3 border border-input rounded bg-background">
              {["news","event","opening","food","nightlife","business","guide"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div><Label>Hero image URL</Label><Input value={f.hero_image_url} onChange={(e) => setF({ ...f, hero_image_url: e.target.value })} /></div>
        </div>
        <div><Label>Summary</Label><Textarea rows={2} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} /></div>
        <div><Label>Body</Label><Textarea rows={6} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></div>
        <div><Label>Source URL</Label><Input type="url" value={f.source_url} onChange={(e) => setF({ ...f, source_url: e.target.value })} /></div>
        <Button type="submit" disabled={saving} className="bg-foreground text-background hover:bg-foreground/90 font-bold uppercase tracking-wider">
          {saving ? "Saving…" : "Save as draft"}
        </Button>
      </form>
    </Card>
  );
};

export default ImportCenter;
