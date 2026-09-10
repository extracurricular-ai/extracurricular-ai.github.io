---
title: "如何回退 DSH 对话并恢复文件：FileSnap 安装与使用教程"
description: "安装 DeepSeek Harness 的 dsh-filesnap 插件，同步回退对话和已追踪文件，保留原对话，并用 /redo 撤销选错的回退。"
pubDate: "2026-09-09"
author: "ExAI Team"
tags: ["DeepSeek Harness", "rewind", "dsh-filesnap", "tutorial"]
locale: "zh"
image: "/images/blog/dsh-rewind/cover-rewind-redo.jpg"
imageWidth: 1280
imageHeight: 640
imageAlt: "DSH Rewind & Redo — by FileSnap 蓝白二次元鲸鱼娘封面"
---

**DSH Rewind & Redo — by FileSnap** 是 DeepSeek Harness 的回退插件，安装包名是 `dsh-filesnap`。它把对话和已追踪文件一起恢复，保留原对话，以新分支继续；如果回退点选错了，可以用 `/redo` 撤销回退。无需 Git 仓库。`filesnap` Rust 引擎负责存储，`dsh-filesnap` 负责 DSH 轮次集成与 Web UI 控件；与 App Store 的 File Converter — FileSnap 无关。

[English tutorial](/en/blog/dsh-rewind-restore-files/) · [DSH 回退插件选型比较](/zh/blog/dsh-rewind-plugin-comparison/)

我们是 dsh-filesnap 的维护者。本文按 **0.2.2** 编写，资料核查日期为 **2026 年 9 月 9 日**。截图来自已有的 0.2.2 Web UI 实际会话，宿主为 DSH 0.1.2-rc.1 本地构建；这不代表已经验证后续所有宿主版本。

与 SiriLee 的 `dsh-rewind-plugin` 0.9.1 相比，本文版本提供 `/redo`，以及共享存储中跨路径、保留版本和会话的整文件内容复用。参见 [固定版本比较与 7 组存储实验](/zh/blog/dsh-rewind-plugin-comparison/)；对方则提供原会话交互和仅回退对话的选项。


## 跨助手应用：Codex、DSH 与 Pi

