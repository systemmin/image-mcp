import { getConfig } from "../utils/config.js";
import type { LoadedImage } from "../utils/image.js";
import type { VisionProvider } from "./index.js";

interface OllamaResponse {
  message?: { content?: string };
  error?: string;
}

/**
 * Ollama API (本地视觉模型如 llava / llama3.2-vision) 适配器。
 * 文档: https://github.com/ollama/ollama/blob/main/docs/api.md
 * 图片以纯 base64 字符串数组形式放入 images 字段（不带 data: 前缀）。
 */
export class OllamaProvider implements VisionProvider {
  readonly name = "ollama";

  async analyze(images: LoadedImage[], prompt: string): Promise<string> {
    const { ollama } = getConfig();

    const body = {
      model: ollama.model,
      messages: [
        {
          role: "user",
          content: prompt,
          images: images.map((img) => img.base64),
        },
      ],
      stream: false,
    };

    let resp: Response;
    try {
      resp = await fetch(`${ollama.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new Error(
        `无法连接到 Ollama 服务 (${ollama.baseUrl})，请确认 Ollama 正在运行。错误: ${(err as Error).message}`,
      );
    }

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Ollama API 请求失败 (${resp.status}): ${errText}`);
    }

    const data = (await resp.json()) as OllamaResponse;
    if (data.error) {
      throw new Error(`Ollama 错误: ${data.error}`);
    }
    const text = data.message?.content ?? "";
    if (!text) {
      throw new Error(`Ollama API 返回了空内容: ${JSON.stringify(data)}`);
    }
    return text;
  }
}
