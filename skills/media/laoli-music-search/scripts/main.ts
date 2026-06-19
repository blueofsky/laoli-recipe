#!/usr/bin/env bun
import { getProvider, listProviders, ProviderName } from "./providers/index.js";

// ─── Types ───────────────────────────────────────────────

interface Options {
  provider: ProviderName;
  query?: string;
  type: 103 | 104;
  page: number;
  pageSize: number;
  cookie?: string;
  json: boolean;
  instrumental: boolean;
}

// ─── Display ─────────────────────────────────────────────

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return s > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${m}:00`;
}

function displayResults(data: any, opts: Options): void {
  const items = data.data?.items;

  if (!items || items.length === 0) {
    console.log("未找到匹配的 BGM");
    return;
  }

  const queryLabel = opts.query ? `query: ${opts.query}` : "推荐列表";
  const total = data.data?.totalCount || items.length;
  console.log(`\nBGM 搜索结果 (${queryLabel}) — 共 ${total} 首`);
  console.log("─".repeat(50));

  // Helper: check if a BGM is instrumental (纯音乐)
  function isInstrumental(item: any): boolean {
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

  filtered.forEach((item: any, i: number) => {
    const num = String(i + 1).padStart(2, " ");
    const info = item.listenItem?.playableInfo || item;
    const url = item.listenItem?.url || "";
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
  const providers = listProviders();
  
  console.log(`Usage: bun main.ts [options]

Options:
  --provider <${providers.join('/')}>  BGM data source (default: weixin)
  -q, --query <text>           Search keyword (e.g. 悬疑, 温馨, 紧张)
  -t, --type <103/104>         103=推荐浏览, 104=搜索 (仅 weixin, default: 103)
  -p, --page <n>               Page number (default: 1)
  -s, --size <n>               Page size (default: 50)
  -c, --cookie <text>          Cookie string
  -i, --instrumental           Only show instrumental (纯音乐, no vocals)
      --json                   JSON output
  -h, --help                   Show help

Providers:`);
  
  providers.forEach(name => {
    const provider = getProvider(name);
    console.log(`  ${name.padEnd(12)} - ${provider.providerInfo.description}`);
  });

  console.log(`
Cookie:
  优先使用 --cookie 参数，其次从 .output/<provider>.rest 文件中的 @cookie 变量读取`);

  providers.forEach(name => {
    const provider = getProvider(name);
    console.log(`  - ${name}: .output/${name}.rest 中的 @cookie 变量`);
  });

  console.log(`
Examples:
  bun main.ts --provider weixin                    # 微信视频号推荐
  bun main.ts --provider weixin -q "悬疑"          # 微信视频号搜索
  bun main.ts --provider jianying -q "史诗"        # 剪映搜索
  bun main.ts -q "悬疑" -i                         # 只搜纯音乐
  bun main.ts -q "深沉" -p 2                       # 搜索第2页
  bun main.ts --json                               # JSON输出`);
}

function parseArgs(args: string[]): Options | null {
  const opts: Options = {
    provider: "weixin",
    type: 103,
    page: 1,
    pageSize: 5,
    json: false,
    instrumental: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    } else if (arg === "--provider") {
      const provider = args[++i] as ProviderName;
      if (!listProviders().includes(provider)) {
        console.error(`provider 必须是 ${listProviders().join(' 或 ')}`);
        return null;
      }
      opts.provider = provider;
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
    const provider = getProvider(opts.provider);
    const data = await provider.search({
      query: opts.query,
      type: opts.type,
      page: opts.page,
      pageSize: opts.pageSize,
      cookie: opts.cookie,
    });

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
