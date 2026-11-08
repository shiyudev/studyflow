"use client";

import { useEffect, useState } from "react";
import { detectPriority } from "./priority";
import type { AppState, Task } from "./types";

const STORAGE_KEY = "studyflow-state-v1";

const initialState: AppState = { tasks: [] };

/** 兼容旧版本数据：补默认字段、剔除废弃字段 */
function normalize(raw: unknown): AppState {
  if (!raw || typeof raw !== "object") return initialState;
  const tasks = Array.isArray((raw as { tasks?: unknown }).tasks)
    ? ((raw as { tasks: unknown[] }).tasks as Partial<Task & { estimate?: number }>[])
    : [];
  return {
    tasks: tasks
      .filter((t) => t && typeof t.id === "string" && typeof t.title === "string")
      .map((t) => {
        const estimateHours =
          typeof t.estimateHours === "number" && t.estimateHours > 0
            ? t.estimateHours
            : Math.max(1, Math.round(((t.estimate ?? 2) as number) * 0.5));
        return {
          id: t.id as string,
          title: t.title as string,
          subject: typeof t.subject === "string" ? t.subject : "通用",
          estimateHours,
          priority:
            t.priority === "low" || t.priority === "medium" || t.priority === "high"
              ? t.priority
              : detectPriority(t.title as string, (t.deadline as string) ?? "", estimateHours),
          done: Boolean(t.done),
          deadline: typeof t.deadline === "string" ? t.deadline : "",
          createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
          completedAt: typeof t.completedAt === "number" ? t.completedAt : undefined,
        };
      }),
  };
}

/**
 * 把应用状态持久化到 localStorage。
 * 黑客松 MVP 阶段不接后端，刷新/重开页面数据不丢。
 */
export function useAppState(): [AppState, React.Dispatch<React.SetStateAction<AppState>>, boolean] {
  const [state, setState] = useState<AppState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setState(normalize(JSON.parse(raw)));
      }
    } catch {
      // 忽略损坏数据
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  return [state, setState, hydrated];
}
