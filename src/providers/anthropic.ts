import { getConfig } from "../utils/config.js";
import type { LoadedImage } from "../utils/image.js";
import type { VisionProvider } from "./index.js";

interface AnthropicContentBlock {
  type: string;
  source?: { type: string; media_type: string; data: string };
  text?: string;
}

interface AnthropicResponse {
  content?: Array<{ type: string; text?: string }>;
  error?: { message: string };
}

/**
 * Claude (Anthropic) API 适配器。
 * 文档: https://docs.anthropic.com/en/api/messages
 * 图片以 base64 source block 形式发送。
 */
export class AnthropicProvider implements VisionProvider {
  readonly name = "anthropic";

  async analyze(images: LoadedImage[], prompt: string): Promise<string> {
    const { anthropic } = getConfig();
    if (!anthropic.apiKey) {
      throw new Error("Anthropic API key 未配置，请在 .env 中设置 ANTHROPIC_API_KEY");
    }

    const content: AnthropicContentBlock[] = [
      ...images.map((img) => ({
        type: "image",
        source: {
          type: "base64",
          media_type: img.mimeType,
          data: img.base64,
        },
      })),
      { type: "text", text: prompt },
    ];

    const body = {
      model: anthropic.model,
      max_tokens: 2048,
      messages: [{ role: "user", content }],
    };

    const resp = await fetch(`${anthropic.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "x-api-key": anthropic.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Anthropic API 请求失败 (${resp.status}): ${errText}`);
    }

    const data = (await resp.json()) as AnthropicResponse;
    if (data.error) {
      throw new Error(`Anthropic API 错误: ${data.error.message}`);
    }
    const text = data.content?.map((c) => c.text ?? "").join("") ?? "";
    if (!text) {
      throw new Error(`Anthropic API 返回了空内容: ${JSON.stringify(data)}`);
    }
    return text;
  }
}
