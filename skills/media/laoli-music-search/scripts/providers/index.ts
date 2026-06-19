// Provider Registry
import * as weixin from "./weixin.js";
import * as jianying from "./jianying.js";

export type ProviderName = "weixin" | "jianying";

export interface Provider {
  search: (opts: any) => Promise<any>;
  providerInfo: {
    name: string;
    description: string;
    cookieFile: string;
    supportedTypes: readonly number[];
  };
}

export const providers: Record<ProviderName, Provider> = {
  weixin,
  jianying,
};

export function getProvider(name: ProviderName): Provider {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`未知的 provider: ${name}`);
  }
  return provider;
}

export function listProviders(): ProviderName[] {
  return Object.keys(providers) as ProviderName[];
}
