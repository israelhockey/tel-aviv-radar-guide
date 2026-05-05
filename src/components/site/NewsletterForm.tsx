import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const NewsletterForm = ({ variant = "light" }: { variant?: "light" | "dark" }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const { error } = await supabase
      .from("subscribers")
      .insert({ email: email.trim().toLowerCase(), source: "site_footer" });
    setLoading(false);
    if (error) {
      if (error.code === "23505") {
        toast.success("You're already subscribed.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("Subscribed. See you tomorrow morning.");
    setEmail("");
  };

  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input
        type="email"
        required
        placeholder="you@telaviv.email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={variant === "dark"
          ? "bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground placeholder:text-primary-foreground/50"
          : ""}
      />
      <Button type="submit" disabled={loading} className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold uppercase tracking-wider">
        {loading ? "..." : "Join"}
      </Button>
    </form>
  );
};
