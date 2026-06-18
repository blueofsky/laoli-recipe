#!/usr/bin/env bun
import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { homedir } from "os";

// ─── Types ───────────────────────────────────────────────

interface PlayableInfo {
  listenId: string;
  type: number;
  title: string;
  author: string;
  cover: string;
  duration: number;  // 毫秒
  finderFeedId: string;
  finderNonceId: string;
}

interface ListenItem {
  playableInfo: PlayableInfo;
  playable: number;
  url: string;
  lyric: string;
  musicType: number;
  recommendBuf: string;
}

interface BgmItem {
  listenItem: ListenItem;
}

interface ApiResponse {
  errCode?: number;
  errMsg?: string;
  data?: {
    items?: BgmItem[];
    lastBuffer?: string;
    totalCount?: number;
  };
  // Legacy format fallback
  result?: {
    bgm_list?: any[];
    has_more?: boolean;
    last_buffer?: string;
  };
  ret?: number;
  err_msg?: string;
}

interface Options {
  query?: string;
  type: 103 | 104;
  page: number;
  pageSize: number;
  cookie?: string;
  json: boolean;
  instrumental: boolean;
}

// ─── Constants ───────────────────────────────────────────

const API_URL =
  "https://channels.weixin.qq.com/micro/content/cgi-bin/mmfinderassistant-bin/post/get_bgm_list";
const AID = "fef6168d-6454-4ea4-9a1d-ce8e476a51a7";
const PAGE_URL =
  "https%3A%2F%2Fchannels.weixin.qq.com%2Fmicro%2Fcontent%2Fpost%2FfinderNewLifeCreate";
const FINDER_UIN = "709044937";
const FINDER_ID =
  "v2_060000231003b20faec8c6e0881bc6d7cf0deb37b077a754641aaced3d6b09f0763f20858e28@finder";

const COOKIE_FILE = join(
  process.env.HOME || process.env.USERPROFILE || ".",
  ".output",
  "bgm_cookie.txt"
);

// ─── Cookie Loading ──────────────────────────────────────

function loadCookie(explicit?: string): string | undefined {
  if (explicit) return explicit;

  // Try multiple locations
  const candidates = [
    COOKIE_FILE,
    join(process.cwd(), ".output", "bgm_cookie.txt"),
    join(process.cwd(), "bgm_cookie.txt"),
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      try {
        const content = readFileSync(path, "utf-8").trim();
        if (content) return content;
      } catch {}
    }
  }

  return undefined;
}

// ─── API Call ────────────────────────────────────────────

