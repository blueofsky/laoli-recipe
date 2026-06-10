import { JSDOM } from "jsdom";
import { Defuddle } from "defuddle";

export interface PageMetadata {
  url: string;
  title: string;
  description?: string;
  author?: string;
  published?: string;
  coverImage?: string;
  captured_at: string;
}

export interface ConversionResult {
  metadata: PageMetadata;
  markdown: string;
}

export const absolutizeUrlsScript = String.raw`
(function() {
  const baseUrl = document.baseURI || location.href;
  function toAbsolute(url) {
    if (!url) return url;
    try { return new URL(url, baseUrl).href; } catch { return url; }
  }
  function absAttr(sel, attr) {
    document.querySelectorAll(sel).forEach(el => {
      const v = el.getAttribute(attr);
      if (v) { const a = toAbsolute(v); if (a) el.setAttribute(attr, a); }
    });
  }
  function absSrcset(sel) {
    document.querySelectorAll(sel).forEach(el => {
      const s = el.getAttribute("srcset");
      if (!s) return;
      el.setAttribute("srcset", s.split(",").map(p => {
        const t = p.trim(); if (!t) return "";
        const [url, ...d] = t.split(/\s+/);
        return d.length ? toAbsolute(url) + " " + d.join(" ") : toAbsolute(url);
      }).filter(Boolean).join(", "));
    });
  }
  document.querySelectorAll("img[data-src], video[data-src], audio[data-src], source[data-src]").forEach(el => {
    const ds = el.getAttribute("data-src");
    if (ds && (!el.getAttribute("src") || el.getAttribute("src") === "" || el.getAttribute("src")?.startsWith("data:"))) {
      el.setAttribute("src", ds);
    }
  });
  absAttr("a[href]", "href");
  absAttr("img[src], video[src], audio[src], source[src]", "src");
  absSrcset("img[srcset], source[srcset]");
  // 优先取微信公众号正文区域，兜底全页
  const articleEl = document.querySelector('#js_content, #content, .content, article, main');
  const html = articleEl ? articleEl.outerHTML : document.documentElement.outerHTML;
  // 顺便取出 title，以备 frontmatter 使用
  const title = document.title || "";
  return { html, title };
})()
`;

export async function extractContent(html: string, url: string, pageTitle?: string): Promise<ConversionResult> {
  const dom = new JSDOM(html, { url });
  const result = await new Defuddle(dom, url, { markdown: true });

  const metadata: PageMetadata = {
    url,
    title: pageTitle || result.title || "",
    description: result.description || undefined,
    author: result.author || undefined,
    published: result.published || undefined,
    coverImage: result.image || undefined,
    captured_at: new Date().toISOString(),
  };

  return { metadata, markdown: result.content || "" };
}

export function formatMetadataYaml(meta: PageMetadata): string {
  const lines: string[] = [];
  if (meta.title) {
    lines.push(`# ${meta.title}`);
  }
  lines.push("");
  if (meta.url) {
    // 从 URL 推断来源，如为微信公众号则标注
    const u = new URL(meta.url);
    const source = u.hostname.includes("weixin.qq.com")
      ? "微信公众号"
      : u.hostname.replace(/^www\./, "");
    lines.push(`**来源：** ${source}`);
  }
  if (meta.author) {
    lines.push(`**作者：** ${meta.author}`);
  }
  if (meta.published) {
    lines.push(`**发布时间：** ${meta.published}`);
  }
  if (meta.url) {
    lines.push(`**原文链接：** ${meta.url}`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  return lines.join("\n");
}

export function createMarkdownDocument(result: ConversionResult): string {
  const header = formatMetadataYaml(result.metadata);
  return header + result.markdown;
}
