"use client";

import { useCallback, useMemo, useState } from "react";
import TaskList from "@/components/TaskList";
import DailyCheckView from "@/components/DailyCheckView";
import PlanView from "@/components/PlanView";
import RepoView from "@/components/RepoView";
import Sidebar, { type View } from "@/components/Sidebar";
import { useAppState } from "@/lib/store";
import { todayKey, uid, type CheckIn, type RepoFile, type Task } from "@/lib/types";

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
      setState((s) => {
        const task = s.tasks.find((t) => t.id === id);
        if (!task) return s;
        const done = !task.done;
        const today = todayKey();
        // 完成时同时写一条 done 打卡记录（完成情况/时间可追溯；备注可在反馈页补写）
        let checkins = s.checkins;
        if (done) {
          checkins = [
            ...checkins.filter((c) => !(c.taskId === id && c.date === today && c.status === "done")),
            { id: uid(), taskId: id, date: today, status: "done" as const, createdAt: Date.now() },
          ];
        } else {
          checkins = checkins.filter((c) => !(c.taskId === id && c.status === "done"));
        }
        return {
          ...s,
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, done, completedAt: done ? Date.now() : undefined } : t
          ),
          checkins,
        };
      }),
    [setState]
  );

  const deleteTask = useCallback(
    (id: string) =>
      setState((s) => ({
        ...s,
        tasks: s.tasks.filter((t) => t.id !== id),
        // 连带清理该任务的打卡记录
        checkins: s.checkins.filter((c) => c.taskId !== id),
      })),
    [setState]
  );

  const updateTask = useCallback(
    (task: Task) =>
      setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === task.id ? task : t)) })),
    [setState]
  );

  /** 打卡/记录：同一任务同一天覆盖旧记录；可带反思/备注与用时（分钟） */
  const recordCheckIn = useCallback(
    (taskId: string, date: string, status: "done" | "missed", reason?: string, duration?: number) =>
      setState((s) => {
        const next: CheckIn = { id: uid(), taskId, date, status, reason, duration, createdAt: Date.now() };
        return {
          ...s,
          checkins: [...s.checkins.filter((c) => !(c.taskId === taskId && c.date === date)), next],
        };
      }),
    [setState]
  );

  const removeCheckIn = useCallback(
    (taskId: string, date: string) =>
      setState((s) => ({
        ...s,
        checkins: s.checkins.filter((c) => !(c.taskId === taskId && c.date === date)),
      })),
    [setState]
  );

  /** 学习计划里每日任务的勾选 = 今天的打卡记录 */
  const toggleDaily = useCallback(
    (taskId: string, done: boolean) => {
      const today = todayKey();
      if (done) recordCheckIn(taskId, today, "done");
      else removeCheckIn(taskId, today);
    },
    [recordCheckIn, removeCheckIn]
  );

  const setFiles = useCallback(
    (files: RepoFile[]) => setState((s) => ({ ...s, files })),
    [setState]
  );

  const pendingCount = useMemo(
    () => state.tasks.filter((t) => t.type !== "daily" && !t.done).length,
    [state.tasks]
  );

  const dailyUnchecked = useMemo(() => {
    const today = todayKey();
    return state.tasks.filter(
      (t) => t.type === "daily" && !state.checkins.some((c) => c.taskId === t.id && c.date === today)
    ).length;
  }, [state.tasks, state.checkins]);

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
      <Sidebar
        view={view}
        onChange={setView}
        pendingCount={pendingCount}
        dailyUnchecked={dailyUnchecked}
      />

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
              {pendingCount > 0 || dailyUnchecked > 0
                ? `，${pendingCount} 个作业待完成、${dailyUnchecked} 个每日任务未打卡`
                : "，任务已全部完成，太棒了！"}
            </p>
          </header>

          {view === "plan" && (
            <PlanView
              plans={state.plans}
              onChange={(plans) => setState((s) => ({ ...s, plans }))}
            />
          )}
          {view === "dailyTasks" && (
            <div className="space-y-4">
              <TaskList
                type="daily"
                tasks={state.tasks}
                checkins={state.checkins}
                onAdd={addTask}
                onToggle={toggleTask}
                onToggleDaily={toggleDaily}
                onDelete={deleteTask}
                onUpdateTask={updateTask}
              />
              <DailyCheckView
                tasks={state.tasks.filter((t) => t.type === "daily")}
                checkins={state.checkins}
                onRecord={recordCheckIn}
                onRemove={removeCheckIn}
              />
            </div>
          )}
          {view === "homeworkTasks" && (
            <TaskList
              type="homework"
              tasks={state.tasks}
              checkins={state.checkins}
              onAdd={addTask}
              onToggle={toggleTask}
              onToggleDaily={toggleDaily}
              onDelete={deleteTask}
              onUpdateTask={updateTask}
            />
          )}
          {view === "repo" && <RepoView files={state.files} onChange={setFiles} />}
        </main>
      </div>
    </div>
  );
}
