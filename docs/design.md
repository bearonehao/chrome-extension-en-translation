# Chrome 英文网页翻译插件 — 技术架构设计文档

## 1. 文档概述

本文档是 [需求文档](./proposal.md) 的技术架构设计，描述系统的整体架构、技术选型理由、目录结构、模块划分及编码规范。不包含具体代码实现。

---

## 2. 技术选型

### 2.1 技术选型总览

| 层面 | 技术选择 | 选型理由 |
|------|----------|----------|
| 运行时框架 | Chrome Extension Manifest V3 | Chrome 插件现行标准，Manifest V2 已弃用 |
| 构建工具 | Vite | 构建速度快，对 React + TypeScript 支持完善，社区插件丰富（如 `@crxjs/vite-plugin` 专为 Chrome 插件设计） |
| UI 框架 | React 19 + TypeScript | 组件化开发，生态成熟，TypeScript 提供类型安全 |
| Markdown 渲染 | md-wx | 专为阅读优化的 Markdown 渲染组件，支持多主题、响应式，可直接在 React 中引入 |
| 内容提取 | @mozilla/readability + turndown + turndown-plugin-gfm | 见 2.2 节详细分析 |
| AI 翻译 | openai (npm) + 通义千问 (Qwen) | 见 2.3 节详细分析 |
| 本地存储 | Chrome Storage API (local) | 浏览器原生持久化方案，无需额外依赖 |
| 包管理 | pnpm | 磁盘空间效率高，安装速度快，符合用户技术栈偏好 |

### 2.2 内容提取方案选型分析

内容提取是本项目的核心技术难点。需要从任意英文网页中准确提取正文内容，过滤导航栏、侧边栏、广告等噪声，并保留标题、列表、代码块、图片等结构。

#### 候选方案对比

| 方案 | 原理 | 优势 | 劣势 | 适用场景 |
|------|------|------|------|----------|
| **方案 A：@mozilla/readability** | 基于 DOM 启发式算法，对候选节点进行文本密度、链接比例、类名等加权评分，选出最优子树 | ① Firefox Reader View 同款引擎，百万级网页验证；② 纯浏览器端运行，零依赖；③ 提供 `isProbablyReaderable()` 快速预判；④ 输出包含标题、作者、摘要、发布时间等元数据 | 对于非标准布局（如 Dashboard、时间线）可能失效 | 博客、新闻、技术文档等"文章型"页面 |
| 方案 B：自定义 DOM 解析 | 手工编写选择器规则（如优先 `<article>`、`<main>` 标签） | 完全可控，包体积小 | ① 无法覆盖千变万化的网页结构；② 维护成本极高；③ 准确率远低于 Readability | 仅适用于结构固定的特定网站 |
| 方案 C：AI 辅助提取 | 将原始 HTML 发送给 LLM，由模型直接输出 Markdown | 对非标准页面也能处理 | ① Token 消耗巨大；② 延迟高；③ 成本高 | 对 Readability 失效的极端兜底场景 |

#### 最终选型：方案 A（@mozilla/readability）

**理由**：

1. **行业标准**：Firefox Reader View、Safari Reader、Edge Immersive Reader 均基于 Readability 或其衍生版本。PagePiper、Clean Print、Chat with Page 等同类 Chrome 插件也全部采用此方案。
2. **准确性**：经过十多年迭代，评分算法在各类文章型网页上表现出色，误判率低。
3. **元数据丰富**：`parse()` 直接返回 `title`、`byline`、`excerpt`、`siteName`、`publishedTime`、`lang` 等字段，完美匹配需求文档中输出格式所需的标题、作者信息。
4. **轻量**：纯 JavaScript 实现，无网络请求，在 Content Script 中可直接运行。

#### 内容提取完整管道

```
原始网页 DOM
    │
    ▼
document.cloneNode(true)          ← 克隆 DOM，避免污染原始页面
    │
    ▼
Readability(documentClone).parse() ← 提取正文，获得 { title, content, byline, ... }
    │
    ▼
TurndownService.turndown(content)  ← HTML → Markdown 转换
    │  + turndown-plugin-gfm        ← 支持 GFM 扩展（表格、删除线、任务列表）
    ▼
标准 Markdown 文本
```

**关联依赖说明**：

| 依赖 | 作用 | 版本 |
|------|------|------|
| `@mozilla/readability` | 从网页 DOM 中提取正文内容（HTML 格式） | latest |
| `turndown` | 将 Readability 输出的 HTML 转换为标准 Markdown | latest |
| `turndown-plugin-gfm` | Turndown 的 GFM 插件，支持表格、删除线、任务列表等扩展语法 | latest |

