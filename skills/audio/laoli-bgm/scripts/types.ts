export type Provider = "minimax";

export type MusicCliArgs = {
  prompt: string | null;
  outputDirectory: string | null;
  provider: Provider | null;
  model: string | null;
  style: string | null;
  format: string | null;
  sampleRate: number | null;
  bitrate: number | null;
  aigcWatermark: boolean | null;
  json: boolean;
  help: boolean;
};

export type MusicExtendConfig = {
  version: number;
  default_provider: Provider | null;
  default_model: string | null;
  default_style: string | null;
  default_format: string | null;
  default_sample_rate: number | null;
  default_bitrate: number | null;
};

export type MusicResult = {
  filePath: string;
  /** 音乐时长（秒），API 直接返回秒数 */
  durationS: number;
  sizeBytes: number;
  format: string;
  sampleRate: number;
  channels: number;
};

export interface MusicProvider {
  readonly name: Provider;
  generate(prompt: string, args: MusicCliArgs): Promise<MusicResult>;
}
