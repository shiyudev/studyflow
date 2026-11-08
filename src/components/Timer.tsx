"use client";

import { useEffect, useRef, useState } from "react";
import { BREAK_MINUTES, FOCUS_MINUTES, type Task } from "@/lib/types";

type Phase = "focus" | "break";

interface Props {
  tasks: Task[];
  onFocusComplete: (taskId: string | null, seconds: number) => void;
}

function format(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Timer({ tasks, onFocusComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("focus");
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_MINUTES * 60);
  const [running, setRunning] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [sessionsDone, setSessionsDone] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeTasks = tasks.filter((t) => !t.done);
  const totalSeconds = (phase === "focus" ? FOCUS_MINUTES : BREAK_MINUTES) * 60;
  const progress = 1 - secondsLeft / totalSeconds;

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  // 倒计时结束处理
  useEffect(() => {
    if (secondsLeft !== 0) return;
    setRunning(false);
    if (phase === "focus") {
      onFocusComplete(selectedTaskId || null, FOCUS_MINUTES * 60);
      setSessionsDone((n) => n + 1);
      setPhase("break");
      setSecondsLeft(BREAK_MINUTES * 60);
      notify("专注完成！", "休息 5 分钟，喝口水活动一下。");
    } else {
      setPhase("focus");
      setSecondsLeft(FOCUS_MINUTES * 60);
      notify("休息结束", "开始下一个番茄钟吧！");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  function notify(title: string, body: string) {
    try {
      new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU").play().catch(() => {});
    } catch { /* 忽略 */ }
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  }

  function reset() {
    setRunning(false);
    setSecondsLeft(totalSeconds);
  }

  const R = 90;
  const C = 2 * Math.PI * R;

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">专注计时器</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            phase === "focus" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {phase === "focus" ? `专注中 · 第 ${sessionsDone + 1} 个番茄` : "休息时间"}
        </span>
      </div>

      <div className="flex flex-col items-center gap-5">
        <div className="relative h-52 w-52">
          <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
            <circle cx="100" cy="100" r={R} fill="none" stroke="#e2e8f0" strokeWidth="10" />
            <circle
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke={phase === "focus" ? "#f43f5e" : "#10b981"}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-5xl font-bold tabular-nums text-slate-800">
              {format(secondsLeft)}
            </span>
          </div>
        </div>

        <select
          value={selectedTaskId}
          onChange={(e) => setSelectedTaskId(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-rose-400 focus:outline-none"
        >
          <option value="">不关联任务，自由专注</option>
          {activeTasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}（{t.subject}）
            </option>
          ))}
        </select>

        <div className="flex gap-3">
          <button
            onClick={() => setRunning((r) => !r)}
            className={`rounded-lg px-8 py-2.5 text-sm font-semibold text-white transition-colors ${
              running ? "bg-amber-500 hover:bg-amber-600" : "bg-rose-500 hover:bg-rose-600"
            }`}
          >
            {running ? "暂停" : "开始"}
          </button>
          <button
            onClick={reset}
            className="rounded-lg bg-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-300"
          >
            重置
          </button>
        </div>
      </div>
    </section>
  );
}
