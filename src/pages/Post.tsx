import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import type { Database } from "@/integrations/supabase/types";

type Item = Database["public"]["Tables"]["content_items"]["Row"];

const Post = () => {
  const { slug = "" } = useParams();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("content_items").select("*")
        .eq("slug", slug).eq("status", "published").maybeSingle();
      setItem(data);
      setLoading(false);
      if (data) {
        document.title = `${data.title} — TLV Radar`;
        await supabase.from("engagement_events").insert({ content_id: data.id, event: "view" });
      }
    })();
  }, [slug]);

  if (loading) return <SiteLayout><div className="container-page py-20">Loading…</div></SiteLayout>;
  if (!item) return (
    <SiteLayout>
      <div className="container-page py-20">
        <h1 className="font-display text-5xl font-black">Story not found</h1>
        <Link to="/" className="text-accent">Back home</Link>
      </div>
    </SiteLayout>
  );

  return (
    <SiteLayout>
      <article className="container-page py-10 max-w-3xl">
        <p className="kicker text-accent">{item.type}{item.neighborhood && ` · ${item.neighborhood}`}</p>
        <h1 className="font-display text-4xl sm:text-6xl font-black tracking-tight mt-3 leading-[1.02]">{item.title}</h1>
        {item.subtitle && <p className="mt-4 text-xl text-muted-foreground font-display">{item.subtitle}</p>}
        <div className="mt-4 text-xs uppercase tracking-widest text-muted-foreground flex flex-wrap gap-3">
          {item.published_at && <span>{new Date(item.published_at).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}</span>}
          {item.source_name && <span>via {item.source_name}</span>}
        </div>
        {item.hero_image_url && (
          <img src={item.hero_image_url} alt={item.title} className="mt-6 w-full aspect-[16/9] object-cover" />
        )}
        <div className="mt-8 prose prose-lg max-w-none whitespace-pre-wrap leading-relaxed">
          {item.body || item.summary}
        </div>
        {(item.starts_at || item.venue || item.address || item.price) && (
          <aside className="mt-10 border-2 border-foreground p-5 bg-secondary">
            <p className="kicker text-accent mb-3">Details</p>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {item.starts_at && <div><dt className="font-bold uppercase text-xs tracking-wider">When</dt><dd>{new Date(item.starts_at).toLocaleString("en-GB")}</dd></div>}
              {item.venue && <div><dt className="font-bold uppercase text-xs tracking-wider">Venue</dt><dd>{item.venue}</dd></div>}
              {item.address && <div><dt className="font-bold uppercase text-xs tracking-wider">Address</dt><dd>{item.address}</dd></div>}
              {item.price && <div><dt className="font-bold uppercase text-xs tracking-wider">Price</dt><dd>{item.price}</dd></div>}
            </dl>
          </aside>
        )}
        {item.source_url && (
          <a href={item.source_url} target="_blank" rel="noreferrer" className="mt-8 inline-block text-accent font-bold uppercase text-xs tracking-widest">
            Read original source →
          </a>
        )}
      </article>
    </SiteLayout>
  );
};

export default Post;
