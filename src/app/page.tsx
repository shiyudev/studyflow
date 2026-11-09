"use client";

import { useCallback, useMemo, useState } from "react";
import TaskList from "@/components/TaskList";
import DailyCheckView from "@/components/DailyCheckView";
import PlanView from "@/components/PlanView";
import RepoView from "@/components/RepoView";
import Sidebar, { type View } from "@/components/Sidebar";
import Scene from "@/components/Scene";
import AsideQuote from "@/components/AsideQuote";
import { useSceneClock, greeting } from "@/hooks/useSceneClock";
import { useAppState } from "@/lib/store";
import { todayKey, uid, type CheckIn, type RepoFile, type Task } from "@/lib/types";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function fmtClock(min: number): string {
  return `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(Math.floor(min % 60)).padStart(2, "0")}`;
}

export default function Home() {
  const [state, setState, hydrated] = useAppState();
  const [view, setView] = useState<View>("plan");
  const clock = useSceneClock();

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
    // 预渲染阶段不得读取当前时间（Cache Components 约束），hydrated 前返回 0
    if (!hydrated) return 0;
    const today = todayKey();
    return state.tasks.filter(
      (t) => t.type === "daily" && !state.checkins.some((c) => c.taskId === t.id && c.date === today)
    ).length;
  }, [state.tasks, state.checkins, hydrated]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ color: "var(--faint)" }}>
        加载中…
      </div>
    );
  }

  // 注意：必须在 hydrated 之后读取当前时间（Cache Components 约束）。
  const now = new Date();
  const dateLabel = `${now.getMonth() + 1}月${now.getDate()}日 星期${WEEKDAYS[now.getDay()]}`;
  const [greet, flavor] = greeting(clock.minutes);
  const effectiveMin = clock.previewMin ?? clock.minutes;

  return (
    <>
      <Scene />
      <div className="app">
        <Sidebar
          view={view}
          onChange={setView}
          pendingCount={pendingCount}
          dailyUnchecked={dailyUnchecked}
          previewMin={clock.previewMin}
          ff={clock.ff}
          effectiveMin={effectiveMin}
          setPreview={clock.setPreview}
          toggleFF={clock.toggleFF}
        />

        <main className="main">
          {/* 顶栏 */}
          <header className="header">
            <div>
              <h1>{greet}</h1>
              <p className="flavor">{flavor}</p>
              <div className="chips">
                {pendingCount > 0 || dailyUnchecked > 0 ? (
                  <>
                    今天是 {dateLabel}，<b>{pendingCount}</b> 个作业待完成、<b>{dailyUnchecked}</b> 个每日任务未打卡
                  </>
                ) : (
                  <>今天是 {dateLabel}，任务已全部完成，太棒了！</>
                )}
              </div>
            </div>
            <div className="head-right">
              <div className="clock">{fmtClock(effectiveMin)}</div>
              <div className="phase-line">
                <span className="phase-badge kai">
                  {clock.isPreview ? `预览 · ${clock.phase}` : clock.phase}
                </span>
              </div>
              <div className="badges">
                <span>{clock.isPreview ? "预览中" : "跟随此刻"}</span>
              </div>
            </div>
          </header>

          <div className="views">
            {view === "plan" && (
              <PlanView
                plans={state.plans}
                dayNotes={state.dayNotes}
                onPlansChange={(plans) => setState((s) => ({ ...s, plans }))}
                onDayNotesChange={(dayNotes) => setState((s) => ({ ...s, dayNotes }))}
              />
            )}
            {view === "dailyTasks" && (
              <>
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
              </>
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
          </div>
        </main>

        <AsideQuote phase={clock.phase} />
      </div>
    </>
  );
}
