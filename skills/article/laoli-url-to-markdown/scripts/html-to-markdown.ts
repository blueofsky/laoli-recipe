import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

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

  // Try Readability for article extraction
  let content: string | null = null;
  let title = pageTitle || "";

  try {
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (article && article.content) {
      title = article.title || title;
      content = turndown.turndown(article.content);
    }
  } catch (e) {
    // Readability failed, fall through
  }

  // Fallback: extract from body directly
  if (!content) {
    try {
      const body = dom.window.document.body;
      if (body) {
        // Remove scripts, styles, nav, header, footer
        for (const sel of ["script", "style", "nav", "header", "footer", "aside"]) {
          body.querySelectorAll(sel).forEach(el => el.remove());
        }
        content = turndown.turndown(body.innerHTML);
      }
    } catch {}
  }

  const metadata: PageMetadata = {
    url,
    title: title || "",
    captured_at: new Date().toISOString(),
  };

  return { metadata, markdown: content || "" };
}

export function formatMetadataYaml(meta: PageMetadata): string {
  const lines: string[] = [];
  if (meta.title) {
    lines.push(`# ${meta.title}`);
  }
  lines.push("");
  if (meta.url) {
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
