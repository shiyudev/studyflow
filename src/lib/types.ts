export type Priority = "low" | "medium" | "high";

/** 任务分类：daily=每日固定任务（不用每天添加）/ homework=作业任务（按截止日期添加） */
export type TaskType = "daily" | "homework";

/** 任务附件：作业内容文本、网址、文件一起存放在任务上 */
export interface Attachment {
  id: string;
  kind: "text" | "link" | "file";
  /** 显示名：文本的标题、链接的标题、文件的文件名 */
  name: string;
  /** kind=text 时的内容 */
  text?: string;
  /** kind=link 时的网址 */
  url?: string;
  /** kind=file 时 Supabase Storage 中的对象 id */
  fileId?: string;
  createdAt: number;
}

export interface Task {
  id: string;
  title: string;
  subject: string;
  priority: Priority;
  /** 任务分类，默认 homework（旧数据迁移） */
  type: TaskType;
  done: boolean;
  /** 截止日期 YYYY-MM-DD；每日任务可为空 */
  deadline: string;
  /** 可选：截止时刻 HH:mm，不填则只精确到日 */
  deadlineTime?: string;
  attachments: Attachment[];
  createdAt: number;
  completedAt?: number;
}

/** 打卡/完成记录：做与没做都记录（同一任务同一天最多一条） */
export interface CheckIn {
  id: string;
  taskId: string;
  /** 记录日期 YYYY-MM-DD */
  date: string;
  /** done=已完成 / missed=没做 */
  status: "done" | "missed";
  /** 反思原因（没做）/ 完成情况备注（完成），可编辑 */
  reason?: string;
  /** 完成用时（分钟，用户自填） */
  duration?: number;
  /** 系统记录时间戳 */
  createdAt: number;
}

/** 学习仓库中的文件元信息；文件内容（Blob）存放在 IndexedDB */
export interface RepoFile {
  id: string;
  /** 原始文件名（不含目录） */
  name: string;
  /** 相对路径，如 "高数笔记/第三章.md"；单文件上传时为空 */
  path?: string;
  subject: string;
  mimeType: string;
  /** 字节数 */
  size: number;
  createdAt: number;
}

/** 计划条目：daily=某日的详细计划 / longterm=围绕某件事的长期计划 */
export interface PlanItem {
  id: string;
  type: "daily" | "longterm";
  /** daily：计划日期 YYYY-MM-DD */
  date?: string;
  /** daily：可选时段 HH:mm */
  time?: string;
  /** longterm：计划标题（如「期末数学复习」） */
  title?: string;
  /** daily：计划内容 / longterm：详细内容 */
  content: string;
  /** longterm：起止日期 */
  startDate?: string;
  endDate?: string;
  /** daily：完成勾选 / longterm：已达成 */
  done: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AppState {
  tasks: Task[];
  files: RepoFile[];
  checkins: CheckIn[];
  plans: PlanItem[];
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysUntil(deadline: string, from = new Date()): number {
  const base = new Date(todayKey(from));
  const due = new Date(deadline);
  return Math.round((due.getTime() - base.getTime()) / 86400000);
}

/** 格式化截止时间展示：有时刻则「X月X日 HH:mm」，否则只到日 */
export function formatDeadline(task: Pick<Task, "deadline" | "deadlineTime">): string {
  const [, m, d] = task.deadline.split("-");
  const datePart = `${Number(m)}月${Number(d)}日`;
  return task.deadlineTime ? `${datePart} ${task.deadlineTime}` : datePart;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
