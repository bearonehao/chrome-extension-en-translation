# Chrome 英文网页翻译插件 — 任务拆分

> 基于 [需求文档](./proposal.md)、[技术架构设计](./design.md)、[Popup 页面布局](./layouts/示意图-Popup翻译面板.md)、[Options 页面布局](./layouts/示意图-Options设置页面.md) 拆分。
>
> **设计原则**：每个任务独立可完成、依赖最小化、完成后有可见效果、适合 AI 分步实现。

---

## 任务依赖总览

```
任务1 脚手架
  ├─→ 任务2 类型与常量
  │     ├─→ 任务3 存储服务 ──→ 任务4 内容提取 ──→ 任务5 AI翻译服务
  │     │                                              │
  │     └─→ 任务6 Popup 空壳 ──→ 任务7 Service Worker ─┤
  │                                                      │
  └──────────────────────────────────────────────────────┘
                                                         │
                                                    任务8 翻译流程串联
                                                         │
                                                    任务9 完成与错误状态
                                                         │
                                                    任务10 设置页面
```

---

## 任务 1：项目脚手架搭建 —— 空插件可加载

**优先级**：P0（最高）  
**依赖**：无  
**完成效果**：Chrome 浏览器中可加载插件，点击图标弹出空白面板

**参考文档**：
- [design.md](./design.md) — 第 4 章"目录结构规范"、第 8 章"关键依赖清单"、第 9 章"环境依赖"
- [design.md](./design.md) — 第 5 章"编码规范"

**子任务**：
- [ ] 1.1 初始化 pnpm 项目（`package.json`），安装所有依赖
- [ ] 1.2 配置 `tsconfig.json`（strict 模式）
- [ ] 1.3 配置 `vite.config.ts`（多入口：popup / options / background / content）
- [ ] 1.4 配置 ESLint + Prettier
- [ ] 1.5 创建 `src/manifest.json`（声明 `activeTab`、`scripting`、`storage` 权限）
- [ ] 1.6 创建 `public/icons/` 目录，放置占位图标
- [ ] 1.7 创建 `src/background/index.ts`（最小 Service Worker：空函数）
- [ ] 1.8 创建 `src/popup/index.html` + `src/popup/main.tsx`（最小 React 渲染："Hello"）
- [ ] 1.9 验证：`pnpm build` 后 `dist/` 可加载到 Chrome，点击图标弹出面板

**产出物**：Chrome 可加载的空插件，点击图标弹出面板显示文字

---

## 任务 2：共享类型与常量定义

**优先级**：P0（最高）  
**依赖**：任务 1（需要项目框架）  
**完成效果**：TypeScript 编译无错误，类型可在其他模块中引用

**参考文档**：
- [design.md](./design.md) — 第 4 章"目录结构规范"（`src/shared/` 部分）
- [design.md](./design.md) — 第 6.3 节"存储数据结构"
- [proposal.md](./proposal.md) — 第 3 章"输出格式规范"

**子任务**：
- [ ] 2.1 创建 `src/shared/types.ts`
  - 定义 `ITranslateResult`（title、author、sourceURL、markdown、timestamp）
  - 定义 `ISettings`（baseURL、apiKey、model、systemPrompt、targetLanguage、typewriterSpeed、fontSize、theme）
  - 定义 `TranslateStatus` 枚举（idle / extracting / translating / done / error）
  - 定义 `MessageType` 枚举（消息通信协议）
- [ ] 2.2 创建 `src/shared/constants.ts`
  - 默认 API 配置（baseURL、model）
  - 默认翻译 System Prompt
  - 错误码与提示文案映射
  - 面板尺寸常量
- [ ] 2.3 创建 `src/shared/utils.ts`（空文件，后续按需添加）

**产出物**：TypeScript 类型和常量定义就绪，其他模块可 import 使用

---

## 任务 3：本地存储服务

**优先级**：P0（最高）  
**依赖**：任务 2（需要类型定义）  
**完成效果**：可在 Chrome DevTools Console 中读写设置和翻译结果

