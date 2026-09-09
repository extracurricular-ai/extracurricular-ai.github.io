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

**DSH Rewind & Redo — by FileSnap** 是 DeepSeek Harness 的回退插件，安装包名是 `dsh-filesnap`。它把对话和已追踪文件一起恢复，保留原对话，以新分支继续；如果回退点选错了，可以用 `/redo` 撤销回退。无需 Git 仓库。

[English tutorial](/en/blog/dsh-rewind-restore-files/) · [DSH 回退插件选型比较](/zh/blog/dsh-rewind-plugin-comparison/)

我们是 dsh-filesnap 的维护者。本文按 **0.2.2** 编写，资料核查日期为 **2026 年 9 月 9 日**。截图来自已有的 0.2.2 Web UI 实际会话，宿主为 DSH 0.1.2-rc.1 本地构建；这不代表已经验证后续所有宿主版本。

## 安装到 Web UI profile

需要 Node.js **^22.19 或 >=24**，支持 Linux、macOS、Windows 的 x64 和 arm64。安装包包含 FileSnap 原生引擎，无需自行安装 Rust 工具链。

安装前需要了解当前限制：被插件记录过的会话，需要保留插件才能在 DSH 中打开。卸载不会删除会话数据，但需要重装才能重新读取。从源码目录用 `pnpm dsh` 启动，也可能遇到同样的事件注册错误；请使用构建好的 CLI 或 npm 安装的 CLI。参见[安装与故障排查说明](https://github.com/extracurricular-ai/dsh-filesnap/blob/857481528bd17c2ea5434c8d358ad6ede7f8b844/README.md)。

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