### 2.3 AI 翻译方案选型分析

#### 方案：OpenAI SDK 兼容模式

采用 `openai` npm 包作为 AI 调用客户端，通过配置自定义 `baseURL` 指向不同的模型服务商，实现模型无关的调用层。

**选型理由**：

1. **模型切换零成本**：OpenAI SDK 已成为 AI API 调用的事实标准。通义千问 (Qwen)、DeepSeek、Moonshot、Ollama 等主流平台均提供 OpenAI 兼容接口。只需修改 `baseURL` 和 `apiKey` 即可切换模型，无需修改业务代码。
2. **流式输出原生支持**：`openai` SDK 的 `stream: true` 参数直接返回 SSE 流，天然适配需求中的"打字机效果"。
3. **浏览器端可用**：`openai` npm 包在 v4 版本后支持浏览器环境运行，无需 Node.js 服务端中转。
4. **生态成熟**：文档完善，社区活跃，TypeScript 类型定义完整。

#### 本项目使用的模型：通义千问 (Qwen)

- **API 入口**：DashScope（阿里云灵积）提供的 OpenAI 兼容端点
- **配置方式**：设置 `baseURL` 为 DashScope 兼容地址，`apiKey` 为用户在阿里云获取的 API Key
- **推荐模型**：`qwen-plus`（性价比高，适合翻译场景）或 `qwen-max`（质量最优）
- **切换方式**：用户在设置页面修改 `baseURL`、`apiKey`、`model` 三个字段即可切换到任意兼容模型

#### 翻译流程

```
Markdown 原文
    │
    ▼
构造 System Prompt（翻译指令）
    │
    ▼
调用 OpenAI SDK (stream: true)
    │  baseURL → DashScope
    │  model   → qwen-plus
    ▼
SSE 流式响应
    │
    ▼
逐 chunk 推送到 UI 层
    │
    ▼
打字机效果渲染（md-wx）
```

---

## 3. 系统架构

### 3.1 架构图

```
┌─────────────────────────────────────────────────────────┐
│                    Chrome 浏览器                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │                  用户浏览的网页                      │   │
│  │  ┌────────────────────────────────────────────┐  │   │
│  │  │         Content Script (内容提取)             │  │   │
│  │  │  • Readability 提取正文                       │  │   │
│  │  │  • Turndown 转换 Markdown                    │  │   │
│  │  │  • 提取元数据（标题、作者、URL）               │  │   │
│  │  └────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
│                         │                                │
│                  chrome.runtime.sendMessage               │
│                         │                                │
│  ┌───────────────────────▼──────────────────────────┐   │
│  │              Service Worker (后台)                  │   │
│  │  • 消息路由（Content Script ↔ Popup）              │   │
│  │  • 右键菜单管理                                     │   │
│  │  • 快捷键监听                                       │   │
│  └──────────────────────────────────────────────────┘   │
│                         │                                │
│                  chrome.runtime.sendMessage               │
│                         │                                │
│  ┌───────────────────────▼──────────────────────────┐   │
│  │              Popup (翻译面板)                       │   │
│  │  ┌────────────────────────────────────────────┐  │   │
│  │  │  React App                                   │  │   │
│  │  │  • 翻译状态管理                               │  │   │
│  │  │  • AI 翻译调用（OpenAI SDK → Qwen）          │  │   │
│  │  │  • md-wx 渲染结果                             │  │   │
│  │  │  • 打字机效果                                 │  │   │
│  │  │  • 本地存储读写                               │  │   │
│  │  └────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Options Page (设置页面)                │   │
│  │  • API 配置（baseURL、apiKey、model）              │   │
│  │  • 翻译参数（语言、风格）                            │   │
│  │  • 显示设置（主题、字体、速度）                       │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Chrome Storage API (local)             │   │
│  │  • 用户设置                                         │   │
│  │  • 最近一次翻译结果                                  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS (SSE 流式)
                              ▼
┌─────────────────────────────────────────────────────────┐
│               DashScope API (通义千问 Qwen)                │
│  • POST /chat/completions (OpenAI 兼容)                  │
│  • 返回 SSE 流式翻译结果                                   │
└─────────────────────────────────────────────────────────┘
```

### 3.2 核心数据流

