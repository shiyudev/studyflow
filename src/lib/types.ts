export interface Task {
  id: string;
  title: string;
  subject: string;
  /** 预计需要的番茄钟个数 */
  estimate: number;
  /** 已完成的番茄钟个数 */
  donePomodoros: number;
  /** 累计专注秒数 */
  focusSeconds: number;
  done: boolean;
  deadline: string; // YYYY-MM-DD
  createdAt: number;
  completedAt?: number;
}

export interface FocusLog {
  /** YYYY-MM-DD -> 当天专注秒数 */
  [date: string]: number;
}

export interface AppState {
  tasks: Task[];
  focusLog: FocusLog;
}

export const FOCUS_MINUTES = 25;
export const BREAK_MINUTES = 5;

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
