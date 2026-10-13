# 中英对照讲稿（排练用）

上台说英文，中文帮你理解每句话的意思。点击步骤和英文版 [PITCH.md](PITCH.md) 完全一样。

---

## 0:00-0:30 · 问题（Overview 页面，不用点）

> Our tutor works a five-hour shift. Before tutoring starts at four, she answers WeChat in English and Chinese, and records marked tests.

我们的辅导老师一个班五小时。四点开始辅导之前，她要用中英文回复微信，还要录入批改好的试卷。

> The worst step is step 8. Every marked test is typed into three spreadsheets. And the best signal on the paper is never used: W versus C, a real gap versus a careless slip.

最费事的是第 8 步：每份批改好的试卷要录入三张表格。而试卷上最有价值的信息从来没被利用：W 和 C 的区别，也就是真正不会和粗心犯错的区别。

> ShiftMate fixes that. Rules write the records. AI only drafts messages. The tutor decides.

ShiftMate 解决这个问题：记录由规则来写，AI 只负责起草消息，决定由老师来做。

---

## 0:30-1:35 · 场景一：一份试卷（Mark once）

**点左侧菜单 Mark once**，Phoenix 的 Module Test 8A 已经打开。

> This is Phoenix's Module Test 8A, the same paper as Exhibit 1. I enter the marks once.

这是 Phoenix 的 8A 模块测试，就是题目附件 1 里那份试卷。我只录入一次分数。

**点 Fill demo marks**，用鼠标指红色 W 标签，再指黄色 C 标签。

> Question 2 is a W. That point drops a level. Question 7 is a C, a careless slip, so mastery is kept.

第 2 题是 W（做错），这个知识点降一级。第 7 题是 C，粗心，所以掌握程度保持不变。

用鼠标指 "Why was it left blank?"。

> Question 8 is blank in the middle of the paper. So it asks me why, instead of guessing.

第 8 题在试卷中间空着没做，所以系统会问我原因，而不是自己猜。

**点 Didn't know how to start**，指 "Suggested"。

> It suggests practice, then a Retest. That decision is mine.

系统建议先练习，再重考。但决定由我来做。

**点 Apply to all three sheets**。

> One click updates all three sheets and the exam log, and drafts a note for his mum, in Chinese.

点一下，三张表和考试记录全部更新，还会用中文给他妈妈起草一条通知。

---

## 1:35-2:05 · 场景二：一条中英混合消息（WeChat inbox）

**点左侧菜单 WeChat inbox，再点 Norton Cheng**。

> Norton writes half in Chinese, half in English. ShiftMate proposes a Q&A booking. It read "下周四" as the 22nd, but that is a guess, so the box stays unticked and the reply asks him to confirm. Nothing is sent without me.

Norton 的消息一半中文一半英文。系统建议给他约一次答疑。它把"下周四"理解成 22 号，但这只是推测，所以那个勾选框默认不勾，回复里会请他确认。没有我同意，什么都不会发出去。

---

## 2:05-2:15 · 日报（Daily report）

**点左侧菜单 Daily report**。

> At six-twenty, the daily report counts itself from the work I just did.

到了 6 点 20 分，日报会根据我刚才做的工作自动统计。

---

## 2:15-2:50 · 效果、可行性、负责任的 AI（Impact and safety）

**点左侧菜单 Impact and safety**，指 "~65 min"。

> We estimate about 65 minutes back per shift, using today's volumes. Every number here can be changed.

按今天的工作量估算，每个班大约能省下 65 分钟。这里每个数字都可以修改。

> It works with the centre's own tools: the same three sheets, a Google Sheets add-on, and copy-paste into WeChat. AI is optional, and it only sees record facts with student names masked. Tonight it runs fully offline, so the demo cannot fail.

它用的是中心现有的工具：同样的三张表、一个 Google Sheets 插件，复制粘贴到微信即可。AI 是可选的，它只能看到隐去学生姓名后的记录信息。今晚的演示完全离线运行，所以不会出故障。

---

## 2:50 · 结尾

> Mark once. Reply once. Teach more. Thank you.

批改一次，回复一次，多教一点。谢谢。

---

## 问答速查（用英文回答，一两句就停）

| 评委可能问 | 怎么答（英文原句见 PITCH.md 的 Q&A prep 表格） |
|---|---|
| AI 在哪里？ | AI 只负责起草微信回复，基于 Claude API，会隐去姓名，用模拟回复测试过，还没有真实上线。今晚特意离线运行，离线引擎本身就能处理中英文。 |
| AI 能看到什么？ | 消息本身，加上回复需要的少量记录信息（比如考试分数），学生、家长、学校的名字会先被替换掉。每份草稿都显示发出了什么。 |
| AI 出错怎么办？ | 每条回复都要老师批准。草稿里出现记录中没有的百分比会被标出来。如果回复承诺了老师没勾选的操作，批准会被拦下。从中文读出的日期必须手动勾选。 |
| 为什么不让 AI 批改？ | 批改手写数学题需要老师判断。我们自动化的是批改之后的事：重复录入和分析。 |
| 能用他们现有的表格吗？ | 布局和附件 1 到 3 一样，现在可以导出 CSV。Google Sheets 插件在代码仓库里，会先检查表格布局，不一致就什么都不写。还没有在真实的 Google 表格里跑过。 |
| 65 分钟怎么来的？ | 今天的工作量乘以我们对每项任务的时间估算，是估算值。试点第一周会实际计时。 |
| 成本？ | 离线模式免费。开启 AI 后每条回复约 2 美分，按每班 9 条消息算，每月不到 5 美元。 |
| 未成年人隐私？ | 所有记录由规则写入，AI 不写任何成绩。没有聊天机器人直接和学生对话。调用 AI 前先隐去姓名。 |
| 创新点？ | 利用中心已经记录的信息：W 和 C 区分不会和粗心；空题的位置区分时间不够和不会做。 |
| 老师还要做什么？ | 批改试卷、说明空题原因、判断 Demo 是否通过、安排重考、批准每一条消息。 |
