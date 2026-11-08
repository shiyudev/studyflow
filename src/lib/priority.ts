import { daysUntil, type Priority } from "./types";

/** 高优先级信号词：考试、答辩、论文等硬 deadline 事项 */
const HIGH_KEYWORDS = [
  "考试", "期中", "期末", "考研", "答辩", "论文", "面试", "竞赛",
  "比赛", "提交", "截止", "ddl", "deadline", "exam", "quiz",
];

/** 中优先级信号词：作业、报告等常规任务 */
const MEDIUM_KEYWORDS = [
  "作业", "报告", "复习", "预习", "实验", "项目", "展示", "pre",
  "presentation", "homework", "assignment", "lab",
];

export const PRIORITY_META: Record<Priority, { label: string; badge: string; weight: number }> = {
  high: { label: "高", badge: "bg-rose-100 text-rose-700 ring-rose-200", weight: 0 },
  medium: { label: "中", badge: "bg-amber-100 text-amber-700 ring-amber-200", weight: 1 },
  low: { label: "低", badge: "bg-slate-100 text-slate-500 ring-slate-200", weight: 2 },
};

/**
 * 智能识别任务优先级。
 * 综合两个信号打分：
 *  1. 截止日远近（越近越紧急）
 *  2. 标题/科目关键词（考试、论文等 → 更重要）
 */
export function detectPriority(title: string, deadline: string): Priority {
  let score = 0;

  // 信号 1：截止日远近
  const days = daysUntil(deadline);
  if (days < 0) score += 4; // 已逾期，最高优先
  else if (days === 0) score += 4;
  else if (days === 1) score += 3;
  else if (days <= 3) score += 2;
  else if (days <= 7) score += 1;

  // 信号 2：关键词
  const text = title.toLowerCase();
  if (HIGH_KEYWORDS.some((k) => text.includes(k))) score += 2;
  else if (MEDIUM_KEYWORDS.some((k) => text.includes(k))) score += 1;

  if (score >= 4) return "high";
  if (score >= 2) return "medium";
  return "low";
}
