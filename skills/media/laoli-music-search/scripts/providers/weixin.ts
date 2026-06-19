// WeChat Video Channel BGM Provider
import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";

// Types
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
  errCode?: number;
  errMsg?: string;
  data?: {
    items?: BgmItem[];
    lastBuffer?: string;
    totalCount?: number;
  };
  result?: {
    bgm_list?: any[];
    has_more?: boolean;
    last_buffer?: string;
  };
  ret?: number;
  err_msg?: string;
}

interface SearchOptions {
  query?: string;
  type: 103 | 104;
  page: number;
  pageSize: number;
  cookie?: string;
}

// Constants
const API_URL =
  "https://channels.weixin.qq.com/micro/content/cgi-bin/mmfinderassistant-bin/post/get_bgm_list";
const AID = "fef6168d-6454-4ea4-9a1d-ce8e476a51a7";
const PAGE_URL =
  "https%3A%2F%2Fchannels.weixin.qq.com%2Fmicro%2Fcontent%2Fpost%2FfinderNewLifeCreate";
const FINDER_UIN = "709044937";
const FINDER_ID =
  "v2_060000231003b20faec8c6e0881bc6d7cf0deb37b077a754641aaced3d6b09f0763f20858e28@finder";

// Cookie Loading
function loadCookie(explicit?: string): string | undefined {
  if (explicit) return explicit;

  // 从 weixin.rest 文件中读取 @cookie 变量
  const restFilePath = join(
    process.env.HOME || process.env.USERPROFILE || ".",
    ".output",
    "weixin.rest"
  );

  // 尝试多个路径
  const restCandidates = [
    restFilePath,
    join(process.cwd(), ".output", "weixin.rest"),
    join(process.cwd(), "weixin.rest"),
    // 从 scripts 目录向上查找项目根目录
    join(process.cwd(), "..", "..", "..", "..", ".output", "weixin.rest"),
    join(process.cwd(), "..", "..", "..", "..", "weixin.rest"),
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

// UUID Generator
function generateUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// Search Function
export async function search(opts: SearchOptions): Promise<ApiResponse> {
  const cookie = loadCookie(opts.cookie);
  if (!cookie) {
    throw new Error(
      "未找到微信视频号 cookie。请通过 --cookie 参数提供，或确保 .output/weixin.rest 文件中定义了 @cookie 变量"
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
      "X-WECHAT-UIN": "3982127419",
      "finger-print-device-id": "e9b733a194ed6c8d028778d5d4b42425",
      "sec-ch-ua": '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    throw new Error(`微信视频号 API 请求失败: ${resp.status} ${resp.statusText}`);
  }

  return (await resp.json()) as ApiResponse;
}

export const providerInfo = {
  name: "weixin",
  description: "微信视频号 BGM",
  cookieSource: "weixin.rest 中的 @cookie 变量",
  supportedTypes: [103, 104] as const,
};
