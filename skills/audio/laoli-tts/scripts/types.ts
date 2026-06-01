export type Provider = "minimax";

export type CliArgs = {
  text: string | null;
  outputDirectory: string | null;
  provider: Provider | null;
  model: string | null;
  voiceId: string | null;
  speed: number | null;
  vol: number | null;
  pitch: number | null;
  emotion: string | null;
  intensity: number | null;
  format: string | null;
  sampleRate: number | null;
  bitrate: number | null;
  channel: number | null;
  languageBoost: string | null;
  json: boolean;
  help: boolean;
};

export type ExtendConfig = {
  version: number;
  default_provider: Provider | null;
  default_model: string | null;
  default_voice: string | null;
  default_speed: number | null;
  default_vol: number | null;
  default_pitch: number | null;
  default_emotion: string | null;
  default_intensity: number | null;
  default_format: string | null;
  default_sample_rate: number | null;
  default_bitrate: number | null;
  default_channel: number | null;
  default_language_boost: string | null;
};

export type TTSResult = {
  filePath: string;
  durationMs: number;
  sizeBytes: number;
  format: string;
};

export interface TTSProvider {
  readonly name: Provider;
  generate(text: string, args: CliArgs): Promise<TTSResult>;
}
