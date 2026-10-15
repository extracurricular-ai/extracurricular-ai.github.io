---
title: "dsh-filesnap 与 dsh-rewind-plugin 怎么选：文件去重与回退撤销"
description: "对比 dsh-filesnap 与 dsh-rewind-plugin：7 组存储实验说明 FileSnap 更广的文件去重复用范围，并比较 redo、对话交互和文件覆盖。"
pubDate: "2026-09-09"
author: "ExAI Team"
tags: ["DeepSeek Harness", "rewind", "dsh-filesnap", "comparison"]
locale: "zh"
image: "../../../assets/blog/dsh-rewind/cover-rewind-redo.jpg"
imageAlt: "DSH Rewind & Redo — by FileSnap 蓝白二次元鲸鱼娘封面"
---

选择 **DeepSeek Harness 回退插件**，先回答两个问题：是否希望始终留在同一个对话里，以及是否需要撤销“回退”这个动作。文件覆盖范围和恢复边界，与命令名字同样重要。

[English version](/en/blog/dsh-rewind-plugin-comparison/) · [FileSnap 安装与使用教程](/zh/blog/dsh-rewind-restore-files/)

**作者关系与核查方式：** 我们维护 dsh-filesnap，展示名为 **DSH Rewind & Redo — by FileSnap**。本文于 **2026 年 9 月 9 日**核查指定版本的文档及部分发布包代码，没有重新进行完整的端到端实测或性能对比。下文描述这些版本，不代表后续版本或所有 DSH 宿主版本。

**2026-09-10 更新：新增 7 组存储组件实验。FileSnap 相对于本次核查的 SiriLee 版本，优势是更广的去重复用范围，以及用 `/redo` 撤销回退。** 双方都有 Web UI 控件，且能联动恢复对话和文件；下面分别说明适合的场景。对话行为仍是文档核查，存储组件实验不代表完整宿主实测。

## 按使用习惯选择

- **希望留在同一个对话，也需要只回退对话：** 可以考虑 SiriLee 的 `dsh-rewind-plugin`。本文核查版本的 `/undo` 是打开回退操作，不是撤销上一次回退。
- **希望保留原对话，并撤销选错的回退：** 可以考虑 `dsh-filesnap` 和 `/redo`。代价是进入一个共用工作区的子会话，卸载不会删除对话记录或工作区文件，但含插件记录的会话需要重装后重新打开。
- **希望使用 Git 快照，并恢复最近一次回退：** 可以考虑 LJH-dot 的 `dsh-rewind` 和 `/unrewind`。先确认其 Git 恢复操作以及不含未追踪文件的边界是否适合你。

以上选择依据下列版本的文档行为。后面的表格与来源解释具体取舍；本文没有通过尚未执行的实测给出综合排名。

## 先分清三个安装包

有两个项目的仓库都叫 `dsh-rewind`，但它们的 npm 包名不同。

