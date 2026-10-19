import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ToursCard } from "@/components/site/Partners";
import { EventsBlock, HolidayBlock, PhotoBlock, PickBlock, PlaceListBlock, TipBlock } from "./Blocks";

// A small Markdown renderer for our own articles: headings, paragraphs, lists, quotes,
// bold/italic/links, images, plus live blocks written as [[kind: ...]] on their own line.

const inline = (text: string, key = "i"): ReactNode[] => {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${key}-${n++}`;
    if (tok.startsWith("**")) out.push(<strong key={k}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("*")) out.push(<em key={k}>{tok.slice(1, -1)}</em>);
    else {
      const [, label, href] = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok)!;
      out.push(href.startsWith("/")
        ? <Link key={k} to={href} className="text-sea underline underline-offset-4 decoration-1 hover:decoration-2">{label}</Link>
        : <a key={k} href={href} target="_blank" rel="noopener noreferrer" className="text-sea underline underline-offset-4 decoration-1 hover:decoration-2">{label}</a>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
};

const params = (s: string) =>
  Object.fromEntries(s.split(";").map((kv) => kv.split("=").map((x) => x.trim())).filter((kv) => kv[0]).map(([k, v]) => [k, v ?? "1"]));

const block = (line: string, key: string): ReactNode => {
  const m = /^\[\[(\w+):\s*([\s\S]*)\]\]$/.exec(line.trim());
  if (!m) return null;
  const [, kind, rest] = m;
  const [first, ...more] = rest.split("|");
  const text = more.join("|").trim();
  switch (kind) {
    case "pick": return <PickBlock key={key} name={first.trim()} text={text} />;
    case "list": return <PlaceListBlock key={key} {...params(rest)} />;
    case "events": return <EventsBlock key={key} {...params(rest)} />;
    case "tip": return <TipBlock key={key}>{inline(rest.trim(), key)}</TipBlock>;
    case "photo": return <PhotoBlock key={key} src={first.trim()} caption={text} />;
    case "holiday": return <HolidayBlock key={key} name={first.trim()} />;
    case "tours": return <ToursCard key={key} query={first.trim()} title={text || undefined} className="mt-8" />;
    default: return null;
  }
};

export const Markdown = ({ source }: { source: string }) => {
  const lines = source.split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i];
    const key = `b${k++}`;
    if (!line.trim()) { i++; continue; }
    if (line.trim().startsWith("[[")) {
      // A block may span lines until its closing ]]
      let buf = line;
      while (!buf.trim().endsWith("]]") && i + 1 < lines.length) buf += "\n" + lines[++i];
      out.push(block(buf, key));
      i++;
      continue;
    }
    const h = /^(#{2,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const cls = level === 2 ? "mt-12 font-display text-[30px] sm:text-[36px] leading-tight" : level === 3 ? "mt-8 text-[22px] font-semibold leading-snug" : "mt-6 text-[18px] font-semibold";
      const Tag = (`h${level}` as "h2" | "h3" | "h4");
      out.push(<Tag key={key} id={h[2].toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-")} className={cls}>{inline(h[2], key)}</Tag>);
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]))) {
        items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ""));
        i++;
      }
      const L = ordered ? "ol" : "ul";
      out.push(
        <L key={key} className={`mt-4 space-y-2 ps-6 text-[18px] leading-relaxed ${ordered ? "list-decimal" : "list-disc"} marker:text-muted-foreground`}>
          {items.map((it, j) => <li key={j}>{inline(it, `${key}-${j}`)}</li>)}
        </L>,
      );
      continue;
    }
    if (line.startsWith(">")) {
      const q: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) q.push(lines[i++].replace(/^>\s?/, ""));
      out.push(<blockquote key={key} className="mt-6 border-s-4 border-[#d6336c] ps-5 font-display text-[24px] leading-snug">{inline(q.join(" "), key)}</blockquote>);
      continue;
    }
    const img = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(line.trim());
    if (img) {
      out.push(<PhotoBlock key={key} src={img[2]} caption={img[1]} />);
      i++;
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,4}\s|\s*[-*]\s|\s*\d+\.\s|>|\[\[|!\[)/.test(lines[i])) para.push(lines[i++]);
    out.push(<p key={key} className="mt-5 text-[18px] leading-[1.75]">{inline(para.join(" "), key)}</p>);
  }
  return <Fragment>{out}</Fragment>;
};
