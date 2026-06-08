# MobTestLab

一站式移动端测试工作台，基于 Electron + Vue 3 构建的桌面应用，集成投屏控制、性能采集、AI 自动化测试和智能助手等核心能力。

## 应用截图

| 工作台 | 投屏 |
|:---:|:---:|
| ![工作台](docs/screenshots/工作台.png) | ![投屏](docs/screenshots/投屏.png) |

| 性能 | 报告 |
|:---:|:---:|
| ![性能](docs/screenshots/性能.png) | ![报告](docs/screenshots/报告.png) |

| 日间模式 |
|:---:|
| ![日间模式](docs/screenshots/日间模式.png) |

## 功能特性

### 投屏控制
- 支持 Android（Scrcpy）、iOS（libimobiledevice）设备实时投屏
- 支持触控操作转发（点击、滑动、滚动）
- 支持键盘输入和文本注入
- 可调节分辨率、帧率、码率

### 性能采集
- 实时采集 CPU、内存、FPS、网络、电量、温度、GPU 等指标
- 异步采集架构，不阻塞 UI
- 实时图表可视化（ECharts）
- 数据导出

### AI 自动化
- 集成 [Midscene.js](https://midscenejs.com/) Android 自动化能力
- 自然语言驱动的 UI 操作（`aiAct`、`aiAssert`、`aiQuery`、`aiWaitFor`）
- 脚本管理（新建、编辑、重命名、复制、删除）
- 实时执行日志和步骤状态
- Midscene HTML 测试报告查看
- 支持自定义 AI 模型配置（OpenAI、Qwen-VL、Gemini 等）

### 测试报告
- 自动化测试报告自动归档
- 性能测试报告汇总
- 支持查看 Midscene 原始 HTML 报告
- 报告筛选、搜索、导出

### AI 助手
- 对话式交互界面
- 支持文本、图片、文件等多模态消息
- 对话历史管理（新建、切换、重命名、删除）

## 技术栈

| 分类 | 技术 |
|------|------|
| 框架 | Electron 33 + Vue 3.5 + TypeScript |
| 状态管理 | Pinia |
| UI 组件 | Element Plus + Tailwind CSS 4 |
| 图表 | ECharts (vue-echarts) |
| 图标 | @iconify/vue (MDI) |
| 自动化 | @midscene/android |
| 投屏 | Scrcpy + libimobiledevice |
| 构建 | Vite 6 + electron-builder |

## 快速开始

### 环境要求
- Node.js >= 18
- macOS（当前仅支持 arm64）
- ADB（Android 投屏/自动化）
- libimobiledevice（iOS 投屏，可选）

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run electron:dev
```

### 构建

```bash
npm run electron:build
```

产物输出在 `release/` 目录。

## 项目结构

```
├── electron/              # Electron 主进程
│   ├── main.cjs           # 主进程入口
│   ├── preload.cjs        # 预加载脚本（IPC 桥接）
│   ├── scrcpy-client.cjs  # Android 投屏客户端
│   ├── ios-mirror-client.cjs  # iOS 投屏客户端
│   ├── android-perf-collector.cjs  # 性能采集器
│   ├── automation-runner.cjs  # 自动化脚本管理器
│   └── automation-worker.cjs  # 自动化执行子进程
├── src/                   # 渲染进程（Vue）
│   ├── views/             # 页面视图
│   ├── stores/            # Pinia 状态
│   ├── components/        # 通用组件
│   ├── layouts/           # 布局组件
│   └── styles/            # 全局样式
├── resources/bin/         # 内置二进制工具（adb, scrcpy-server, ffmpeg）
└── build/                 # 应用图标等构建资源
```

## 更新日志

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v2.0.0 | 2026-06-08 | 新增安装应用工具、GitHub Actions 自动打包（macOS + Windows）、应用图标更新 |
| v1.2.0 | 2026-06-07 | 新增工具 Tab（二维码生成）、工作台仪表盘、Mac 设备信息、自定义菜单栏、助手聊天 UI 重构 |
| v1.0.0 | 2026-06-07 | 初始版本：投屏控制、性能采集、AI 自动化、测试报告、AI 助手 |

## License

MIT