| 项目 | npm 包名 | 核查版本 |
|---|---|---|
| [extracurricular-ai/dsh-filesnap](https://github.com/extracurricular-ai/dsh-filesnap) | `dsh-filesnap` | [0.2.2](https://registry.npmjs.org/dsh-filesnap/0.2.2) |
| [SiriLee/dsh-rewind](https://github.com/SiriLee/dsh-rewind) | `dsh-rewind-plugin` | [0.9.1](https://registry.npmjs.org/dsh-rewind-plugin/0.9.1) |
| [LJH-dot/dsh-rewind](https://github.com/LJH-dot/dsh-rewind) | `dsh-rewind` | [0.11.12](https://registry.npmjs.org/dsh-rewind/0.11.12) |

下表主要依据对应发布版本的文档：[FileSnap](https://github.com/extracurricular-ai/dsh-filesnap/blob/857481528bd17c2ea5434c8d358ad6ede7f8b844/README.md)、[SiriLee](https://github.com/SiriLee/dsh-rewind/blob/c059e38ceb8e3da087387bcb808796461aa6064c/README.en.md)、[LJH-dot](https://github.com/LJH-dot/dsh-rewind/blob/9b2ce54b83a89c60f7d31be5c28013b41040b360/README.md)。

## 直接比较使用时的区别

| 问题 | dsh-filesnap 0.2.2 | dsh-rewind-plugin 0.9.1 | dsh-rewind 0.11.12 |
|---|---|---|---|
| 回退后在哪里继续？ | 新子会话，原对话保留 | 当前会话，可见历史回退 | 当前会话回退，恢复数据保留在 vault |
| 能否撤销回退？ | 子会话内 `/redo` | 未提供内置撤销回退；`/undo` 是 rewind 别名 | `/unrewind` 恢复最近一次回退 |
| 能否只回退对话？ | 主要操作将对话与已追踪文件一起回退 | 可以，也可选对话和代码一起回退 | 可以，提供对话与代码模式参数 |
| 怎样指定目标？ | 列表显示的明确轮次或恢复点 ID | 交互式选择器 | 相对编号，`1` 表示最近一次 |
| 是否依赖 Git？ | 不依赖 | 不依赖 | 使用 Git 快照，必要时初始化基线 |
| 文件边界是什么？ | 已知路径、观察到的文件系统写入、近期变化的有限扫描 | 已登记写入工具路径，以及已追踪文件的重新扫描 | 基于 Git 的工作区快照，不含未追踪文件 |

“对话和文件一起恢复”“不需要 Git”是 FileSnap 和 SiriLee 插件共有的能力，不能作为 FileSnap 独占的卖点。

## 文件去重：FileSnap 的复用范围更广

`dsh-filesnap` 是 DSH 对话与文件回退插件，`filesnap` 是它使用的 Rust 存储引擎；与 App Store 的 **File Converter — FileSnap** 无关。插件接入 DSH 轮次生命周期，并提供消息旁的回退控件，不需要用户在独立备份软件里手工匹配时间戳。

**与 SiriLee 的 dsh-rewind-plugin 0.9.1 相比，dsh-filesnap 0.2.2 搭配 filesnap 0.4.0 的文件内容复用范围更广。** 引擎用完整文件内容的 SHA-256 标识 blob，在路径、保留的版本、会话以及同一数据目录下的工作区之间共享。对方则用会话和路径索引最近内容，相同才存引用。

2026 年 9 月 10 日，我们用已发布的 FileSnap CLI 和对方发布包中的 `SnapshotStore` 跑了 7 组存储组件实验。每组为全新存储、64 KiB ASCII 内容。下表是**文件正文副本数**，不包含元数据和文件系统分配：

| 输入场景 | FileSnap 0.4.0 | dsh-rewind-plugin 0.9.1 |
|---|---:|---:|
| 同路径、同会话，A → A → A | 1 | 1 |
| 同路径、同会话，A → B → A | **2** | 3 |
| 两个路径内容相同 | **1** | 2 |
| 两个会话内容相同 | **1** | 2 |
| 两个工作区共享存储、内容相同 | **1** | 2 |
| 三份内容各不相同 | 3 | 3 |
| 重新打开存储后记录相同内容 | 1 | 1 |

保存的内容哈希、对方记录的解引用结果均与输入核对通过。提取模块只适配默认宿主目录解析器，测试始终显式传入临时路径。这不是两个完整插件在 DSH 内的测试，不是完整恢复或捕获速度测试；更广泛的 R01–R06 方案仍未执行。

可以据此强调**相同内容的复用范围更广**，不能直接推算所有工作负载的总空间节省百分比。双方都有元数据和保留策略；复用要求内容仍在库中，不同数据目录不共享 blob。整文件哈希也不等于块级去重或差量压缩：大文件改一个字符，仍可能新增完整 blob。

[复现方法与固定版本源码](https://github.com/extracurricular-ai/dsh-filesnap/blob/main/docs/dedup-comparison.zh.md) · [原始结果与校验值](https://github.com/extracurricular-ai/dsh-filesnap/blob/main/docs/evidence/dedup-2026-09-10.json)。

## 跨助手应用：Codex、DSH 与 Pi

FileSnap 的快照设计源自我们已发布的 [codex-rewind](https://github.com/extracurricular-ai/codex-rewind)（`codexr`）实践，独立引擎已用于 DSH 的 `dsh-filesnap` 和 Pi 的 [pi-better-rewind-redo](https://github.com/extracurricular-ai/pi-better-rewind-redo)。截至 2026-09-10，DSH 插件发布版为 0.2.2，依赖 `filesnap ^0.4.0`；Pi 扩展发布版为 0.1.1，依赖 `filesnap 0.5.0`；Codex 增强发行版为 0.151.0-rewind.0，保留同源的内置快照模块。

这套设计已积累 Codex、DSH 和 Pi 的轮次接入、文件恢复与 redo 实践，是我们说明工程成熟度的具体依据。Codex 保留内置实现，DSH 与 Pi 使用不同版本的独立引擎；各自的兼容性与验证范围见项目文档。

[公开版本、源码与验证范围](https://github.com/extracurricular-ai/dsh-filesnap/blob/main/docs/cross-assistant.zh.md)。

## 什么时候适合原地回退

如果你希望选中较早的消息后仍留在同一对话，并且需要“只回退对话”的选项，SiriLee 的插件值得考虑。它通过追加标记改变可见历史，底层日志仍采用追加模型。**原地回退不等于抹掉原始审计记录。**

0.9.1 的 `/undo` 是打开回退操作的另一种写法，不是撤销上一次回退；README 将内置回退流程描述为不可逆。这是该实现的行为，不是说所有原地回退都无法恢复：LJH-dot 的 `/unrewind` 就提供了另一种恢复设计。[SiriLee README](https://github.com/SiriLee/dsh-rewind/blob/c059e38ceb8e3da087387bcb808796461aa6064c/README.en.md)、[LJH-dot README](https://github.com/LJH-dot/dsh-rewind/blob/9b2ce54b83a89c60f7d31be5c28013b41040b360/README.md)。

## 什么时候需要保留分支与 redo

如果你希望完整保留原对话，并能直接撤销选错的回退，FileSnap 更符合这个需求。例如：恢复误删文件后，发现选的恢复点太早，先用 `/redo` 返回，再选择另一个点。

![FileSnap 保留原对话并创建子会话，同时恢复共用的工作区目录](/images/blog/dsh-rewind/rewind-flow-zh.svg)

代价是多出一个会话。浏览器按钮会打开子会话，命令操作会返回需要打开的会话。另外，**两个会话共用同一个工作区目录**，保留原对话不等于为它保留了一份可以独立编辑的文件副本。

![FileSnap 的 redo 结果将原会话列为继续操作的目标](/images/blog/dsh-rewind/shot-6-redo.png)

卸载 FileSnap 0.2.2 不会删除对话记录或工作区文件。捕获过的会话需要插件注册事件类型，所以需要重装插件后才能在 DSH 中重新打开。源码环境用 `pnpm dsh` 启动也可能遇到相同的注册问题。这一版没有逐文件选择恢复的界面。选型时应把这些成本与 redo 的收益一起考虑。[FileSnap 文档](https://github.com/extracurricular-ai/dsh-filesnap/blob/857481528bd17c2ea5434c8d358ad6ede7f8b844/README.md)。

## 文件覆盖范围可能决定最终选择

SiriLee 的文档明确说明了通过支持的写入工具首次登记文件的边界。对已登记文件重新扫描，可以补充后续变化，但第一次通过 shell 修改尚未登记的文件不在这套机制的覆盖范围内。其[追踪边界文档](https://github.com/SiriLee/dsh-rewind/blob/c059e38ceb8e3da087387bcb808796461aa6064c/docs/compat/tracking-boundary.md)还说明了快照时机的限制。

FileSnap 增加了近期变化的有限扫描，并能追踪项目根目录之外观察到的文件系统写入。这扩大了设计覆盖范围，但不等于所有 shell 新建文件都会被捕获，也不等于无限的文件系统备份。应检查 `/rewind status`、`.filesnapignore` 和目标快照。[架构文档](https://github.com/extracurricular-ai/dsh-filesnap/blob/857481528bd17c2ea5434c8d358ad6ede7f8b844/docs/architecture.md)说明了这些边界。

LJH-dot 的插件通过 Git 操作捕获和恢复状态。其文档描述的范围包含 DSH 之外产生的工作区修改，但不包含未追踪文件。它可能适合以 Git 为中心的流程，不过这个边界仍与“磁盘上的所有文件”不同。[LJH-dot 文档](https://github.com/LJH-dot/dsh-rewind/blob/9b2ce54b83a89c60f7d31be5c28013b41040b360/README.md)。

## 使用前核查兼容性与维护行为

SiriLee 0.9.1 提供了升级 DSH 0.1.3 的说明，以及旧回退标记的修复路径，也提供可选的快照清理功能。可以阅读该版本的[升级说明](https://github.com/SiriLee/dsh-rewind/blob/c059e38ceb8e3da087387bcb808796461aa6064c/README.en.md)和[清理文档](https://github.com/SiriLee/dsh-rewind/blob/c059e38ceb8e3da087387bcb808796461aa6064c/docs/snapshot-auto-cleanup.md)。宿主升级后，应重新核查行为，不能直接套用旧版审计结论。

本文没有确认 SiriLee 和 LJH-dot 在所有卸载、宿主升级路径上的结果；正式依赖之前，应在可丢弃的会话中验证。对三个项目都建议记录插件与宿主版本，再测试自己实际会修改的文件类型，包括未追踪文件、二进制素材和 shell 修改。本文没有独立实测二进制文件的完整恢复往返。

如果 FileSnap 符合你的使用习惯，可以继续看[配图教程](/zh/blog/dsh-rewind-restore-files/)，完成安装、明确选择恢复点、进入子会话和 `/redo` 的完整流程。
