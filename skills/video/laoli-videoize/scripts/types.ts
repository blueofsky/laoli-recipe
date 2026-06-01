export type Provider = "tuzi" | "apimart";

export type CliArgs = {
  prompt: string | null
  promptFiles: string[]
  videoPath: string | null
  provider: Provider | null
  model: string | null
  seconds: number | null
  size: string | null
  resolution: string | null
  referenceImages: string[]
  refMode: "reference" | "frames" | "components" | "last_frame" | null
  segments: number | null
  segmentPrompts: string[]
  audio: boolean
  cleanup: boolean
  reencode: boolean
  json: boolean
  help: boolean
}

export type ExtendConfig = {
  version: number
  default_provider: Provider | null
  default_model: {
    tuzi: string | null
    apimart: string | null
  }
  default_seconds: string | null
  default_size: string | null
  default_resolution: string | null
}
