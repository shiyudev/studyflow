export type Priority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  subject: string;
  priority: Priority;
  done: boolean;
  /** 截止日期 YYYY-MM-DD */
  deadline: string;
  /** 可选：截止时刻 HH:mm，不填则只精确到日 */
  deadlineTime?: string;
  createdAt: number;
  completedAt?: number;
}

export interface AppState {
  tasks: Task[];
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