```
用户点击插件图标
    │
    ▼
Popup 打开，向 Service Worker 发送 "extract" 请求
    │
    ▼
Service Worker 通过 chrome.scripting.executeScript 注入 Content Script
    │
    ▼
Content Script 在当前页面执行：
    1. document.cloneNode(true) 克隆 DOM
    2. new Readability(clone).parse() 提取正文
    3. new TurndownService().turndown(content) 转 Markdown
    4. 提取 meta 信息（title, author, url）
    5. 返回 { markdown, title, author, url }
    │
    ▼
Service Worker 将结果转发给 Popup
    │
    ▼
Popup 中 React 组件：
    1. 显示"正在翻译..."
    2. 调用 openai SDK (stream: true) 发送 Markdown 原文
    3. 逐 chunk 接收 SSE 流式响应
    4. 将每个 chunk 追加到累积文本
    5. md-wx 实时渲染累积的 Markdown（打字机效果）
    6. 翻译完成后，将结果存入 chrome.storage.local
    7. 显示完整翻译结果
```

### 3.3 模块划分

| 模块 | 职责 | 对应位置 |
|------|------|----------|
| **Content Script** | 网页内容提取、Markdown 转换 | src/content/ |
| **Service Worker** | 消息路由、右键菜单、快捷键 | src/background/ |
| **Popup UI** | 翻译面板、打字机展示、用户交互 | src/popup/ |
| **Options UI** | 设置页面 | src/options/ |
| **AI 服务层** | OpenAI SDK 封装、流式调用 | src/services/ |
| **存储服务层** | Chrome Storage API 读写封装 | src/services/ |
| **共享工具** | 类型定义、常量、工具函数 | src/shared/ |

---

## 4. 目录结构规范

```
chrome-extension-en-translation/
├── public/                        # 静态资源
│   └── icons/                     # 插件图标（16/32/48/128）
│       ├── icon16.png
│       ├── icon32.png
│       ├── icon48.png
│       └── icon128.png
│
├── src/                           # 源代码根目录
│   ├── manifest.json              # Chrome 插件清单（Vite 处理后输出到 dist/）
│   │
│   ├── background/                # Service Worker
│   │   └── index.ts               # 后台脚本入口：消息路由、右键菜单、快捷键
│   │
│   ├── content/                   # Content Script
│   │   ├── index.ts               # 入口：注入执行提取逻辑
│   │   ├── extractor.ts           # 核心提取器：Readability + Turndown 管道
│   │   └── metadata.ts            # 元数据提取：标题、作者、OG 标签
│   │
│   ├── popup/                     # Popup 页面（React App）
│   │   ├── index.html             # HTML 入口
│   │   ├── main.tsx               # React 挂载入口
│   │   ├── App.tsx                # 根组件：路由与布局
│   │   ├── components/            # UI 组件
│   │   │   ├── TranslateButton.tsx   # 翻译触发按钮
│   │   │   ├── ResultView.tsx        # 翻译结果展示（集成 md-wx）
│   │   │   ├── StatusBar.tsx         # 底部状态栏（进度、字数）
│   │   │   ├── CopyButton.tsx        # 复制按钮
│   │   │   └── ErrorDisplay.tsx      # 错误提示
│   │   ├── hooks/                 # 自定义 Hooks
│   │   │   ├── useTranslate.ts       # 翻译流程控制
│   │   │   ├── useStorage.ts         # 本地存储读写
│   │   │   └── useTypewriter.ts      # 打字机效果控制
│   │   └── styles/                # 样式文件
│   │       ├── index.css
│   │       └── theme.css             # 深色/浅色主题变量
│   │
│   ├── options/                   # Options 设置页面（React App）
│   │   ├── index.html             # HTML 入口
│   │   ├── main.tsx               # React 挂载入口
│   │   ├── App.tsx                # 根组件
│   │   ├── components/            # 设置页组件
│   │   │   ├── ApiConfig.tsx         # API 配置表单
│   │   │   ├── TranslateConfig.tsx   # 翻译参数配置
│   │   │   └── DisplayConfig.tsx     # 显示设置
│   │   └── styles/
│   │       └── index.css
│   │
│   ├── services/                  # 服务层（纯逻辑，无 UI）
│   │   ├── ai.ts                  # AI 翻译服务：OpenAI SDK 封装，SSE 流处理
│   │   ├── storage.ts             # 存储服务：chrome.storage.local 读写封装
│   │   └── clipboard.ts           # 剪贴板服务：Markdown / 富文本复制
│   │
│   └── shared/                    # 共享模块
│       ├── types.ts               # 全局 TypeScript 类型定义
│       ├── constants.ts           # 常量（默认配置、Prompt 模板、错误码）
│       └── utils.ts               # 工具函数（URL 校验、格式化等）
│
├── docs/                          # 文档
│   ├── proposal.md                # 需求文档
│   └── design.md                  # 本技术架构设计文档
│
├── .gitignore
├── LICENSE
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json                  # TypeScript 配置
├── vite.config.ts                 # Vite 构建配置（多入口：popup/options/background/content）
└── README.md
```

