import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";

const AdminOverview = () => {
  const [stats, setStats] = useState({ published: 0, drafts: 0, queue: 0, subscribers: 0, sources: 0, runs: 0 });

  useEffect(() => {
    document.title = "Admin — Discover Tel Aviv";
    (async () => {
      const counts = await Promise.all([
        supabase.from("content_items").select("*", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("content_items").select("*", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("submitted_items").select("*", { count: "exact", head: true }).eq("status", "review"),
        supabase.from("subscribers").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("sources").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("automation_runs").select("*", { count: "exact", head: true }),
      ]);
      setStats({
        published: counts[0].count ?? 0,
        drafts: counts[1].count ?? 0,
        queue: counts[2].count ?? 0,
        subscribers: counts[3].count ?? 0,
        sources: counts[4].count ?? 0,
        runs: counts[5].count ?? 0,
      });
    })();
  }, []);

  const tiles = [
    { label: "Published", value: stats.published, to: "/admin/content" },
    { label: "Drafts", value: stats.drafts, to: "/admin/content" },
    { label: "In review queue", value: stats.queue, to: "/admin/queue", accent: true },
    { label: "Subscribers", value: stats.subscribers, to: "/admin/newsletter" },
    { label: "Active sources", value: stats.sources, to: "/admin/sources" },
    { label: "Automation runs", value: stats.runs, to: "/admin/import" },
  ];

  return (
    <AdminShell>
      <h1 className="font-display text-4xl font-black tracking-tight">Today on Discover Tel Aviv</h1>
      <p className="text-muted-foreground mt-1">Operational overview of the local-media engine.</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
        {tiles.map((t) => (
          <Link to={t.to} key={t.label}>
            <Card className={`p-5 border-2 hover:border-foreground transition ${t.accent ? "bg-accent text-accent-foreground border-foreground" : ""}`}>
              <p className="text-xs uppercase tracking-widest opacity-70">{t.label}</p>
              <p className="font-display text-5xl font-black mt-2">{t.value}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid md:grid-cols-2 gap-4">
        <QuickAction to="/admin/import" title="Import content" desc="Pull RSS, paste an Apify run JSON, or trigger NewsAPI." />
        <QuickAction to="/admin/queue" title="Review submissions" desc="Approve user-submitted events into the schedule." />
        <QuickAction to="/admin/newsletter" title="Build morning brief" desc="Compose tomorrow's daily digest from published items." />
        <QuickAction to="/admin/sources" title="Manage sources" desc="Add, pause, or edit RSS feeds and scrapers." />
      </div>
    </AdminShell>
  );
};

const QuickAction = ({ to, title, desc }: { to: string; title: string; desc: string }) => (
  <Link to={to}>
    <Card className="p-5 border-2 hover:border-accent transition">
      <p className="font-display text-xl font-bold">{title}</p>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
    </Card>
  </Link>
);

export default AdminOverview;
