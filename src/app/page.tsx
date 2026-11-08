"use client";

import { useCallback, useMemo, useState } from "react";
import TaskList from "@/components/TaskList";
import StatsPanel from "@/components/StatsPanel";
import Sidebar, { type View } from "@/components/Sidebar";
import { useAppState } from "@/lib/store";
import type { Task } from "@/lib/types";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "夜深了";
  if (h < 9) return "早上好";
  if (h < 12) return "上午好";
  if (h < 14) return "中午好";
  if (h < 18) return "下午好";
  return "晚上好";
}

export default function Home() {
  const [state, setState, hydrated] = useAppState();
  const [view, setView] = useState<View>("plan");

  const addTask = useCallback(
    (task: Task) => setState((s) => ({ ...s, tasks: [...s.tasks, task] })),
    [setState]
  );

  const toggleTask = useCallback(
    (id: string) =>
      setState((s) => ({
        ...s,
        tasks: s.tasks.map((t) =>
          t.id === id
            ? { ...t, done: !t.done, completedAt: !t.done ? Date.now() : undefined }
            : t
        ),
      })),
    [setState]
  );

  const deleteTask = useCallback(
    (id: string) => setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) })),
    [setState]
  );

  const pendingCount = useMemo(() => state.tasks.filter((t) => !t.done).length, [state.tasks]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-400">加载中…</p>
      </div>
    );
  }

  // 注意：必须在 hydrated 之后读取当前时间。
  // 开启 Cache Components 后，预渲染阶段读取 new Date() 会报错。
  const now = new Date();
  const dateLabel = `${now.getMonth() + 1}月${now.getDate()}日 星期${WEEKDAYS[now.getDay()]}`;

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar view={view} onChange={setView} pendingCount={pendingCount} />

      <div className="min-w-0 flex-1">
        {/* 移动端品牌栏 */}
        <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-sm text-white">🎯</span>
          <p className="text-sm font-bold text-slate-900">StudyFlow</p>
        </div>

        <main className="mx-auto max-w-4xl px-4 py-6 sm:px-8">
          {/* 页头 */}
          <header className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">
              {greeting()}，同学 👋
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              今天是 {dateLabel}
              {pendingCount > 0 ? `，还有 ${pendingCount} 个任务待完成` : "，任务已全部完成，太棒了！"}
            </p>
          </header>

          {view === "plan" ? (
            <TaskList tasks={state.tasks} onAdd={addTask} onToggle={toggleTask} onDelete={deleteTask} />
          ) : (
            <StatsPanel state={state} />
          )}
        </main>
      </div>
    </div>
  );
}
