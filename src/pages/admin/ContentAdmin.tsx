import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Item = Database["public"]["Tables"]["content_items"]["Row"];

const ContentAdmin = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<"all" | "draft" | "published">("all");

  const load = async () => {
    let q = supabase.from("content_items").select("*").order("updated_at", { ascending: false }).limit(100);
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setItems(data ?? []);
  };

  useEffect(() => { document.title = "Content — Discover Tel Aviv"; load(); /* eslint-disable-next-line */ }, [filter]);

  const togglePublish = async (i: Item) => {
    const newStatus = i.status === "published" ? "draft" : "published";
    const { error } = await supabase.from("content_items").update({
      status: newStatus,
      published_at: newStatus === "published" ? (i.published_at ?? new Date().toISOString()) : i.published_at,
    }).eq("id", i.id);
    if (error) return toast.error(error.message);
    toast.success(newStatus === "published" ? "Published" : "Unpublished");
    load();
  };

  const toggleFeature = async (i: Item) => {
    await supabase.from("content_items").update({ is_featured: !i.is_featured }).eq("id", i.id);
    load();
  };

  const del = async (i: Item) => {
    if (!confirm(`Delete "${i.title}"?`)) return;
    await supabase.from("content_items").delete().eq("id", i.id);
    load();
  };

  return (
    <AdminShell>
      <div className="flex justify-between items-center">
        <h1 className="font-display text-4xl font-black tracking-tight">Content</h1>
        <div className="flex gap-2">
          {(["all","draft","published"] as const).map(f => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className="uppercase tracking-wider text-xs">{f}</Button>
          ))}
        </div>
      </div>
      <div className="mt-6 space-y-2">
        {items.length === 0 && <p className="text-muted-foreground">No content yet.</p>}
        {items.map((i) => (
          <Card key={i.id} className="p-4 border flex items-start gap-4">
            {i.hero_image_url && <img src={i.hero_image_url} alt="" className="h-16 w-16 object-cover" />}
            <div className="flex-1 min-w-0">
              <p className="kicker text-accent">{i.type} · {i.status}{i.is_featured && " · ⭐"}</p>
              <p className="font-bold truncate">{i.title}</p>
              <p className="text-xs text-muted-foreground">
                {i.source_name || "Manual"} · updated {new Date(i.updated_at).toLocaleString("en-GB")}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button size="sm" onClick={() => togglePublish(i)} className={i.status === "published" ? "" : "bg-accent text-accent-foreground hover:bg-accent/90"}>
                {i.status === "published" ? "Unpublish" : "Publish"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => toggleFeature(i)}>{i.is_featured ? "Unfeature" : "Feature"}</Button>
              {i.status === "published" && <Button size="sm" variant="outline" asChild><Link to={`/post/${i.slug}`}>View</Link></Button>}
              <Button size="sm" variant="outline" onClick={() => del(i)} className="text-destructive">Delete</Button>
            </div>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
};

export default ContentAdmin;