function generateUuid(): string {
  // Simple UUID v4 generator
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function searchBgm(opts: Options): Promise<ApiResponse> {
  const cookie = loadCookie(opts.cookie);
  if (!cookie) {
    throw new Error(
      "未找到 cookie。请通过 --cookie 参数提供，或保存到 .output/bgm_cookie.txt"
    );
  }

  const rid = generateUuid();
  const timestamp = String(Date.now());
  const type = opts.query ? 104 : opts.type;

  const body = {
    currentPage: opts.page,
    lastBuffer: "",
    pageSize: opts.pageSize,
    type,
    ...(opts.query ? { query: opts.query } : {}),
    recommendThumbUrlList: [],
    timestamp,
    _log_finder_uin: FINDER_UIN,
    _log_finder_id: FINDER_ID,
    rawKeyBuff: "",
    pluginSessionId: null,
    scene: 7,
    reqScene: 7,
  };

  const url = `${API_URL}?_aid=${AID}&_rid=${rid}&_pageUrl=${PAGE_URL}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
      Origin: "https://channels.weixin.qq.com",
      Referer:
        "https://channels.weixin.qq.com/micro/content/post/finderNewLifeCreate",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    throw new Error(`API 请求失败: ${resp.status} ${resp.statusText}`);
  }

  return (await resp.json()) as ApiResponse;
}

// ─── Display ─────────────────────────────────────────────

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return s > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${m}:00`;
}

function displayResults(data: ApiResponse, opts: Options): void {
  // Try new format first (data.items), then legacy (result.bgm_list)
  const items = data.data?.items || data.result?.bgm_list;

  if (!items || items.length === 0) {
    console.log("未找到匹配的 BGM");
    return;
  }

  const queryLabel = opts.query ? `query: ${opts.query}` : "推荐列表";
  const total = data.data?.totalCount || items.length;
  console.log(`\nBGM 搜索结果 (${queryLabel}) — 共 ${total} 首`);
  console.log("─".repeat(50));

  // Helper: check if a BGM is instrumental (纯音乐)
  function isInstrumental(item: BgmItem): boolean {
    const lyric = item.listenItem?.lyric || "";
    return (
      lyric.includes("此歌曲为没有填词的纯音乐") ||
      lyric.includes("没有填词的纯音乐") ||
      lyric.trim() === ""
    );
  }

  // Filter if --instrumental
  const filtered = opts.instrumental ? items.filter(isInstrumental) : items;

  if (filtered.length === 0) {
    console.log(opts.instrumental ? "未找到纯音乐 BGM（全部带人声）" : "未找到匹配的 BGM");
    return;
  }

  filtered.forEach((item, i) => {
    const num = String(i + 1).padStart(2, " ");
    const info = item.listenItem?.playableInfo || item;
    const url = item.listenItem?.url || (item as any).play_url || "";
    const dur = formatDuration(info.duration);
    const tag = isInstrumental(item) ? "♪" : "🎤";
    console.log(` ${num}. ${tag} ${info.title}    ${info.author}   ${dur}`);
    if (url) {
      console.log(`     play: ${url}`);
    }
  });

  console.log("");
  if (data.data?.lastBuffer) {
    console.log(`还有更多结果，使用 --page ${opts.page + 1} 查看下一页`);
  }
}

// ─── CLI ─────────────────────────────────────────────────

function printHelp(): void {
  console.log(`Usage: bun main.ts [options]

Options:
  -q, --query <text>   Search keyword (e.g. 悬疑, 温馨, 紧张)
  -t, --type <103/104> 103=推荐浏览, 104=搜索 (default: 103)
  -p, --page <n>       Page number (default: 1)
  -s, --size <n>       Page size (default: 5)
  -c, --cookie <text>  WeChat cookie string
  -i, --instrumental   Only show instrumental (纯音乐, no vocals)
      --json           JSON output
  -h, --help           Show help

Cookie:
  优先使用 --cookie 参数，其次读取 .output/bgm_cookie.txt

Examples:
  bun main.ts                        # 浏览推荐
  bun main.ts -q "悬疑"              # 搜索关键词
  bun main.ts -q "悬疑" -i           # 只搜纯音乐
  bun main.ts -q "深沉" -p 2         # 搜索第2页
  bun main.ts --json                 # JSON输出`);
}

function parseArgs(args: string[]): Options | null {
  const opts: Options = {
    type: 103,
    page: 1,
    pageSize: 50,
    json: false,
    instrumental: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    } else if (arg === "-q" || arg === "--query") {
      opts.query = args[++i];
    } else if (arg === "-t" || arg === "--type") {
      const t = parseInt(args[++i], 10);
      if (t !== 103 && t !== 104) {
        console.error("type 必须是 103 或 104");
        return null;
      }
      opts.type = t;
    } else if (arg === "-p" || arg === "--page") {
      opts.page = parseInt(args[++i], 10) || 1;
    } else if (arg === "-s" || arg === "--size") {
      opts.pageSize = parseInt(args[++i], 10) || 5;
    } else if (arg === "-c" || arg === "--cookie") {
      opts.cookie = args[++i];
    } else if (arg === "-i" || arg === "--instrumental") {
      opts.instrumental = true;
    } else if (arg === "--json") {
      opts.json = true;
    }
  }

  return opts;
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const opts = parseArgs(args);
  if (!opts) process.exit(1);

  try {
    const data = await searchBgm(opts);

    if (opts.json) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      displayResults(data, opts);
    }
  } catch (e) {
    console.error(`Error: ${(e as Error).message}`);
    process.exit(1);
  }
}

main();
