# Chrome 英文网页翻译插件 — 项目开发规则

> 本文档为 AI 助手在项目开发中提供高层面的指导原则，不涉及具体实现细节。
>
> 所有规则均基于 [技术架构设计文档](../docs/design.md) 制定。

---

## 一、项目概述

本项目是一个 Chrome 浏览器扩展插件，用于将英文网页文章提取为 Markdown 格式并调用 AI 大模型进行中文翻译。核心技术栈：Chrome Extension Manifest V3 + React 18 + TypeScript + Vite。

---

## 二、AI 助手任务执行规范

为确保开发过程的有序性和可控性，AI 助手必须严格遵循以下任务执行规范：

### 2.1 任务范围控制

- **严格按照任务拆分执行**：必须严格按照 `docs/tasks.md` 中定义的任务范围执行，不得超出指定任务的边界。
- **单一任务原则**：每次只执行一个明确指定的任务（如"任务 1"、"任务 2"等），完成后等待用户确认再进行下一步。
- **禁止自动扩展**：不得基于技术架构文档或其他文档自行扩展任务范围，如果需要扩展需要通知用户确认。

### 2.2 任务指令格式

用户将使用以下格式明确指定任务：

- **明确任务编号**："请执行任务 X：[任务名称]"
- **范围限制**："只完成任务 X 中列出的具体任务，不要超出范围"
- **停止指令**："完成后等待我确认再进行下一步"

### 2.3 执行验收标准

- **任务完成确认**：每个任务完成后，必须对照 `docs/tasks.md` 中的"完成效果"和"验证清单"进行自检。
- **范围边界检查**：确保所有创建的文件和代码都在指定任务范围内。
- **等待用户确认**：任务完成后总结完成情况，等待用户确认后再进行下一个任务。

### 2.4 异常处理

- **任务描述不清晰**：如果任务描述不清晰，应先询问具体范围而不是自行决定。
- **依赖关系处理**：如果当前任务依赖其他未完成的任务，应明确指出依赖关系并等待用户指示。
- **超出范围的代码**：如果发现已创建超出任务范围的代码，应主动询问是否需要清理。

---

## 三、技术栈约束

### 3.1 必须使用的技术

| 层面 | 技术 | 不可替换 |
|------|------|----------|
| 平台 | Chrome Extension Manifest V3 | ✓ |
| 语言 | TypeScript（strict 模式） | ✓ |
| UI 框架 | React 18 | ✓ |
| 构建工具 | Vite + @crxjs/vite-plugin | ✓ |
| 包管理 | pnpm | ✓ |
| 内容提取 | @mozilla/readability | ✓ |
| Markdown 转换 | turndown + turndown-plugin-gfm | ✓ |
| Markdown 渲染 | md-wx | ✓ |
| AI 调用 | openai（npm 包） | ✓ |
| 本地存储 | Chrome Storage API (local) | ✓ |

### 3.2 禁止引入的技术

- 禁止引入 Node.js 服务端运行时依赖（如 `fs`、`path`、`net` 等），插件完全在浏览器端运行。
- 禁止引入其他 UI 框架（如 Vue、Angular、Svelte）或 CSS 框架（如 Tailwind、Bootstrap），保持技术栈统一。
- 禁止引入状态管理库（如 Redux、MobX），使用 React 内置状态管理（useState、useContext）即可。
- 禁止引入路由库（如 react-router），Popup 和 Options 各自是独立的 mini React App，无需路由。

---

## 四、目录结构规范

### 4.1 目录结构

```
src/
├── manifest.json          # 插件清单
├── background/            # Service Worker（独立入口）
├── content/               # Content Script（独立入口）
├── popup/                 # Popup 翻译面板（独立 React App）
│   ├── index.html
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/        # 仅 Popup 使用的组件
│   ├── hooks/             # 仅 Popup 使用的 Hooks
│   └── styles/            # 仅 Popup 使用的样式
├── options/               # Options 设置页面（独立 React App）
│   ├── index.html
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/        # 仅 Options 使用的组件
│   └── styles/            # 仅 Options 使用的样式
├── services/              # 共享服务层（纯逻辑，无 UI）
└── shared/                # 共享类型、常量、工具函数
```

### 4.2 目录使用原则

