import { getConfig } from "../utils/config.js";
import type { LoadedImage } from "../utils/image.js";
import type { VisionProvider } from "./index.js";

interface ZhipuContentBlock {
  type: string;
  image_url?: { url: string };
  text?: string;
}

interface ZhipuResponse {
  choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>;
  error?: { message: string };
}

/**
 * 智谱 API (GLM-4V 等) 适配器。
 * 接口兼容 OpenAI chat/completions 格式。
 * 文档: https://open.bigmodel.cn/dev/api/visual-model
 * 图片以 data URL 形式放入 image_url。
 */
export class ZhipuProvider implements VisionProvider {
  readonly name = "zhipu";

  async analyze(images: LoadedImage[], prompt: string): Promise<string> {
    const { zhipu } = getConfig();
    if (!zhipu.apiKey) {
      throw new Error("智谱 API key 未配置，请在 .env 中设置 ZHIPU_API_KEY");
    }

    const content: ZhipuContentBlock[] = [
      ...images.map((img) => ({
        type: "image_url",
        image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
      })),
      { type: "text", text: prompt },
    ];

    const body = {
      model: zhipu.model,
      messages: [{ role: "user", content }],
    };

    const resp = await fetch(`${zhipu.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${zhipu.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`智谱 API 请求失败 (${resp.status}): ${errText}`);
    }

    const data = (await resp.json()) as ZhipuResponse;
    if (data.error) {
      throw new Error(`智谱 API 错误: ${data.error.message}`);
    }

    const raw = data.choices?.[0]?.message?.content;
    let text: string;
    if (typeof raw === "string") {
      text = raw;
    } else if (Array.isArray(raw)) {
      text = raw.map((c) => c.text ?? "").join("");
    } else {
      text = "";
    }
    if (!text) {
      throw new Error(`智谱 API 返回了空内容: ${JSON.stringify(data)}`);
    }
    return text;
  }
}
