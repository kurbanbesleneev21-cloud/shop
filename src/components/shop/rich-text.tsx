import { Fragment } from "react";

/** Minimal, XSS-safe markdown renderer (headings, lists, bold, paragraphs). Output is built from React nodes only. */
function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <Fragment key={i}>{p}</Fragment>));
}

export function RichText({ content }: { content: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = content.replace(/\r/g, "").split("\n");
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (list) {
      const L = list.ordered ? "ol" : "ul";
      blocks.push(<L key={blocks.length}>{list.items.map((it, i) => <li key={i}>{inline(it)}</li>)}</L>);
      list = null;
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    const ul = /^[-*•]\s+(.*)$/.exec(line);
    const ol = /^\d+[.)]\s+(.*)$/.exec(line);
    if (ul || ol) {
      const ordered = Boolean(ol);
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((ul ?? ol)![1]);
      continue;
    }
    flush();
    if (!line) continue;
    if (line.startsWith("## ") || line.startsWith("# ")) blocks.push(<h2 key={blocks.length}>{line.replace(/^#+\s/, "")}</h2>);
    else blocks.push(<p key={blocks.length}>{inline(line)}</p>);
  }
  flush();
  return <div className="prose-tm">{blocks}</div>;
}
