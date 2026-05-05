import { ReactNode } from "react";
import { NavLink, Navigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Inbox, FileText, Rss, Mail, Users, LogOut, Radio, AlertTriangle } from "lucide-react";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/import", label: "Import center", icon: Rss },
  { to: "/admin/queue", label: "Review queue", icon: Inbox },
  { to: "/admin/content", label: "Content", icon: FileText },
  { to: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { to: "/admin/sources", label: "Sources", icon: Users },
];

export const AdminShell = ({ children }: { children: ReactNode }) => {
  const { user, isStaff, loading } = useAuth();
  const loc = useLocation();

  if (loading) return <div className="p-10 text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace state={{ from: loc.pathname }} />;

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 border-r-2 border-foreground bg-card flex flex-col">
        <Link to="/" className="p-5 border-b-2 border-foreground flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center bg-accent text-accent-foreground">
            <Radio className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="font-display font-black text-xl">TLV·RADAR</span>
        </Link>
        <nav className="p-3 flex-1 space-y-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded transition-colors ${
                  isActive ? "bg-foreground text-background" : "hover:bg-secondary"
                }`
              }
            >
              <n.icon className="h-4 w-4" />{n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <p className="text-xs text-muted-foreground truncate mb-2">{user.email}</p>
          <Button variant="outline" size="sm" className="w-full" onClick={() => supabase.auth.signOut()}>
            <LogOut className="h-3 w-3 mr-2" />Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {!isStaff && (
          <div className="bg-highlight border-b-2 border-foreground p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold">You're signed in but you don't have editor or admin role yet.</p>
              <p className="opacity-80">Ask an existing admin to grant you a role, or run this SQL once to bootstrap yourself as admin:</p>
              <code className="block mt-2 p-2 bg-foreground text-background text-xs font-mono break-all">
                insert into public.user_roles (user_id, role) values ('{user.id}', 'admin');
              </code>
            </div>
          </div>
        )}
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
};