**参考文档**：
- [design.md](./design.md) — 第 6.3 节"存储数据结构"
- [proposal.md](./proposal.md) — 第 2.1.6 节"本地持久化存储"

**子任务**：
- [ ] 3.1 创建 `src/services/storage.ts`
- [ ] 3.2 实现 `getSettings(): Promise<ISettings>`（读取时提供默认值）
- [ ] 3.3 实现 `saveSettings(settings: ISettings): Promise<void>`
- [ ] 3.4 实现 `getLastTranslation(): Promise<ITranslateResult | null>`
- [ ] 3.5 实现 `saveLastTranslation(result: ITranslateResult): Promise<void>`（覆盖写入）
- [ ] 3.6 验证：在 Service Worker 中调用 `saveSettings` 后，通过 DevTools → Application → Storage 查看数据已写入

**产出物**：存储服务可读写，数据可持久化

---

## 任务 4：内容提取模块

**优先级**：P0（最高）  
**依赖**：任务 2（需要类型定义）  
**完成效果**：在任意英文文章页面 Console 中运行提取脚本，输出 Markdown 文本

**参考文档**：
- [design.md](./design.md) — 第 2.2 节"内容提取方案选型分析"（含完整管道）
- [design.md](./design.md) — 第 3.2 节"核心数据流"第 1-5 步
- [proposal.md](./proposal.md) — 第 2.1.1 节"文章内容提取"、第 2.1.2 节"Markdown 转换"、第 2.1.3 节"图片处理"

**子任务**：
- [ ] 4.1 创建 `src/content/extractor.ts`
  - 实现 `extractContent(): ITranslateResult` 函数
  - 管道：`document.cloneNode(true)` → `new Readability(clone).parse()` → `new TurndownService({...}).turndown(content)`
  - 集成 `turndown-plugin-gfm`（表格、删除线、任务列表）
  - Turndown 配置：`headingStyle: 'atx'`、`codeBlockStyle: 'fenced'`、图片处理规则
- [ ] 4.2 创建 `src/content/metadata.ts`
  - 实现 `extractTitle()`：优先级 `og:title` → `<title>` → `Readability.title`
  - 实现 `extractAuthor()`：优先级 `article:author` → `author` meta → `Readability.byline` → "未知作者"
  - 实现 `extractURL()`：`window.location.href`
- [ ] 4.3 创建 `src/content/index.ts`（Content Script 入口）
  - 监听 `chrome.runtime.onMessage`，响应 `EXTRACT_CONTENT` 消息
  - 调用 `extractContent()`，返回 `{ markdown, title, author, url }`
  - 错误时返回 `EXTRACT_ERROR`
- [ ] 4.4 验证：打开 Medium / Dev.to 文章页，在 Console 中手动调用 `extractContent()`，检查输出 Markdown 是否正确

**产出物**：Content Script 可独立提取任意网页文章为 Markdown

---

## 任务 5：AI 翻译服务

**优先级**：P0（最高）  
**依赖**：任务 2（需要类型定义）  
**完成效果**：在 Popup 或 Service Worker 中调用服务，控制台输出流式翻译结果

**参考文档**：
- [design.md](./design.md) — 第 2.3 节"AI 翻译方案选型分析"（含翻译流程）
- [design.md](./design.md) — 第 7 章"打字机效果实现方案"

**子任务**：
- [ ] 5.1 创建 `src/services/ai.ts`
- [ ] 5.2 实现 `translateStream` 函数
  - 参数：`markdown: string`、`settings: ISettings`
  - 读取 settings 中的 baseURL、apiKey、model
  - 构造 System Prompt（翻译指令：保持 Markdown 结构、代码块和 URL 不翻译、图片 alt 可翻译）
  - 调用 OpenAI SDK：`new OpenAI({ baseURL, apiKey, dangerouslyAllowBrowser: true })`
  - `chat.completions.create({ model, messages, stream: true })`
  - 返回 AsyncIterable，逐 chunk yield 文本增量
- [ ] 5.3 实现错误处理：`401` → "API Key 无效"、网络错误 → "网络连接失败"、`429` → "请求过于频繁"
- [ ] 5.4 验证：使用真实的 DashScope API Key，在 Popup 中调用 `translateStream`，查看 Console 流式输出翻译结果