### 目录规范说明

- **扁平化组件结构**：Popup 和 Options 各自独立为 mini React App，拥有独立的 `index.html`、`main.tsx`、组件树和样式，避免相互污染。
- **服务层分离**：`src/services/` 下的模块不依赖任何 UI 框架，可在 Content Script、Service Worker、Popup 中复用。
- **共享模块最小化**：`src/shared/` 仅放类型、常量、纯函数工具，不放业务逻辑。
- **Vite 多入口构建**：通过 `vite.config.ts` 配置多个入口，一次构建输出 `dist/` 下包含 popup、options、background、content 四个 bundle。

---

## 5. 编码规范

### 5.1 通用规范

| 规范项 | 要求 |
|--------|------|
| 语言 | TypeScript 严格模式 (`strict: true`) |
| 缩进 | 2 空格 |
| 引号 | 单引号 `'` |
| 分号 | 必须使用分号 |
| 换行符 | LF (`\n`) |
| 文件编码 | UTF-8 |
| 代码格式化 | Prettier（配置统一） |
| 代码检查 | ESLint + `@typescript-eslint` |

### 5.2 命名规范

| 元素 | 规范 | 示例 |
|------|------|------|
| 文件/目录 | kebab-case | `translate-button.tsx`、`use-translate.ts` |
| 组件 | PascalCase | `TranslateButton`、`ResultView` |
| 函数/变量 | camelCase | `extractContent`、`currentResult` |
| 常量 | UPPER_SNAKE_CASE | `MAX_TOKENS`、`DEFAULT_MODEL` |
| 类型/接口 | PascalCase，接口以 `I` 为前缀 | `TranslateResult`、`IApiConfig` |
| 事件处理函数 | `handle` 前缀 | `handleTranslate`、`handleCopy` |
| Hook 函数 | `use` 前缀 | `useTranslate`、`useStorage` |

### 5.3 文件组织规范

- 每个组件一个文件，组件名与文件名一致。
- 组件相关的类型、样式、测试放在同目录下，不跨目录引用。
- 导出的函数/组件必须有显式的返回类型注解。
- 公共类型定义统一放在 `src/shared/types.ts`，禁止在各模块重复定义。

### 5.4 注释规范

- 使用 JSDoc 格式注释所有公开 API（导出的函数、类、接口）。
- 复杂业务逻辑必须添加行内注释说明意图。
- 注释语言：中文（与用户偏好一致）。
- 不修改已有注释（除非明确要求）。

### 5.5 Git 规范

- Commit message 使用中文，格式：`<类型>: <简述>`，类型包括 `feat` / `fix` / `docs` / `refactor` / `style` / `chore`。
- 分支命名：`feature/<功能名>` / `fix/<问题描述>`。
- 提交前通过 ESLint + Prettier 检查。

---

## 6. Chrome Extension 关键设计

### 6.1 权限声明

| 权限 | 用途 |
|------|------|
| `activeTab` | 获取当前活动标签页的 DOM 访问权，用于注入 Content Script |
| `scripting` | 使用 `chrome.scripting.executeScript` 动态注入提取脚本 |
| `storage` | 使用 `chrome.storage.local` 持久化用户设置和翻译结果 |
| `contextMenus` | 注册右键菜单"翻译此页面" |
| `commands` | 注册键盘快捷键 |

### 6.2 消息通信协议

扩展内部各模块通过 `chrome.runtime.sendMessage` 通信，消息格式统一：

| 消息类型 | 方向 | 说明 |
|----------|------|------|
| `EXTRACT_CONTENT` | Popup → Service Worker → Content Script | 请求提取页面内容 |
| `CONTENT_EXTRACTED` | Content Script → Service Worker → Popup | 返回提取结果 |
| `EXTRACT_ERROR` | Content Script → Service Worker → Popup | 提取失败 |
| `TRANSLATE_REQUEST` | Popup → Service Worker | 发起翻译请求 |
| `TRANSLATE_CHUNK` | Service Worker → Popup | 流式翻译片段 |
| `TRANSLATE_COMPLETE` | Service Worker → Popup | 翻译完成 |
| `TRANSLATE_ERROR` | Service Worker → Popup | 翻译失败 |
| `CANCEL_TRANSLATE` | Popup → Service Worker | 取消翻译 |

### 6.3 存储数据结构

**用户设置**（key: `settings`）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `baseURL` | string | API 端点地址 |
| `apiKey` | string | API Key |
| `model` | string | 模型名称 |
| `systemPrompt` | string | 自定义 System Prompt |
| `targetLanguage` | string | 目标语言 |
| `typewriterSpeed` | enum | 打字机速度 |
| `fontSize` | number | 字体大小 |
| `theme` | enum | 主题模式 |

