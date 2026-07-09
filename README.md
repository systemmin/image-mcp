# image-mcp · 视觉识别 MCP 服务器

一个基于 [Model Context Protocol](https://modelcontextprotocol.io/) 的图片识别服务器，统一封装三大视觉 API 后端，让 Claude Desktop / Cursor / 任何 MCP 客户端都能调用图片描述、问答与多图分析能力。

## ✨ 支持的视觉后端

| Provider | 服务 | 适用场景 |
|----------|------|----------|
| `anthropic` | Claude (Anthropic) API | 用户提到的 "code plan API"，效果最强 |
| `zhipu` | 智谱 API (GLM-4V 等) | 国产视觉模型，国内访问稳定 |
| `ollama` | Ollama (本地 llava / llama3.2-vision) | 本地离线运行，零成本、隐私好 |

所有后端通过统一的 `provider` 参数在运行时动态切换，无需重启。

## 🧰 暴露的 MCP Tools

| Tool | 参数 | 说明 |
|------|------|------|
| `vision_describe` | `path`, `provider?` | 生成单张图片的详细文字描述/识别结果 |
| `vision_qa` | `path`, `question`, `provider?` | 针对图片提问，模型按图片内容回答 (VQA) |
| `vision_analyze` | `paths[]`, `prompt`, `provider?` | 对多张图片综合分析/对比 |

- `provider` 可选；不传时按 `DEFAULT_PROVIDER` → `anthropic` → `zhipu` → `ollama` 优先级自动选择第一个已配置的后端。
- 返回结果开头会标注实际使用的 provider，例如 `[provider: zhipu]`。

## 📦 安装

```bash
# 需要 Node.js >= 20
npm install
npm run build
```

## ⚙️ 配置

复制 `.env.example` 为 `.env` 并填入密钥：

```bash
cp .env.example .env
```

```ini
# Claude (Anthropic)
ANTHROPIC_API_KEY=sk-ant-xxx
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929

# 智谱
ZHIPU_API_KEY=xxx.xxx
ZHIPU_MODEL=glm-4v

# Ollama (本地)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llava

# 默认后端
DEFAULT_PROVIDER=anthropic
```

> 只需配置你想用的后端的密钥即可，其余可留空。Ollama 无需密钥，但要先 `ollama pull llava` 拉取视觉模型并保持服务运行。

## 🔌 接入 MCP 客户端

### Claude Desktop

编辑配置文件（macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`，Windows: `%APPDATA%\Claude\claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "image-mcp": {
      "command": "node",
      "args": ["D:\\ai\\image-mcp\\dist\\index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-xxx",
        "ZHIPU_API_KEY": "xxx.xxx",
        "DEFAULT_PROVIDER": "anthropic"
      }
    }
  }
}
```

> 也可不写 `env`，改为在项目目录放 `.env` 文件（dotenv 会自动加载）。

### Cursor / 其他 MCP 客户端

按对应客户端文档添加一个 stdio 类型的 MCP server，命令为 `node D:\ai\image-mcp\dist\index.js`。

## 🧪 调试

用官方 Inspector 交互测试：

```bash
npm run inspector
```

会打开网页界面，可手动调用三个工具、查看请求/响应。

## 🏗️ 项目结构

```
src/
├── index.ts              # MCP 服务器入口，注册 3 个工具
├── providers/
│   ├── index.ts          # VisionProvider 接口 + getProvider 工厂
│   ├── anthropic.ts      # Claude API 适配器
│   ├── zhipu.ts          # 智谱 API 适配器
│   └── ollama.ts         # Ollama API 适配器
└── utils/
    ├── image.ts          # 图片读取 + base64 编码 + MIME 推断
    └── config.ts         # 环境变量加载 + provider 解析
```

### 架构说明

三个工具本质都调用 `VisionProvider.analyze(images, prompt)`，区别只在 prompt：
- `vision_describe` → 固定描述 prompt
- `vision_qa` → 用户问题作为 prompt
- `vision_analyze` → 多图 + 自定义 prompt

新增一个视觉后端只需实现 `VisionProvider` 接口并在 `getProvider` 注册即可。

## 📜 脚本

| 命令 | 作用 |
|------|------|
| `npm run build` | TypeScript 编译到 `dist/` |
| `npm start` | 运行编译后的服务器 |
| `npm run inspector` | 启动 MCP Inspector 调试 |