FileSnap 的快照设计源自我们已发布的 [codex-rewind](https://github.com/extracurricular-ai/codex-rewind)（`codexr`）实践，独立引擎已用于 DSH 的 `dsh-filesnap` 和 Pi 的 [pi-better-rewind-redo](https://github.com/extracurricular-ai/pi-better-rewind-redo)。截至 2026-09-10，DSH 插件发布版为 0.2.2，依赖 `filesnap ^0.4.0`；Pi 扩展发布版为 0.1.1，依赖 `filesnap 0.5.0`；Codex 增强发行版为 0.151.0-rewind.0，保留同源的内置快照模块。

这套设计已积累 Codex、DSH 和 Pi 的轮次接入、文件恢复与 redo 实践，是我们说明工程成熟度的具体依据。Codex 保留内置实现，DSH 与 Pi 使用不同版本的独立引擎；各自的兼容性与验证范围见项目文档。

[公开版本、源码与验证范围](https://github.com/extracurricular-ai/dsh-filesnap/blob/main/docs/cross-assistant.zh.md)。


## 完整操作演示（1.5 倍速）

<iframe src="https://player.bilibili.com/player.html?bvid=BV1BiYT6qEjs&amp;p=1&amp;autoplay=0&amp;danmaku=0" title="DSH 回退与 Redo 中文完整操作演示（哔哩哔哩）" width="960" height="540" style="display: block; width: 100%; height: auto; min-height: 200px; aspect-ratio: 16 / 9; border: 0;" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>

[在 B 站观看完整演示](https://www.bilibili.com/video/BV1BiYT6qEjs/) · [English walkthrough (YouTube)](https://www.youtube.com/watch?v=WPEXKesR_EM)

这段演示约 2 分 24 秒，保留完整录屏画面，语音和画面同步按 1.5 倍速播放，仅去掉等待和少量重复内容。从准备文件开始，连续展示删除、回退恢复、保留原对话、用 `/redo` 撤销，以及再次选择更早的恢复点。Redo 会回到回退前的状态，在这个例子中也会让文件再次被删除。

## 安装到 Web UI profile

需要 Node.js **^22.19 或 >=24**，支持 Linux、macOS、Windows 的 x64 和 arm64。安装包包含 FileSnap 原生引擎，无需自行安装 Rust 工具链。

卸载插件不会删除对话记录或工作区文件。当前的读取限制是：已包含插件记录的会话，需要重装插件后才能在 DSH 中重新打开。从源码目录用 `pnpm dsh` 启动，也可能遇到同样的事件注册错误；请使用构建好的 CLI 或 npm 安装的 CLI。参见[安装与故障排查说明](https://github.com/extracurricular-ai/dsh-filesnap/blob/857481528bd17c2ea5434c8d358ad6ede7f8b844/README.md)。

```sh
dsh plugin --profile web add dsh-filesnap
```

该命令安装当前可用版本。要复现本文的插件版本，可把包名换成 `dsh-filesnap@0.2.2`。安装后重启 Web UI profile。0.2.2 已声明 bundle，不需要手动添加加载项。

**从 0.2.1 或更早版本升级？** 启动 0.2.2 前，先删除 profile 的 `cordis.patch.yml` 中以前手动添加的 `id: filesnap` 项，否则会与 bundle 提供的同名项冲突。

## 1．先产生记录，再练习恢复

在一个可丢弃的测试工作区中，让 agent 新建一个小文件，然后在下一轮修改它。每轮都等待执行结束。要练习误删恢复，可以再让它删除这个文件。

FileSnap 只能恢复已经捕获的状态。在误删之后才安装插件，不能找回之前从未记录过的文件版本。

把鼠标放在已完成的 assistant 回复上，找到回退按钮。**先读提示里的目标轮次和覆盖范围**，不要只根据按钮所在位置猜测会恢复到哪里。

![回退按钮的提示显示目标轮次，以及该次快照追踪的两个文件](/images/blog/dsh-rewind/shot-1-turn-control.png)

截图是另一段编辑 `data.txt` 的真实演示会话；你练习时的轮次编号和文件数量可能不同。界面截图保留原始英文，操作含义在正文中说明。

## 2．选定一个明确的恢复点

在对话中输入下面的命令，列出已捕获的恢复点：

```text
/rewind
```

![输入框列出 rewind 支持的轮次、恢复点 ID 和 status 参数](/images/blog/dsh-rewind/shot-2-rewind-command.png)

使用列表中显示的轮次编号或恢复点 ID。例如，**只有当你的目标确实是列表中的第 2 轮时**，才输入：

```text
/rewind 2
```

它表示回到**该目标轮次之前**，不是“往回退两轮”。误删恢复练习中，选择删除发生前的恢复点。回退会写入真实工作区，因此先用测试文件练习，并等待 agent 停止工作。

Web UI 的回退按钮会打开新产生的子会话。直接输入 `/rewind` 命令时，结果会给出子会话 ID；如果界面仍停在原会话，请自行打开返回的子会话。

![回退结果显示写入、删除的文件数量，以及继续操作的子会话 ID](/images/blog/dsh-rewind/shot-3-rewound.png)

## 3．理解保留原对话的含义

原对话仍然可用，子会话从选定位置继续。会话列表会给离开的原对话加上箭头标记。

![会话列表中的箭头标记指出被回退离开的原对话](/images/blog/dsh-rewind/shot-5-marked-sessions.png)

**两个对话共用同一个物理工作区。** 对话分支不是独立的 Git worktree，也不是第二份目录。恢复文件会影响那个目录，切换会话不会自动切换成各自独立的文件副本。

![回退保留原对话、创建子会话并恢复共用工作区；redo 撤销这次回退](/images/blog/dsh-rewind/rewind-flow-zh.svg)

## 4．恢复点选早了？撤销这次回退

先不要继续修改，在子会话中输入：

```text
/redo
```

插件利用回退前捕获的救援状态撤销恢复，并把原对话作为继续操作的目标。使用命令操作时，根据返回的会话信息切换。

![redo 的结果说明回退已撤销，并给出原会话作为继续目标](/images/blog/dsh-rewind/shot-6-redo.png)

Redo 也会恢复文件。对于刚才的误删练习，这意味着文件可能再次被删除：它让你回到执行 rewind 之前的状态，而不是再做一次文件救援。在产生新修改之前试用，最容易看清这两步的关系。

## 5．检查哪些文件受保护

```text
/rewind status
```

![status 输出显示当前工作区的记录占用，以及共用内容存储的占用](/images/blog/dsh-rewind/shot-4-status.png)

捕获范围由已知路径、DSH `ctx.fs` 写入或编辑时观察到的路径，以及近期工作区变化的有限扫描共同组成。观察到的路径可以位于项目根目录之外。有限扫描能补充一部分 shell 修改，但不是对所有 shell 操作影响范围的无限备份。

`.filesnapignore` 的排除规则同时作用于捕获和恢复。不可读、过大及其他被排除的文件可能不受保护；应结合 status 输出和目标快照覆盖范围判断。当前 status 不能证明旧快照里一定存在某个文件。详见[捕获与恢复机制](https://github.com/extracurricular-ai/dsh-filesnap/blob/857481528bd17c2ea5434c8d358ad6ede7f8b844/docs/architecture.md)。

## 接下来怎么验证

完整走一遍：**记录文件 → 修改或删除 → 回退恢复 → redo 撤销回退**。每一步都检查磁盘上的文件和当前所在的会话。

如果你更看重始终留在同一个会话，可以阅读[标明版本的插件比较](/zh/blog/dsh-rewind-plugin-comparison/)。安装更新与问题反馈入口在[项目仓库](https://github.com/extracurricular-ai/dsh-filesnap)和 [npm 页面](https://www.npmjs.com/package/dsh-filesnap)。
