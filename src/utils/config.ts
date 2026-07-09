import dotenv from "dotenv";

dotenv.config();

export type ProviderName = "anthropic" | "zhipu" | "ollama";

export interface AppConfig {
  anthropic: {
    apiKey: string;
    model: string;
    baseUrl: string;
  };
  zhipu: {
    apiKey: string;
    model: string;
    baseUrl: string;
  };
  ollama: {
    baseUrl: string;
    model: string;
  };
  defaultProvider: ProviderName;
  debug: boolean;
}

const VALID_PROVIDERS: ProviderName[] = ["anthropic", "zhipu", "ollama"];

let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;

  const rawDefault = (process.env.DEFAULT_PROVIDER ?? "anthropic").toLowerCase();
  const defaultProvider = (
    VALID_PROVIDERS.includes(rawDefault as ProviderName) ? rawDefault : "anthropic"
  ) as ProviderName;

  cachedConfig = {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY ?? "",
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929",
      baseUrl: (process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com").replace(/\/$/, ""),
    },
    zhipu: {
      apiKey: process.env.ZHIPU_API_KEY ?? "",
      model: process.env.ZHIPU_MODEL ?? "glm-4v",
      baseUrl: (process.env.ZHIPU_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4").replace(/\/$/, ""),
    },
    ollama: {
      baseUrl: (process.env.OLLAMA_BASE_URL ?? "http://localhost:11434").replace(/\/$/, ""),
      model: process.env.OLLAMA_MODEL ?? "llava",
    },
    defaultProvider,
    debug: process.env.DEBUG === "true",
  };

  return cachedConfig;
}

/**
 * 判断某个 provider 是否已配置好可用凭证。
 * Ollama 是本地服务，凭证层面始终视为可用，实际可用性在请求时校验。
 */
export function isProviderAvailable(provider: ProviderName): boolean {
  const config = getConfig();
  switch (provider) {
    case "anthropic":
      return Boolean(config.anthropic.apiKey);
    case "zhipu":
      return Boolean(config.zhipu.apiKey);
    case "ollama":
      return true;
    default:
      return false;
  }
}

/**
 * 解析最终使用的 provider。
 * 若显式指定且有效则用之；否则按 [defaultProvider, anthropic, zhipu, ollama] 优先级回退到第一个可用的。
 */
export function resolveProvider(requested?: string): ProviderName {
  if (requested) {
    const p = requested.toLowerCase();
    if (!VALID_PROVIDERS.includes(p as ProviderName)) {
      throw new Error(
        `未知的 provider: "${requested}"。支持的值: anthropic, zhipu, ollama`,
      );
    }
    return p as ProviderName;
  }

  const config = getConfig();
  const order: ProviderName[] = [
    config.defaultProvider,
    "anthropic",
    "zhipu",
    "ollama",
  ];
  const seen = new Set<ProviderName>();
  for (const p of order) {
    if (seen.has(p)) continue;
    seen.add(p);
    if (isProviderAvailable(p)) return p;
  }
  throw new Error("没有可用的 provider，请检查 .env 配置（至少配置一个 API key）");
}
