---
title: "DSH 回退插件怎么选：原地回退、对话分支、文件恢复与 redo"
description: "比较 dsh-filesnap、SiriLee 的 dsh-rewind-plugin 和 LJH-dot 的 dsh-rewind，说明回退方式、可撤销性、文件覆盖与 Git 依赖。"
pubDate: "2026-09-09"
author: "ExAI Team"
tags: ["DeepSeek Harness", "rewind", "dsh-filesnap", "comparison"]
locale: "zh"
image: "/images/blog/dsh-rewind/cover-rewind-redo.jpg"
imageWidth: 1280
imageHeight: 640
imageAlt: "DSH Rewind & Redo — by FileSnap 蓝白二次元鲸鱼娘封面"
---

选择 **DeepSeek Harness 回退插件**，先回答两个问题：是否希望始终留在同一个对话里，以及是否需要撤销“回退”这个动作。文件覆盖范围和恢复边界，与命令名字同样重要。

[English version](/en/blog/dsh-rewind-plugin-comparison/) · [FileSnap 安装与使用教程](/zh/blog/dsh-rewind-restore-files/)

**作者关系与核查方式：**我们维护 dsh-filesnap，展示名为 **DSH Rewind & Redo — by FileSnap**。本文于 **2026 年 9 月 9 日**核查指定版本的文档及部分发布包代码，没有重新进行完整的端到端实测或性能对比。下文描述这些版本，不代表后续版本或所有 DSH 宿主版本。

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

## 什么时候适合原地回退

如果你希望选中较早的消息后仍留在同一对话，并且需要“只回退对话”的选项，SiriLee 的插件值得考虑。它通过追加标记改变可见历史，底层日志仍采用追加模型。**原地回退不等于抹掉原始审计记录。**

0.9.1 的 `/undo` 是打开回退操作的另一种写法，不是撤销上一次回退；README 将内置回退流程描述为不可逆。这是该实现的行为，不是说所有原地回退都无法恢复：LJH-dot 的 `/unrewind` 就提供了另一种恢复设计。[SiriLee README](https://github.com/SiriLee/dsh-rewind/blob/c059e38ceb8e3da087387bcb808796461aa6064c/README.en.md)、[LJH-dot README](https://github.com/LJH-dot/dsh-rewind/blob/9b2ce54b83a89c60f7d31be5c28013b41040b360/README.md)。

## 什么时候需要保留分支与 redo

如果你希望完整保留原对话，并能直接撤销选错的回退，FileSnap 更符合这个需求。例如：恢复误删文件后，发现选的恢复点太早，先用 `/redo` 返回，再选择另一个点。

![FileSnap 保留原对话并创建子会话，同时恢复共用的工作区目录](/images/blog/dsh-rewind/rewind-flow-zh.svg)

代价是多出一个会话。浏览器按钮会打开子会话，命令操作会返回需要打开的会话。另外，**两个会话共用同一个工作区目录**，保留原对话不等于为它保留了一份可以独立编辑的文件副本。

![FileSnap 的 redo 结果将原会话列为继续操作的目标](/images/blog/dsh-rewind/shot-6-redo.png)

FileSnap 0.2.2 还有明显的卸载限制：捕获过的会话需要插件注册事件类型，所以卸载后需要重装才能重新打开。源码环境用 `pnpm dsh` 启动也可能遇到相同的注册问题。这一版没有逐文件选择恢复的界面。选型时应把这些成本与 redo 的收益一起考虑。[FileSnap 文档](https://github.com/extracurricular-ai/dsh-filesnap/blob/857481528bd17c2ea5434c8d358ad6ede7f8b844/README.md)。

## 文件覆盖范围可能决定最终选择

SiriLee 的文档明确说明了通过支持的写入工具首次登记文件的边界。对已登记文件重新扫描，可以补充后续变化，但第一次通过 shell 修改尚未登记的文件不在这套机制的覆盖范围内。其[追踪边界文档](https://github.com/SiriLee/dsh-rewind/blob/c059e38ceb8e3da087387bcb808796461aa6064c/docs/compat/tracking-boundary.md)还说明了快照时机的限制。

FileSnap 增加了近期变化的有限扫描，并能追踪项目根目录之外观察到的文件系统写入。这扩大了设计覆盖范围，但不等于所有 shell 新建文件都会被捕获，也不等于无限的文件系统备份。应检查 `/rewind status`、`.filesnapignore` 和目标快照。[架构文档](https://github.com/extracurricular-ai/dsh-filesnap/blob/857481528bd17c2ea5434c8d358ad6ede7f8b844/docs/architecture.md)说明了这些边界。

LJH-dot 的插件通过 Git 操作捕获和恢复状态。其文档描述的范围包含 DSH 之外产生的工作区修改，但不包含未追踪文件。它可能适合以 Git 为中心的流程，不过这个边界仍与“磁盘上的所有文件”不同。[LJH-dot 文档](https://github.com/LJH-dot/dsh-rewind/blob/9b2ce54b83a89c60f7d31be5c28013b41040b360/README.md)。

## 使用前核查兼容性与维护行为

SiriLee 0.9.1 提供了升级 DSH 0.1.3 的说明，以及旧回退标记的修复路径，也提供可选的快照清理功能。可以阅读该版本的[升级说明](https://github.com/SiriLee/dsh-rewind/blob/c059e38ceb8e3da087387bcb808796461aa6064c/README.en.md)和[清理文档](https://github.com/SiriLee/dsh-rewind/blob/c059e38ceb8e3da087387bcb808796461aa6064c/docs/snapshot-auto-cleanup.md)。宿主升级后，应重新核查行为，不能直接套用旧版审计结论。

本文没有确认 SiriLee 和 LJH-dot 在所有卸载、宿主升级路径上的结果；正式依赖之前，应在可丢弃的会话中验证。对三个项目都建议记录插件与宿主版本，再测试自己实际会修改的文件类型，包括未追踪文件、二进制素材和 shell 修改。本文没有独立实测二进制文件的完整恢复往返。

如果 FileSnap 符合你的使用习惯，可以继续看[配图教程](/zh/blog/dsh-rewind-restore-files/)，完成安装、明确选择恢复点、进入子会话和 `/redo` 的完整流程。
