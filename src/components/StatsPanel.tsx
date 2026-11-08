"use client";

import { useMemo } from "react";
import { todayKey, type AppState } from "@/lib/types";

function minutesLabel(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} 分钟`;
  return `${Math.floor(m / 60)} 小时${m % 60 ? ` ${m % 60} 分` : ""}`;
}

export default function StatsPanel({ state }: { state: AppState }) {
  const { tasks, focusLog } = state;

  const stats = useMemo(() => {
    const today = todayKey();
    const todaySeconds = focusLog[today] ?? 0;
    const doneCount = tasks.filter((t) => t.done).length;

    // 连续学习天数：从今天往前数，focusLog 有记录才算
    let streak = 0;
    const d = new Date();
    // 今天还没学时，从昨天开始算也能保持连击展示
    if (!focusLog[todayKey(d)]) d.setDate(d.getDate() - 1);
    while (focusLog[todayKey(d)]) {
      streak++;
      d.setDate(d.getDate() - 1);
    }

    // 最近 7 天柱状图
    const week: { label: string; seconds: number; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      week.push({
        label: `${day.getMonth() + 1}/${day.getDate()}`,
        seconds: focusLog[todayKey(day)] ?? 0,
        isToday: i === 0,
      });
    }
    return { todaySeconds, doneCount, streak, week };
  }, [tasks, focusLog]);

  const maxSeconds = Math.max(1, ...stats.week.map((w) => w.seconds));

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">学习数据</h2>

      <div className="mb-6 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-rose-50 py-3">
          <p className="text-xl font-bold text-rose-600">{minutesLabel(stats.todaySeconds)}</p>
          <p className="mt-1 text-xs text-slate-500">今日专注</p>
        </div>
        <div className="rounded-xl bg-indigo-50 py-3">
          <p className="text-xl font-bold text-indigo-600">
            {stats.doneCount}
            <span className="text-sm font-normal text-slate-400">/{tasks.length}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">完成任务</p>
        </div>
        <div className="rounded-xl bg-emerald-50 py-3">
          <p className="text-xl font-bold text-emerald-600">{stats.streak} 天</p>
          <p className="mt-1 text-xs text-slate-500">连续学习</p>
        </div>
      </div>

      <p className="mb-2 text-xs font-medium text-slate-500">近 7 天专注时长</p>
      <div className="flex h-28 items-end gap-2">
        {stats.week.map((w) => (
          <div key={w.label} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`w-full rounded-t-md transition-all ${w.isToday ? "bg-rose-400" : "bg-indigo-300"}`}
              style={{ height: `${Math.max(w.seconds > 0 ? 8 : 2, (w.seconds / maxSeconds) * 88)}px` }}
              title={minutesLabel(w.seconds)}
            />
            <span className={`text-[10px] ${w.isToday ? "font-semibold text-rose-600" : "text-slate-400"}`}>
              {w.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
