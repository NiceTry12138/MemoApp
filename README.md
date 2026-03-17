# Task Scheduler（任务调度器）

基于 Electron + TypeScript 的本地自动化任务管理工具。支持创建定时任务、管理永久任务，并提供日历视图进行任务概览。

## 核心功能

### 任务类型

| 类型 | 说明 |
|------|------|
| **HTTP 请求** | 定时发送 GET/POST/PUT/DELETE 请求，支持自定义 Headers、Cookies 和 JSON Body |
| **运行程序 (EXE)** | 定时启动本地应用程序，支持传递启动参数 |
| **系统弹窗** | 定时在桌面弹出提醒消息（基于 node-notifier）|
| **倒计时** | 设定倒计时时长，到期后触发提醒 |
| **日志/备忘** | 在日历上记录备忘信息（仅作记录，不执行）|

### 任务调度模式

- **永久运行**：任务无限期按设定的 Cron 表达式循环执行
- **日期范围运行**：设定开始/结束日期，任务仅在该时间范围内执行
- **自定义间隔**：支持 秒 / 分 / 时 / 天 维度的执行频率设置

### 界面特性

- **三栏布局**：左侧永久任务列表 & 创建入口 / 中间月视图日历 / 右侧当日任务详情
- **迷你模式**：精简窗口（240×500），窗口置顶，仅显示今日任务，支持快速删除
- **日历概览**：每天的任务以彩色条目显示在日历格子中，点击可查看详情

---

## 开发与运行

### 环境要求

- **Node.js** v20+（与 CI 环境保持一致）
- **npm** v9+

### 安装依赖

```bash
npm install
```

> 依赖通过 `.npmrc` 配置了国内镜像，首次安装无需代理即可完成。

### 常用脚本

| 命令 | 说明 |
|------|------|
| `npm run build` | 编译 TypeScript → `dist/` |
| `npm run start` | 编译后直接启动 Electron（开发调试用）|
| `npm run pack` | 编译后生成**未打包**的可执行目录（`dist-release/`，用于快速验证）|
| `npm run dist` | 编译后生成**完整安装包**（见下方打包产物）|

---

## 本地打包

```bash
npm run dist
```

打包结果输出到 `dist-release/` 目录：

| 平台 | 产物 |
|------|------|
| **Windows** | `TaskScheduler-x.x.x-Setup.exe`（NSIS 安装包）<br>`TaskScheduler-x.x.x.exe`（免安装便携版）|
| **Linux** | `TaskScheduler-x.x.x.AppImage`（免安装，通用格式）<br>`test_x.x.x_amd64.deb`（Debian/Ubuntu 安装包）|

> Windows 打包支持自定义安装目录（`oneClick: false`）。

---

## CI/CD 自动构建与发布

每次推送到 `master` 分支，GitHub Actions 会自动执行以下流程：

```
push to master
    │
    ▼
[prepare] 删除旧的 "latest" 预发布版本
    │
    ▼
[build] 并行构建（Windows · Linux）
    ├── Checkout 代码
    ├── 安装 Node.js 20 & 恢复 npm 缓存
    ├── npm ci（严格按 package-lock.json 安装）
    ├── tsc 编译
    └── electron-builder 打包 → 上传 Artifact
    │
    ▼
[release] 收集所有 Artifact，发布新的 "latest" 预发布版本
```

> 发布的 Release 标签固定为 `latest`，标题包含构建时间和 commit SHA，每次推送都会覆盖更新。可在仓库的 **Releases** 页面下载最新构建产物。

---

## 技术栈

| 组件 | 用途 |
|------|------|
| **Electron 41** | 桌面应用框架 |
| **TypeScript 5** | 强类型语言 |
| **node-schedule** | Cron 定时任务调度核心 |
| **node-notifier** | 系统桌面通知 |
| **axios** | HTTP 请求执行 |
| **electron-builder** | 应用打包与发布 |

---

## 注意事项

- 任务数据保存在应用运行目录下的 `tasks.json`（开发模式为项目根目录）。
- 应用设置保存在同目录的 `app-store.json`。
- 迷你模式下隐藏了编辑和启动/停止功能，仅供查看和快速删除。
- 打包时不包含代码签名，Windows/Linux 安装时系统可能提示安全警告，忽略即可。