**产出物**：AI 翻译服务可独立调用，返回流式翻译结果

---

## 任务 6：Popup 空壳与初始状态

**优先级**：P0（最高）  
**依赖**：任务 2（需要类型定义）  
**完成效果**：点击插件图标，弹出 420×600px 面板，显示翻译按钮和上次缓存提示

**参考页面**：[示意图-Popup翻译面板.md](./layouts/示意图-Popup翻译面板.md) — 第 1 节"初始状态"

**子任务**：
- [ ] 6.1 重写 `src/popup/index.html`：设置 `<body>` 尺寸 420×600px
- [ ] 6.2 重写 `src/popup/main.tsx`：挂载 React App
- [ ] 6.3 创建 `src/popup/App.tsx`
  - 状态管理：`status` 状态机（idle / extracting / translating / done / error）
  - 管理 `accumulatedText`（空字符串）、`error`（null）
  - 管理 `lastTranslation`（从 storage 读取缓存）
- [ ] 6.4 创建 `src/popup/components/TranslateButton.tsx`
  - 居中大按钮 "🚀 开始翻译"
  - 按钮下方引导文字："点击按钮提取当前页面文章并翻译"
  - 点击后 `status` 切换为 `extracting`
- [ ] 6.5 创建顶部栏区域
  - 左侧："🔤 EN → ZH 翻译" 标题
  - 右侧：⚙ 图标按钮（点击跳转 Options 页面）
- [ ] 6.6 创建底部缓存提示区域（条件渲染）
  - 若 `lastTranslation` 存在，显示 "📋 上次翻译: [标题]"
  - 显示 "⏰ [时间]"
- [ ] 6.7 创建 `src/popup/styles/index.css`（基础样式：面板尺寸、布局、按钮样式）
- [ ] 6.8 验证：点击图标弹出面板，显示翻译按钮和引导文字，⚙ 可跳转设置页（设置页为空）

**产出物**：Popup 初始状态完整呈现，按钮可点击

---

## 任务 7：Service Worker 消息路由

**优先级**：P0（最高）  
**依赖**：任务 4（需要 Content Script 提取能力）、任务 6（需要 Popup 发送消息）  
**完成效果**：点击 Popup 的翻译按钮，Service Worker 桥接消息，Content Script 返回提取结果

**参考文档**：
- [design.md](./design.md) — 第 3.1 节"架构图"（Service Worker 层）、第 6.2 节"消息通信协议"
- [示意图-Popup翻译面板.md](./layouts/示意图-Popup翻译面板.md) — 第 2 节"提取中状态"

**子任务**：
- [ ] 7.1 重写 `src/background/index.ts`
  - 监听 `chrome.runtime.onMessage`
  - 收到 `EXTRACT_CONTENT`：通过 `chrome.scripting.executeScript` 注入 Content Script
  - 将 `CONTENT_EXTRACTED` 结果回传 Popup
  - 将 `EXTRACT_ERROR` 错误回传 Popup
- [ ] 7.2 在 Popup `App.tsx` 中实现 `handleTranslate` 函数
  - 发送 `EXTRACT_CONTENT` 到 Service Worker
  - 接收 `CONTENT_EXTRACTED`，更新 `accumulatedText`（原文 Markdown）
  - `status` 切换为 `translating`
- [ ] 7.3 在 Popup 中实现提取中状态
  - 显示 "⏳ 正在提取文章..." 状态文字
  - 显示进度条（不确定进度条，给用户反馈）
- [ ] 7.4 验证：点击翻译按钮，Popup 显示提取中，Console 输出提取到的 Markdown 原文

**产出物**：Popup → Service Worker → Content Script 消息链路打通，可提取文章内容

---

## 任务 8：翻译流程串联与打字机效果

**优先级**：P0（最高）  
**依赖**：任务 5（AI 翻译服务）、任务 7（消息路由）  
**完成效果**：点击翻译按钮后，提取内容 → 实时打字机效果展示翻译结果