- **Popup 和 Options 相互独立**：各自拥有完整的 `index.html`、`main.tsx`、组件树和样式，互不引用对方的组件。
- **服务层禁止 UI 依赖**：`src/services/` 下的所有模块必须是纯逻辑，不引用 React 或任何 UI 库。
- **共享模块最小化**：`src/shared/` 仅放类型定义、常量和纯函数工具，不放业务逻辑。
- **Vite 多入口**：通过 `vite.config.ts` 配置 4 个入口（popup、options、background、content），一次构建输出。

---

## 五、编码规范

### 5.1 通用规范

| 规范项 | 要求 |
|--------|------|
| 缩进 | 2 空格 |
| 引号 | 单引号 `'` |
| 分号 | 必须 |
| 换行符 | LF (`\n`) |
| 文件编码 | UTF-8 |
| 代码格式化 | Prettier |
| 代码检查 | ESLint + @typescript-eslint |

### 5.2 命名规范

| 元素 | 规范 | 正确示例 | 错误示例 |
|------|------|----------|----------|
| 文件/目录 | kebab-case | `translate-button.tsx` | `TranslateButton.tsx` |
| 组件 | PascalCase | `TranslateButton` | `translateButton` |
| 函数/变量 | camelCase | `extractContent` | `extract_content` |
| 常量 | UPPER_SNAKE_CASE | `MAX_TOKENS` | `maxTokens` |
| 接口 | PascalCase + `I` 前缀 | `IApiConfig` | `ApiConfigType` |
| 事件处理函数 | `handle` 前缀 | `handleTranslate` | `onTranslate` |
| Hook 函数 | `use` 前缀 | `useTranslate` | `translateHook` |

### 5.3 文件组织

- 每个组件一个文件，组件名与文件名一致。
- 导出的函数/组件必须有显式的返回类型注解。
- 公共类型定义统一放在 `src/shared/types.ts`，禁止在各模块重复定义。
- 不修改已有注释（除非明确要求）。

### 5.4 注释

- 使用 JSDoc 格式注释所有导出函数、类、接口。
- 复杂业务逻辑必须添加行内注释说明意图。
- 注释语言：中文。

---

## 六、Git 规范

- Commit message 格式：`<类型>: <简述>`，类型：`feat` / `fix` / `docs` / `refactor` / `style` / `chore`
- 分支命名：`feature/<功能名>` / `fix/<问题描述>`
- 提交前必须通过 ESLint + Prettier 检查

---

## 七、Chrome Extension 约束

### 7.1 权限声明

仅申请以下 5 项权限，禁止申请多余权限：

- `activeTab` — 获取当前标签页 DOM 访问权
- `scripting` — 动态注入 Content Script
- `storage` — 本地持久化存储
- `contextMenus` — 右键菜单（二期）
- `commands` — 键盘快捷键（二期）

### 7.2 消息通信

- 模块间通信统一使用 `chrome.runtime.sendMessage`。
- 消息格式必须遵循 `docs/design.md` 第 6.2 节定义的消息类型。
- Popup 和 Content Script 不直接通信，必须通过 Service Worker 中转。

### 7.3 存储

- 使用 `chrome.storage.local`（非 `sync`）。
- 用户设置 key：`settings`。
- 翻译结果 key：`lastTranslation`（仅保留最近一次，覆盖写入）。

---

## 八、API 调用约束

- 使用 `openai` npm 包，通过自定义 `baseURL` 指向用户配置的 API 端点。
- 默认使用通义千问 (Qwen) 模型，通过 DashScope 端点接入。
- 必须设置 `dangerouslyAllowBrowser: true`（浏览器端运行所必需）。
- 翻译使用流式模式（`stream: true`），不支持非流式模式。
- API Key 由用户自行配置，代码中不允许硬编码任何 API Key。

---

## 九、文档引用关系

| 文档 | 用途 | 何时查阅 |
|------|------|----------|
| `docs/proposal.md` | 需求文档 | 了解功能边界和"不做什么" |
| `docs/design.md` | 技术架构设计 | 了解技术选型、架构、模块划分 |
| `docs/tasks.md` | 任务拆分 | 执行任务时确认范围 |
| `docs/layouts/示意图-Popup翻译面板.md` | Popup 页面布局 | 实现 Popup 相关任务时参考 |
| `docs/layouts/示意图-Options设置页面.md` | Options 页面布局 | 实现 Options 相关任务时参考 |
| `docs/md-wx-apiusage.md` | md-wx 组件用法 | 实现 Markdown 渲染时参考 |