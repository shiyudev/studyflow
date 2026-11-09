"use client";

import { useMemo } from "react";
import { PRIORITY_META } from "@/lib/priority";
import { daysUntil, formatDeadline, todayKey, type CheckIn, type Task } from "@/lib/types";
import type { View } from "./Sidebar";

interface Props {
  tasks: Task[];
  checkins: CheckIn[];
  /** 每日任务快速打卡 */
  onToggleDaily: (taskId: string, done: boolean) => void;
  /** 作业任务快速完成 */
  onToggle: (id: string) => void;
  /** 跳转到对应管理页 */
  onNavigate: (view: View) => void;
}

const SUBJECT_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-pink-100 text-pink-700",
  "bg-cyan-100 text-cyan-700",
];

function subjectColor(subject: string): string {
  let h = 0;
  for (const ch of subject) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return SUBJECT_COLORS[h % SUBJECT_COLORS.length];
}

export default function PlanOverview({ tasks, checkins, onToggleDaily, onToggle, onNavigate }: Props) {
  const today = todayKey();

  const dailyTasks = useMemo(() => tasks.filter((t) => t.type === "daily"), [tasks]);
  const homework = useMemo(() => tasks.filter((t) => t.type !== "daily"), [tasks]);

  const pendingHomework = useMemo(
    () =>
      homework
        .filter((t) => !t.done)
        .sort((a, b) => {
          const w = PRIORITY_META[a.priority].weight - PRIORITY_META[b.priority].weight;
          if (w !== 0) return w;
          return daysUntil(a.deadline) - daysUntil(b.deadline);
        }),
    [homework]
  );
  const doneHomework = homework.filter((t) => t.done);
  const overdueCount = pendingHomework.filter((t) => daysUntil(t.deadline) < 0).length;

  const todayCheckIn = (taskId: string) =>
    checkins.find((c) => c.taskId === taskId && c.date === today);
  const dailyDoneCount = dailyTasks.filter((t) => todayCheckIn(t.id)?.status === "done").length;

  // 各每日任务的连续天数（取最大值展示）
  function streakOf(taskId: string): number {
    const dates = new Set(
      checkins.filter((c) => c.taskId === taskId && c.status === "done").map((c) => c.date)
    );
    let n = 0;
    const d = new Date();
    if (!dates.has(todayKey(d))) d.setDate(d.getDate() - 1);
    while (dates.has(todayKey(d))) {
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }
  const bestStreak = dailyTasks.reduce((m, t) => Math.max(m, streakOf(t.id)), 0);

  return (
    <div className="space-y-4">
      {/* 汇总指标 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-xl font-bold text-emerald-600">{dailyDoneCount}/{dailyTasks.length}</p>
          <p className="mt-0.5 text-xs text-slate-400">今日打卡</p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-xl font-bold text-indigo-600">{pendingHomework.length}</p>
          <p className="mt-0.5 text-xs text-slate-400">待完成作业</p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm ring-1 ring-slate-200">
          <p className={`text-xl font-bold ${overdueCount > 0 ? "text-rose-500" : "text-slate-300"}`}>{overdueCount}</p>
          <p className="mt-0.5 text-xs text-slate-400">逾期</p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-xl font-bold text-orange-500">{bestStreak > 0 ? `🔥${bestStreak}` : "—"}</p>
          <p className="mt-0.5 text-xs text-slate-400">最长连续(天)</p>
        </div>
      </div>

      {/* 每日任务·今天 */}
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">🔁 每日任务 · 今天</h2>
          <button onClick={() => onNavigate("dailyTasks")} className="text-xs text-indigo-500 hover:underline">
            去打卡/管理 →
          </button>
        </div>
        {dailyTasks.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">还没有每日任务</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {dailyTasks.map((t) => {
              const ci = todayCheckIn(t.id);
              const done = ci?.status === "done";
              const streak = streakOf(t.id);
              return (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <span className="text-base">{done ? "✅" : ci?.status === "missed" ? "❌" : "⭕"}</span>
                  <span className={`min-w-0 flex-1 truncate text-sm ${done ? "text-slate-400 line-through" : "text-slate-800"}`}>
                    {t.title}
                  </span>
                  {streak > 0 && <span className="text-xs text-orange-500">🔥{streak}</span>}
                  {!ci && (
                    <button
                      onClick={() => onToggleDaily(t.id, true)}
                      className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      打卡
                    </button>
                  )}
                  {ci && (
                    <button
                      onClick={() => onToggleDaily(t.id, false)}
                      className="text-xs text-slate-300 hover:text-slate-500"
                      title="撤销打卡"
                    >
                      撤销
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 作业任务·待完成 */}
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">📝 作业任务 · 待完成</h2>
          <button onClick={() => onNavigate("homeworkTasks")} className="text-xs text-indigo-500 hover:underline">
            去管理 →
          </button>
        </div>
        {pendingHomework.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">
            作业全部完成{doneHomework.length > 0 ? `（共 ${doneHomework.length} 项）` : ""}，太棒了 🎉
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pendingHomework.map((t) => {
              const d = daysUntil(t.deadline);
              const pmeta = PRIORITY_META[t.priority];
              return (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => onToggle(t.id)}
                    className="h-4 w-4 accent-indigo-600"
                    title="完成"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-800">{t.title}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className={`rounded-full px-2 py-0.5 font-medium ring-1 ${pmeta.badge}`}>{pmeta.label}</span>
                      <span className={`rounded-full px-2 py-0.5 font-medium ${subjectColor(t.subject)}`}>{t.subject}</span>
                      <span className={d <= 0 ? "font-medium text-rose-600" : "text-slate-400"}>
                        {d < 0 ? `已逾期 ${-d} 天` : d === 0 ? "今天截止" : `${d} 天后 · ${formatDeadline(t)}`}
                      </span>
                      {t.attachments.length > 0 && <span className="text-slate-400">📎{t.attachments.length}</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {doneHomework.length > 0 && pendingHomework.length > 0 && (
          <p className="mt-3 border-t border-slate-100 pt-2 text-right text-xs text-slate-400">
            已完成 {doneHomework.length} 项
          </p>
        )}
      </section>
    </div>
  );
}
