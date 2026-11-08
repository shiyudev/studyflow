export type Priority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  subject: string;
  /** 预计花费小时数 */
  estimateHours: number;
  priority: Priority;
  done: boolean;
  deadline: string; // YYYY-MM-DD
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

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