**参考页面**：[示意图-Popup翻译面板.md](./layouts/示意图-Popup翻译面板.md) — 第 3 节"翻译中状态"

**子任务**：
- [ ] 8.1 创建 `src/popup/hooks/useTranslate.ts`
  - 管理完整翻译流程：提取 → 翻译 → 存储 → 完成
  - 调用 `translateStream` 获取流式迭代器
  - 逐 chunk 追加到 `accumulatedText`
  - 翻译完成后调用 `saveLastTranslation` 持久化
  - 支持取消：设置 `AbortController`，点击取消时 abort
- [ ] 8.2 创建 `src/popup/hooks/useTypewriter.ts`
  - 接收 `accumulatedText`，按设置的速度档位（快 30ms / 中 50ms / 慢 80ms）节流渲染
  - 使用 `requestAnimationFrame` 控制渲染频率
  - 返回 `displayText`（当前应显示到哪个字符位置）
- [ ] 8.3 创建 `src/popup/components/ResultView.tsx`
  - 使用 md-wx 的 `MarkdownRenderer` 组件
  - 接收 `markdown` props，实时渲染
  - 自动滚动到底部（`useEffect` + `scrollIntoView`）
  - 文本末尾闪烁光标 `▌`（CSS 动画）
- [ ] 8.4 创建 `src/popup/components/StatusBar.tsx`（翻译中状态）
  - 左侧："■ 翻译中..." + 进度条
  - 右侧："✕ 取消" 按钮（点击中止翻译）
- [ ] 8.5 在 `App.tsx` 中串联所有状态
  - `idle` → 显示 TranslateButton
  - `extracting` → 显示提取中状态
  - `translating` → 显示 ResultView + StatusBar（翻译中）
  - 取消时 → 回到 `idle`，保留已累积文本
- [ ] 8.6 验证：完整流程跑通，从点击翻译到打字机效果展示翻译结果

**产出物**：一键翻译 + 打字机效果完整可用

---

## 任务 9：翻译完成状态与错误处理

**优先级**：P1（高）  
**依赖**：任务 8（翻译流程已跑通）  
**完成效果**：翻译完成后显示操作按钮，出错时显示错误提示并引导修复

**参考页面**：
- [示意图-Popup翻译面板.md](./layouts/示意图-Popup翻译面板.md) — 第 4 节"翻译完成状态"、第 5 节"错误状态"

**子任务**：
- [ ] 9.1 创建 `src/services/clipboard.ts`
  - 实现 `copyMarkdown(text: string): Promise<boolean>`：将 Markdown 文本写入剪贴板
  - 复制成功后返回 true
- [ ] 9.2 创建 `src/popup/components/CopyButton.tsx`
  - 按钮 "📋 复制"
  - 点击调用 `copyMarkdown`，成功后短暂显示 "✓ 已复制"（2 秒恢复）
- [ ] 9.3 在 StatusBar 中实现翻译完成状态
  - 左侧："[📋 复制]  [📥 下载 .md]" 两个按钮
  - 右侧：显示字数统计（如 "1,234 字"）
  - 下载按钮：构造 Blob + 触发下载，文件名 `[文章标题].md`
- [ ] 9.4 创建 `src/popup/components/ErrorDisplay.tsx`
  - 居中显示 ⚠️ 图标 + "翻译失败"
  - 显示具体错误描述（从 5 种错误类型匹配）
  - 提供 "⚙ 前往设置" 和 "🔄 重试" 两个按钮
  - 5 种错误类型：API Key 无效、网络错误、额度不足、内容提取失败、翻译超时
- [ ] 9.5 在 `App.tsx` 中实现 `done` 和 `error` 状态
  - `done` → 顶部栏改为 "✅ 翻译完成"，显示 ResultView + StatusBar（完成状态）
  - `error` → 显示 ErrorDisplay
- [ ] 9.6 验证：翻译完成显示复制/下载按钮，断开网络测试错误提示，点击重试可恢复

**产出物**：Popup 全部 5 种状态完整可用

---

## 任务 10：Options 设置页面

