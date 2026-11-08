# StudyFlow 🎯

> 你的智能学习搭子 —— 校园黑客松参赛作品

一个帮学生管理学习计划的小网站：添加任务后自动识别重要程度（高/中/低），按紧急程度排序，并给出今日优先建议。

![StudyFlow](docs/screenshots/v0.4-dashboard-plan.png)

## ✨ 功能

- **智能优先级识别**：根据截止日远近 + 任务关键词（考试/论文/作业等）自动标注 高/中/低 优先级，录入时实时预览
- **学习计划管理**：任务标题、科目、截止日期（可选精确到几时几分）、完成勾选、删除
- **今日优先建议**：自动挑出最该先做的任务
- **学习仓库**：上传存放笔记文件（PDF / Markdown / 错题照片等），支持单文件与**整个文件夹**拖拽上传（保留目录结构）、科目分类、搜索、在线预览与下载，文件保存在浏览器 IndexedDB
- **数据统计**：待办数、完成率、24h 内截止提醒、优先级分布、近 7 天完成任务趋势
- **侧边栏仪表盘 UI**：桌面端侧边栏导航，移动端自适应
- **本地持久化**：数据保存在浏览器 localStorage，无需注册、无需后端

## 🛠 技术栈

- Next.js 16（App Router + Turbopack + Cache Components）
- React 19 + TypeScript
- Tailwind CSS 4

## 🚀 本地运行

```bash
npm install
npm run dev
```

打开 http://localhost:3000

## 📖 开发日志

完整迭代过程（v0.1 → v0.4，含每版截图与改动说明）见 [docs/DEVLOG.md](docs/DEVLOG.md)。

```bash
# 回看任意历史版本
git checkout v0.1   # MVP 初版（含番茄钟）
git checkout v0.2   # 智能优先级
git checkout v0.3   # 截止时间精确到分
git checkout v0.4   # 侧边栏仪表盘
git checkout v0.5   # 学习仓库-笔记模块
git checkout v0.6   # 学习仓库重做为文件仓库（当前）
npm run dev
```
