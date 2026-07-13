# image-mcp · 视觉识别 MCP 服务器

一个基于 [Model Context Protocol](https://modelcontextprotocol.io/) 的图片识别服务器，统一封装三大视觉 API 后端，让 Claude Desktop / Cursor / 任何 MCP 客户端都能调用图片描述、问答与多图分析能力。

> 📦 **npm 包名:`@systemmin/image-mcp`**(bin 命令 `image-mcp`),可直接 `npx @systemmin/image-mcp` 运行,无需克隆仓库。

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

- `provider` 可选；不传时按 `DEFAULT_PROVIDER` -> `anthropic` -> `zhipu` -> `ollama` 优先级自动选择第一个已配置的后端。
- 返回结果开头会标注实际使用的 provider，例如 `[provider: zhipu]`。

## 📦 安装

### 方式一:直接用 npx(推荐,无需克隆)

```bash
npx @systemmin/image-mcp
```

或全局安装:

```bash
npm install -g @systemmin/image-mcp
image-mcp
```

### 方式二:从源码构建

```bash
# 需要 Node.js >= 20
git clone https://github.com/systemmin/image-mcp.git
cd image-mcp
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

## ⏱️ 工具调用超时(重要)

`MCP_TOOL_TIMEOUT` 是 **MCP 客户端(Claude Code / Claude Desktop)侧**的环境变量,不是本 server 的配置。视觉 API 处理大图较慢,若不调大超时,客户端往往在工具返回前就超时报错(实测大图极易触发)。

在**启动客户端之前**设置(单位:毫秒,下例为 5 分钟):

```bash
# Windows CMD
set MCP_TOOL_TIMEOUT=300000

# PowerShell
$env:MCP_TOOL_TIMEOUT="300000"

# macOS / Linux
export MCP_TOOL_TIMEOUT=300000
```

设好后再启动 `claude` 或 Claude Desktop;也可加入系统环境变量永久生效。

## 🔌 接入 MCP 客户端

### Claude Code(命令行,推荐)

用官方命令一键添加,无需手改 JSON:

```bash
# 仅当前项目可用(local scope,默认)
claude mcp add image-mcp -- npx @systemmin/image-mcp

# 或全局所有项目可用(user scope)
claude mcp add image-mcp --scope user -- npx @systemmin/image-mcp
```

需要传入 API 密钥时用 `-e`(可多次):

```bash
claude mcp add image-mcp --scope user -e ANTHROPIC_API_KEY=sk-ant-xxx -e DEFAULT_PROVIDER=anthropic -- npx @systemmin/image-mcp
```

> 也可不传 `-e`,改为在你运行 `claude` 的目录放一个 `.env` 文件(dotenv 会自动加载)。
> 验证是否注册成功:`claude mcp list`。

或手动编辑配置文件 `~/.claude.json`(Windows: `C:\Users\<用户名>\.claude.json`,注意文件名**带前导点**),在顶层 `mcpServers` 中加入:

```json
{
  "mcpServers": {
    "image-mcp": {
      "command": "npx",
      "args": ["@systemmin/image-mcp"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-xxx",
        "DEFAULT_PROVIDER": "anthropic"
      }
    }
  }
}
```

### Claude Desktop

编辑配置文件（macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`，Windows: `%APPDATA%\Claude\claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "image-mcp": {
      "command": "npx",
      "args": ["@systemmin/image-mcp"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-xxx",
        "ZHIPU_API_KEY": "xxx.xxx",
        "DEFAULT_PROVIDER": "anthropic"
      }
    }
  }
}
```

> 也可不写 `env`，改为在项目目录放 `.env` 文件（dotenv 会自动加载）。若从源码运行，把 `command/args` 换成 `"command": "node", "args": ["/path/to/image-mcp/dist/index.js"]`。

### Cursor / 其他 MCP 客户端

按对应客户端文档添加一个 stdio 类型的 MCP server，命令为 `npx @systemmin/image-mcp`（全局安装后也可直接用 `image-mcp`）。

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
- `vision_describe` -> 固定描述 prompt
- `vision_qa` -> 用户问题作为 prompt
- `vision_analyze` -> 多图 + 自定义 prompt

新增一个视觉后端只需实现 `VisionProvider` 接口并在 `getProvider` 注册即可。

## 📜 脚本

| 命令 | 作用 |
|------|------|
| `npm run build` | TypeScript 编译到 `dist/` |
| `npm start` | 运行编译后的服务器 |
| `npm run inspector` | 启动 MCP Inspector 调试 |
