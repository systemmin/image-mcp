import type { LoadedImage } from "../utils/image.js";
import type { ProviderName } from "../utils/config.js";
import { AnthropicProvider } from "./anthropic.js";
import { ZhipuProvider } from "./zhipu.js";
import { OllamaProvider } from "./ollama.js";

/**
 * 统一的视觉 provider 接口。
 * 核心只有一个 analyze 方法：给定若干图片与一段提示词，返回模型文本回答。
 * describe / qa / multimodal 三类工具调用本质上只是 prompt 不同的 analyze。
 */
export interface VisionProvider {
  readonly name: string;
  analyze(images: LoadedImage[], prompt: string): Promise<string>;
}

export function getProvider(name: ProviderName): VisionProvider {
  switch (name) {
    case "anthropic":
      return new AnthropicProvider();
    case "zhipu":
      return new ZhipuProvider();
    case "ollama":
      return new OllamaProvider();
    default:
      throw new Error(`未实现的 provider: ${name}`);
  }
}
