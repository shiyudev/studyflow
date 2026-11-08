"use client";

import { useCallback } from "react";
import TaskList from "@/components/TaskList";
import StatsPanel from "@/components/StatsPanel";
import { useAppState } from "@/lib/store";
import type { Task } from "@/lib/types";

export default function Home() {
  const [state, setState, hydrated] = useAppState();

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

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-400">加载中…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">StudyFlow</h1>
              <p className="text-xs text-slate-400">你的智能学习搭子</p>
            </div>
          </div>
          <span className="text-xs text-slate-400">数据保存在本地浏览器</span>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <TaskList tasks={state.tasks} onAdd={addTask} onToggle={toggleTask} onDelete={deleteTask} />
        </div>
        <div className="space-y-6">
          <StatsPanel state={state} />
        </div>
      </main>
    </div>
  );
}