**优先级**：P1（高）  
**依赖**：任务 3（存储服务）、任务 9（Popup 已完整，设置页可关联）  
**完成效果**：独立的设置标签页，可配置 API 和翻译参数，保存后 Popup 翻译生效

**参考页面**：[示意图-Options设置页面.md](./layouts/示意图-Options设置页面.md) — 全部 4 个配置卡片

**子任务**：
- [ ] 10.1 创建 `src/options/index.html`（独立标签页，最大宽度 560px 居中）
- [ ] 10.2 创建 `src/options/main.tsx`（React 挂载入口）
- [ ] 10.3 创建 `src/options/App.tsx`
  - 页面加载时从 storage 读取当前设置
  - 管理表单状态（每个字段独立 state）
  - 保存时写入 storage + 显示 "保存成功" Toast
  - 恢复默认时二次确认
- [ ] 10.4 创建 `src/options/components/ApiConfig.tsx`
  - **API 地址**：文本输入框，默认 `https://dashscope.aliyuncs.com/compatible-mode/v1`
  - **API Key**：密码输入框（`type="password"`），右侧 👁 图标控制显隐
  - **模型名称**：下拉选择，预设 `qwen-plus` / `qwen-max` / `qwen-turbo`，支持自定义输入
  - **自定义提示词**：多行文本框（可选），placeholder 提示"为空时使用内置默认 Prompt"
- [ ] 10.5 创建 `src/options/components/TranslateConfig.tsx`
  - **目标语言**：下拉选择，预设简体中文 / 繁体中文 / English
  - **打字机速度**：三个并排单选按钮（快 / 中 / 慢），选中态高亮
- [ ] 10.6 创建 `src/options/components/DisplayConfig.tsx`
  - **主题模式**：三个单选按钮（跟随系统 / 浅色 / 深色）
  - **字体大小**：下拉选择，预设 12px / 14px / 16px / 18px
- [ ] 10.7 创建 `src/options/styles/index.css`
  - 卡片式布局，卡片间距 16px，圆角 8px
  - 表单样式统一
- [ ] 10.8 验证：打开设置页，填入真实 API Key → 保存 → 打开 Popup 翻译 → 生效

**产出物**：Options 设置页面完整可用，支持配置 API 和翻译参数

---

## 后续可选任务（二期）

以下任务在 MVP 完成后按需执行，可独立开发：

| 任务 | 说明 | 依赖 |
|------|------|------|
| 快捷键支持 | 注册 `commands`，`Ctrl+Shift+T` 触发翻译 | 任务 7 |
| 右键菜单 | 注册 `contextMenus`，"翻译此页面" | 任务 7 |
| 深色模式 | 实现 `theme.css` 两套 CSS 变量，跟随系统/手动切换 | 任务 9、10 |
| 富文本复制 | 复制 md-wx 渲染后的 HTML 到剪贴板 | 任务 9 |
| 快捷键录制 | 设置页点击 ✎ 进入录制模式，捕获组合键 | 任务 10 |
| 多语言翻译 | 支持英文→中文以外的翻译方向 | 任务 8 |
| 对照模式 | 原文/译文并排展示 | 任务 8 |
| 平台适配 | 预设 DeepSeek、通义千问等平台快捷选项 | 任务 10 |

---

## 附录：任务完成后验证清单

| 任务 | 验证方式 |
|------|----------|
| 任务 1 | Chrome 加载插件，点击图标弹出面板 |
| 任务 2 | `tsc --noEmit` 无错误 |
| 任务 3 | DevTools → Application → Storage 可看到数据 |
| 任务 4 | 文章页 Console 手动调用 `extractContent()`，输出 Markdown |
| 任务 5 | Console 中调用 `translateStream`，输出流式翻译 |
| 任务 6 | 点击图标，弹出 420×600 面板，显示 🚀 按钮 |
| 任务 7 | 点击翻译按钮，提取成功后 Console 输出原文 Markdown |
| 任务 8 | 提取后自动进入打字机效果，实时展示翻译结果 |
| 任务 9 | 翻译完成显示复制/下载，断开网络显示错误提示 |
| 任务 10 | 设置页填入 API Key 保存后，Popup 翻译可用 |