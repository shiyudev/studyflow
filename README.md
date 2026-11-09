# StudyFlow 🎯

> 你的智能学习搭子 —— 校园黑客松参赛作品

一个帮学生管理学习计划的小网站：添加任务后自动识别重要程度（高/中/低），按紧急程度排序，并给出今日优先建议。

![StudyFlow](docs/screenshots/v0.8-plan-homework.png)

## ✨ 功能

- **任务分类**：🔁 每日任务（固定每天做，一次添加天天打卡）＋ 📝 作业任务（按截止日期管理），侧边栏各自独立成页
- **每日打卡（与任务同页）**：今天做没做都要记录——没做必填反思，完成也能写心得 + **自填用时**（分钟）；14 天日期记录表 + 连续打卡天数
- **任务附件**：作业内容（文本）、提交网址、文件（PDF 等）直接挂在任务上，云端存储随取随用
- **智能优先级识别**：根据截止日远近 + 任务关键词（考试/论文/作业等）自动标注 高/中/低 优先级，录入时实时预览
- **今日优先建议**：自动挑出最该先做的任务
- **学习仓库**：上传存放笔记文件（PDF / Markdown / 错题照片等），支持单文件与**整个文件夹**拖拽上传（保留目录结构）、科目分类、搜索、在线预览与下载
- **云端同步**：任务与文件实时同步 Supabase 云端，清缓存、换设备数据不丢；本地优先策略，断网也能正常用
- **侧边栏仪表盘 UI**：桌面端侧边栏导航，移动端自适应

## 🛠 技术栈

- Next.js 16（App Router + Turbopack + Cache Components）
- React 19 + TypeScript
- Tailwind CSS 4
- Supabase（PostgreSQL + Storage，云端持久化）

## 🚀 本地运行

```bash
npm install
# 配置云端后端（可选，不配置则退化为纯本地模式）：
# 1. 在 Supabase 控制台 SQL Editor 执行 docs/supabase-setup.sql
# 2. 新建 .env.local，填入：
#    NEXT_PUBLIC_SUPABASE_URL=你的项目URL
#    NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon key
npm run dev
```

打开 http://localhost:3000

## 📖 开发日志

完整迭代过程（v0.1 → v0.7，含每版截图与改动说明）见 [docs/DEVLOG.md](docs/DEVLOG.md)。

```bash
# 回看任意历史版本
git checkout v0.1   # MVP 初版（含番茄钟）
git checkout v0.2   # 智能优先级
git checkout v0.3   # 截止时间精确到分
git checkout v0.4   # 侧边栏仪表盘
git checkout v0.5   # 学习仓库-笔记模块
git checkout v0.6   # 学习仓库重做为文件仓库
git checkout v0.7   # 接入 Supabase 云端后端
git checkout v0.8   # 任务分类 + 打卡反馈 + 任务附件（当前）
npm run dev
```
