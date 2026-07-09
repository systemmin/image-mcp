#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadImages, type LoadedImage } from "./utils/image.js";
import { resolveProvider } from "./utils/config.js";
import { getProvider } from "./providers/index.js";

const server = new McpServer({
  name: "context-mcp",
  version: "1.0.0",
});

const DESC_PROMPT =
  "请详细描述这张图片的内容，包括场景、主体物体/人物、可见文字、颜色与氛围等关键信息。用中文回答。";

const providerSchema = z
  .string()
  .optional()
  .describe("视觉 API 后端: anthropic | zhipu | ollama。不传则使用默认 provider");

/** 统一的视觉调用入口：解析 provider -> 加载模型 -> 调用，并标注实际使用的 provider。 */
async function runVision(
  providerName: string | undefined,
  images: LoadedImage[],
  prompt: string,
): Promise<string> {
  const resolved = resolveProvider(providerName);
  const provider = getProvider(resolved);
  const result = await provider.analyze(images, prompt);
  return `[provider: ${resolved}]\n\n${result}`;
}

function errorResult(err: unknown) {
  return {
    content: [{ type: "text" as const, text: `错误: ${(err as Error).message}` }],
    isError: true as const,
  };
}

// ---- Tool 1: 图片描述/识别 ----
server.tool(
  "vision_describe",
  "对一张本地图片生成详细的文字描述/识别结果",
  {
    path: z.string().describe("本地图片文件的绝对或相对路径"),
    provider: providerSchema,
  },
  async ({ path: imgPath, provider }) => {
    try {
      const images = await loadImages([imgPath]);
      const text = await runVision(provider, images, DESC_PROMPT);
      return { content: [{ type: "text" as const, text }] };
    } catch (err) {
      return errorResult(err);
    }
  },
);

// ---- Tool 2: 图片问答 (VQA) ----
server.tool(
  "vision_qa",
  "针对一张本地图片提问，模型根据图片内容回答",
  {
    path: z.string().describe("本地图片文件的路径"),
    question: z.string().describe("针对图片提出的问题"),
    provider: providerSchema,
  },
  async ({ path: imgPath, question, provider }) => {
    try {
      const images = await loadImages([imgPath]);
      const text = await runVision(provider, images, question);
      return { content: [{ type: "text" as const, text }] };
    } catch (err) {
      return errorResult(err);
    }
  },
);

// ---- Tool 3: 多图综合分析 ----
server.tool(
  "vision_analyze",
  "对多张本地图片进行综合分析/对比，根据自定义 prompt 给出结论",
  {
    paths: z.array(z.string()).min(1).describe("本地图片文件路径数组（至少一张）"),
    prompt: z.string().describe("对这组图片的分析要求或问题"),
    provider: providerSchema,
  },
  async ({ paths, prompt, provider }) => {
    try {
      const images = await loadImages(paths);
      const text = await runVision(provider, images, prompt);
      return { content: [{ type: "text" as const, text }] };
    } catch (err) {
      return errorResult(err);
    }
  },
);

// ---- 启动 stdio 服务器 ----
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[context-mcp] 视觉识别 MCP 服务器已启动 (stdio)");
}

main().catch((err) => {
  console.error("[context-mcp] 启动失败:", err);
  process.exit(1);
});
