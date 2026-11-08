"use client";

import { useMemo } from "react";
import { PRIORITY_META } from "@/lib/priority";
import { daysUntil, todayKey, type AppState, type Priority } from "@/lib/types";

export default function StatsPanel({ state }: { state: AppState }) {
  const { tasks } = state;

  const stats = useMemo(() => {
    const active = tasks.filter((t) => !t.done);
    const doneCount = tasks.length - active.length;
    const rate = tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100);

    const byPriority: Record<Priority, number> = { high: 0, medium: 0, low: 0 };
    for (const t of active) byPriority[t.priority]++;

    const dueSoon = active.filter((t) => daysUntil(t.deadline) <= 1).length;

    // 近 7 天每天完成的任务数（按 completedAt）
    const week: { label: string; count: number; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const key = todayKey(day);
      week.push({
        label: `${day.getMonth() + 1}/${day.getDate()}`,
        count: tasks.filter((t) => t.done && t.completedAt && todayKey(new Date(t.completedAt)) === key).length,
        isToday: i === 0,
      });
    }
    return { active: active.length, doneCount, rate, byPriority, dueSoon, week };
  }, [tasks]);

  const maxCount = Math.max(1, ...stats.week.map((w) => w.count));

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">学习数据</h2>

      <div className="mb-5 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-indigo-50 py-3">
          <p className="text-xl font-bold text-indigo-600">{stats.active}</p>
          <p className="mt-1 text-xs text-slate-500">待办任务</p>
        </div>
        <div className="rounded-xl bg-emerald-50 py-3">
          <p className="text-xl font-bold text-emerald-600">{stats.rate}%</p>
          <p className="mt-1 text-xs text-slate-500">完成率</p>
        </div>
        <div className="rounded-xl bg-rose-50 py-3">
          <p className="text-xl font-bold text-rose-600">{stats.dueSoon}</p>
          <p className="mt-1 text-xs text-slate-500">24h 内截止</p>
        </div>
      </div>

      {/* 待办任务优先级分布 */}
      <p className="mb-2 text-xs font-medium text-slate-500">待办优先级分布</p>
      <div className="mb-5 flex gap-2">
        {(Object.keys(PRIORITY_META) as Priority[]).map((p) => (
          <div
            key={p}
            className={`flex-1 rounded-lg py-2 text-center ring-1 ${PRIORITY_META[p].badge}`}
          >
            <p className="text-base font-bold">{stats.byPriority[p]}</p>
            <p className="text-[10px]">{PRIORITY_META[p].label}优先级</p>
          </div>
        ))}
      </div>

      <p className="mb-2 text-xs font-medium text-slate-500">近 7 天完成任务数</p>
      <div className="flex h-28 items-end gap-2">
        {stats.week.map((w) => (
          <div key={w.label} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`w-full rounded-t-md transition-all ${w.isToday ? "bg-emerald-400" : "bg-indigo-300"}`}
              style={{ height: `${Math.max(w.count > 0 ? 8 : 2, (w.count / maxCount) * 88)}px` }}
              title={`${w.count} 个任务`}
            />
            <span className={`text-[10px] ${w.isToday ? "font-semibold text-emerald-600" : "text-slate-400"}`}>
              {w.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
