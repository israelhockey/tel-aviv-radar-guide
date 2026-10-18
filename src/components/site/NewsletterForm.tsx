import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mail } from "lucide-react";
import { toast } from "sonner";

export const NewsletterForm = ({
  variant = "light",
  cta = "Subscribe",
}: { variant?: "light" | "dark"; cta?: string }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.from("subscribers").insert({
      email: email.trim().toLowerCase(), source: "site",
    });
    setLoading(false);
    if (error) {
      if (error.code === "23505") toast.success("You're already subscribed.");
      else toast.error(error.message);
      return;
    }
    toast.success("Subscribed. See you Thursday.");
    setEmail("");
  };

  const inputClasses = variant === "dark"
    ? "bg-card text-foreground placeholder:text-muted-foreground"
    : "bg-card text-foreground placeholder:text-muted-foreground border border-border";

  return (
    <form onSubmit={submit} className="flex items-center rounded-full p-1 bg-card shadow-sm">
      <div className="flex-1 flex items-center gap-2 px-4">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <input
          type="email"
          required
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`flex-1 h-10 outline-none text-sm ${inputClasses}`}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="h-10 rounded-full bg-accent px-5 text-sm font-bold text-accent-foreground hover:bg-accent/90 transition disabled:opacity-60"
      >
        {loading ? "…" : cta}
      </button>
    </form>
  );
};
