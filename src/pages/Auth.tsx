import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const Auth = () => {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Sign in — TLV Radar";
    supabase.auth.getSession().then(({ data }) => { if (data.session) nav("/admin"); });
  }, [nav]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    nav("/admin");
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. Check your email to confirm.");
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/admin` });
    if (result.error) return toast.error("Google sign-in failed");
    if (result.redirected) return;
    nav("/admin");
  };

  return (
    <SiteLayout>
      <div className="container-page py-16 max-w-md">
        <p className="kicker text-accent">Editors</p>
        <h1 className="font-display text-5xl font-black tracking-tight mt-2">Sign in</h1>
        <p className="text-muted-foreground mt-2 mb-8">Access the TLV Radar editorial dashboard.</p>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <form onSubmit={signIn} className="space-y-4 mt-4">
              <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label>Password</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <Button type="submit" disabled={loading} className="w-full bg-foreground text-background font-bold uppercase tracking-wider h-11">
                {loading ? "…" : "Sign in"}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={signUp} className="space-y-4 mt-4">
              <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label>Password</Label><Input type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <Button type="submit" disabled={loading} className="w-full bg-foreground text-background font-bold uppercase tracking-wider h-11">
                {loading ? "…" : "Create account"}
              </Button>
              <p className="text-xs text-muted-foreground">Your account will need editor or admin role added by an existing admin to access the dashboard.</p>
            </form>
          </TabsContent>
        </Tabs>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
          <div className="flex-1 border-t border-border" /> or <div className="flex-1 border-t border-border" />
        </div>
        <Button variant="outline" onClick={google} className="w-full h-11 font-bold uppercase tracking-wider">
          Continue with Google
        </Button>

        <p className="text-xs text-muted-foreground mt-8">
          <Link to="/" className="hover:text-accent">← Back to TLV Radar</Link>
        </p>
      </div>
    </SiteLayout>
  );
};

export default Auth;
