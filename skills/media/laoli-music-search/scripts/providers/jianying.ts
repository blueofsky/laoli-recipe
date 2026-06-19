// Jianying BGM Provider
import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";

// Types
interface JianyingBgmItem {
  id: number;
  web_id: string;
  title: string;
  author: string;
  album: string;
  duration: number;
  cover_url: {
    hd: string;
    large: string;
    medium: string;
    thumb: string;
  };
  preview_url: string;
  lyric?: string;
}

interface JianyingApiResponse {
  ret: string;
  errmsg: string;
  data: {
    has_more: boolean;
    source: string;
    songs: JianyingBgmItem[];
  };
}

// Common format types
interface PlayableInfo {
  listenId: string;
  type: number;
  title: string;
  author: string;
  cover: string;
  duration: number;
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
  data?: {
    items?: BgmItem[];
    lastBuffer?: string;
    totalCount?: number;
  };
}

interface SearchOptions {
  query?: string;
  page: number;
  pageSize: number;
  cookie?: string;
}

// Constants
const API_URL = "https://www.jianying.com/lv/v1/search/songs";
const APP_ID = 548669;

// Cookie Loading
function loadCookie(explicit?: string): string | undefined {
  if (explicit) return explicit;

  // 从 jianying.rest 文件中读取 @cookie 变量
  const restFilePath = join(
    process.env.HOME || process.env.USERPROFILE || ".",
    ".output",
    "jianying.rest"
  );

  // 尝试多个路径
  const restCandidates = [
    restFilePath,
    join(process.cwd(), ".output", "jianying.rest"),
    join(process.cwd(), "jianying.rest"),
    // 从 scripts 目录向上查找项目根目录
    join(process.cwd(), "..", "..", "..", "..", ".output", "jianying.rest"),
    join(process.cwd(), "..", "..", "..", "..", "jianying.rest"),
  ];

  for (const path of restCandidates) {
    if (existsSync(path)) {
      try {
        const content = readFileSync(path, "utf-8");
        // 提取 @cookie 变量的值
        const cookieMatch = content.match(/^@cookie\s*=\s*(.+)$/m);
        if (cookieMatch) {
          return cookieMatch[1].trim();
        }
      } catch {}
    }
  }

  return undefined;
}

// Search Function
export async function search(opts: SearchOptions): Promise<ApiResponse> {
  const cookie = loadCookie(opts.cookie);
  if (!cookie) {
    throw new Error(
      "未找到剪映 cookie。请通过 --cookie 参数提供，或确保 .output/jianying.rest 文件中定义了 @cookie 变量"
    );
  }

  const body = {
    app_id: APP_ID,
    region: "CN",
    search_song_type: 0,
    keyword: opts.query || "",
    offset: (opts.page - 1) * opts.pageSize,
    count: opts.pageSize,
  };

  const resp = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
      Origin: "https://www.jianying.com",
      Referer: "https://www.jianying.com/editor",
      Appvr: "5.8.0",
      Pf: "7",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    throw new Error(`剪映 API 请求失败: ${resp.status} ${resp.statusText}`);
  }

  const jianyingData = await resp.json() as JianyingApiResponse;
  
  // Convert to common format
  return {
    data: {
      items: jianyingData.data?.songs?.map(song => ({
        listenItem: {
          playableInfo: {
            listenId: String(song.id),
            type: 0,
            title: song.title,
            author: song.author,
            cover: song.cover_url?.medium || song.cover_url?.large || "",
            duration: song.duration * 1000, // Convert to ms
            finderFeedId: "",
            finderNonceId: "",
          },
          playable: 1,
          url: song.preview_url,
          lyric: song.lyric || "",
          musicType: 0,
          recommendBuf: "",
        }
      })) || [],
      totalCount: jianyingData.data?.songs?.length || 0,
    }
  };
}

export const providerInfo = {
  name: "jianying",
  description: "剪映 BGM（可下载，适用于视频制作）",
  cookieSource: "jianying.rest 中的 @cookie 变量",
  supportedTypes: [] as const, // 剪映不支持 type 参数
};