**翻译结果**（key: `lastTranslation`）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 文章标题 |
| `author` | string | 作者名 |
| `sourceURL` | string | 原文链接 |
| `markdown` | string | 翻译后的 Markdown 正文 |
| `timestamp` | number | 翻译完成时间戳 |

---

## 7. 打字机效果实现方案

### 7.1 方案概述

打字机效果的核心是将 AI 模型的 SSE（Server-Sent Events）流式响应逐 chunk 累积到本地文本缓冲区，然后将累积的完整文本实时传递给 md-wx 组件进行渲染。用户看到的效果是 Markdown 内容逐字/逐句"生长"出来。

### 7.2 实现要点

1. **SSE 流接收**：OpenAI SDK 在 `stream: true` 模式下返回一个异步迭代器，每次 `yield` 一个包含增量文本的 chunk。
2. **文本累积**：维护一个本地 `accumulatedText` 字符串，每次收到 chunk 时追加。
3. **渲染节流**：不是每个 chunk 都触发渲染，而是通过 `requestAnimationFrame` 或固定间隔（如 50ms）进行渲染节流，避免高频 DOM 更新导致卡顿。
4. **Markdown 实时渲染**：将 `accumulatedText` 作为 props 传给 md-wx 的 `MarkdownRenderer` 组件，组件自动将 Markdown 渲染为富文本。
5. **滚动跟随**：渲染区域自动滚动到底部，保持用户始终看到最新内容。

### 7.3 速度控制

- 用户可在设置中选择"快 / 中 / 慢"三档。
- 速度控制通过调整渲染节流间隔实现，不影响实际 API 流接收速度。

---

## 8. 关键依赖清单

| 包名 | 版本 | 用途 |
|------|------|------|
| `react` | ^19 | UI 框架 |
| `react-dom` | ^19 | React DOM 渲染 |
| `@mozilla/readability` | latest | 网页正文提取 |
| `turndown` | latest | HTML → Markdown 转换 |
| `turndown-plugin-gfm` | latest | Turndown GFM 扩展 |
| `openai` | ^4 | AI 模型调用（OpenAI 兼容协议） |
| `md-wx` | latest | Markdown 渲染组件 |
| `typescript` | ^5 | 类型系统 |
| `vite` | ^5 | 构建工具 |
| `@crxjs/vite-plugin` | latest | Vite 的 Chrome 插件构建插件 |
| `eslint` | ^8 | 代码检查 |
| `prettier` | ^3 | 代码格式化 |

---

## 9. 环境依赖

| 环境 | 版本要求 |
|------|----------|
| Node.js | >= 18 |
| pnpm | >= 8 |
| Chrome 浏览器 | >= 116（支持 Manifest V3 最新特性） |
| 操作系统 | Windows / macOS / Linux |

---

## 10. 附录：技术调研参考

### 内容提取方案参考

- **Mozilla Readability.js**：[GitHub](https://github.com/mozilla/readability) — Firefox Reader View 的核心引擎，DOM 启发式评分算法，经过百万级网页验证。
- **PagePiper**：[GitHub](https://github.com/tuggspeedman-ai/pagepiper) — 同类 Chrome 插件，采用 Readability.js + Turndown.js 管道，架构一致，验证了本方案的可行性。
- **Clean Print**：[GitHub](https://github.com/pastroup/clean-print) — Manifest V3 插件，使用 Readability.js + DOMPurify + Turndown，处理了 Shadow DOM、懒加载等边界情况。
- **Chat with Page**：[GitHub](https://github.com/itsyasirkhandev/chatwithpage) — 使用 Readability + DOMPurify + Turndown 管道，在 Chrome 插件中集成了 AI 对话功能。

### AI 调用方案参考

- **Browser Copilot**：[GitHub](https://github.com/venkateshwarreddyr/browser-copilot) — 使用 `openai` npm 包在 Chrome 插件中调用 AI，验证了浏览器端直接使用 OpenAI SDK 的可行性。
- **AI Browser Assistant**：[GitHub](https://github.com/lukechen-ai/ai-browser-assistant) — 支持 OpenAI 兼容接口的 Chrome 插件，支持流式输出和多种模型切换。

### 通义千问 (Qwen) 接入

- 通义千问通过阿里云 DashScope 平台提供 OpenAI 兼容的 Chat Completions API。
- 将 `openai` SDK 的 `baseURL` 配置为 DashScope 端点即可无缝调用。
- 无须额外 SDK，完全兼容现有 `openai` 调用代码。