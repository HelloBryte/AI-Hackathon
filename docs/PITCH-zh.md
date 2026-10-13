# 中英对照讲稿（排练用）

上台说英文，中文帮你理解意思。句子都很短，慢慢说就好。点击步骤和英文版 [PITCH.md](PITCH.md) 完全一样。

---

## 0:00-0:30 · 问题（Overview 页面，不用点）

> Our tutor works five hours a day.

我们的辅导老师每天工作五小时。

> She answers WeChat, in English and Chinese. And she types every marked test into three spreadsheets. When she retypes, the difference between W and C gets lost: a real gap, or a careless slip.

她要用中英文回复微信，还要把每份批改好的试卷录入三张表格。重新录入的时候，W 和 C 的区别就丢了：到底是真的不会，还是粗心。

> ShiftMate fixes this. Rules write the records. AI reads messages and drafts replies. The tutor decides.

ShiftMate 解决这个问题：记录由规则来写，AI 负责读消息、起草回复，决定由老师来做。

> Let me be the tutor.

我来扮演一下老师。

---

## 0:30-1:20 · 场景一：一份试卷（Mark once）

**点左侧菜单 Mark once，再点 Fill demo marks。**

> This is the Exhibit 1 test. I enter the marks once.

这就是附件 1 里的那份试卷。我只录入一次分数。

用鼠标依次指：红色 **W** 标签、黄色 **C** 标签、"Why was it left blank?"。

> Question 2 is W, so that topic goes down. Question 7 is C, a careless slip, so it stays. Question 8 is blank, so it asks me why.

第 2 题是 W（做错），所以这个知识点降级。第 7 题是 C，粗心，所以不变。第 8 题空着，所以系统问我原因。

**点 Didn't know how to start。**

> It suggests a next step. I decide.

系统会建议下一步，由我来决定。

**点 Apply to all three sheets。**

> One click updates all three sheets, and writes a note for his mum, in Chinese.

点一下就更新了三张表，还用中文给他妈妈写好了一条通知。

---

## 1:20-1:50 · 场景二：一条消息（WeChat inbox）

**点左侧菜单 WeChat inbox，再点 Norton Cheng**，用鼠标指黄色那行"下周四"。

> Norton mixes Chinese and English. It suggests a Q&A booking. "下周四" is only a guess, so the date stays unticked, and the reply asks him to check.

Norton 的消息中英混合。系统建议给他约一次答疑。"下周四"只是推测，所以日期默认不勾选，回复里请他确认。

**点 Approve, apply and copy reply。**

> I approve, and paste it into WeChat.

我批准后，粘贴到微信里发出去。

---

## 1:50-2:00 · 日报（Daily report）

**点左侧菜单 Daily report。**

> The daily report counts my work by itself.

日报会自动统计我做的工作。

---

## 2:00-2:30 · 效果和安全（Impact and safety）

**点左侧菜单 Impact and safety**，指 "~65 min"。

> We estimate it saves about 65 minutes per shift. You can change every number here.

我们估算每个班大约能省 65 分钟。这里每个数字都可以改。

> It uses the same three sheets, and copy and paste into WeChat. AI is optional, and student names are hidden. Tonight it runs offline, so it does not need Wi-Fi.

它用的还是原来那三张表，回复复制粘贴到微信就行。AI 是可选的，学生姓名会被隐藏。今晚完全离线运行，不需要网络。

---

## 2:30 · 结尾

> Mark once. Reply once. Teach more. Thank you.

批改一次，回复一次，多教一点。谢谢。

---

## 问答速查（用英文回答，英文原句见 PITCH.md 的 Q&A prep 表格）

| 评委可能问 | 意思 |
|---|---|
| Where is the AI? | AI 读微信消息并起草回复，基于 Claude API，用模拟回复测试过，还没真实上线。今晚特意离线，离线引擎本身能处理中英文。 |
| What does the AI see? | 消息本身，加上这个学生记录里的一小段信息：今天的课、最近的成绩、进度、近期的 SAC。学生、家长、学校的名字会先被替换。 |
| What if the AI is wrong? | 每条回复都要老师批准。出现记录里没有的百分比会被标出来。回复里还提到老师没勾选的操作时，关键词检查会拦下批准。推测出的日期默认不勾选。 |
| Why not let AI mark? | 批改手写数学题需要老师判断。我们自动化的是批改之后的事：录三遍和分析。 |
| Their spreadsheets? | 附件 1 和 3 按同样的列导出，附件 2 每个知识点导出一行。Google Sheets 插件用仿照附件的表格，写入前先检查布局。还没在真实的 Google 表格里运行过。 |
| Work WeChat? | 试点阶段复制粘贴。"Approved"表示老师已批准并复制，发送人仍是老师。 |
| Where does 65 come from? | 今天的工作量乘以我们对每项任务的时间估算，包括行政工作和部分备课。试点第一周会实际计时。 |
| Cost? | 离线免费。开 AI 每条回复约 2 美分，每班 9 条，每月不到 5 美元。 |
| Privacy for minors? | 所有记录由规则写入，AI 不写成绩。没有聊天机器人和学生对话。调用 AI 前先替换姓名。 |
| What's new? | 批改表上本来就有 W 和 C，我们把它带进进度表：W 是不会，C 是粗心。空题的位置能区分时间不够和不会做。 |
| What does the tutor still do? | 批改、说明空题原因、判断 Demo 是否通过、安排重考、批准每条消息。 |
| What next? | 在中心真实的表格里运行插件，用真实消息测试 AI 草稿，给每项任务计时。 |
