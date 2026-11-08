"use client";

import { useEffect, useState } from "react";
import { detectPriority } from "./priority";
import type { AppState, RepoFile, Task } from "./types";

const STORAGE_KEY = "studyflow-state-v1";

const initialState: AppState = { tasks: [], files: [] };

/** 兼容旧版本数据：补默认字段、剔除废弃字段（v0.5 的 notes 编辑器数据已废弃，自动忽略） */
function normalize(raw: unknown): AppState {
  if (!raw || typeof raw !== "object") return initialState;
  const tasks = Array.isArray((raw as { tasks?: unknown }).tasks)
    ? ((raw as { tasks: unknown[] }).tasks as Partial<Task>[])
    : [];
  const files = Array.isArray((raw as { files?: unknown }).files)
    ? ((raw as { files: unknown[] }).files as Partial<RepoFile>[])
    : [];
  return {
    files: files
      .filter((f) => f && typeof f.id === "string" && typeof f.name === "string")
      .map((f) => ({
        id: f.id as string,
        name: f.name as string,
        path: typeof f.path === "string" && f.path ? f.path : undefined,
        subject: typeof f.subject === "string" ? f.subject : "通用",
        mimeType: typeof f.mimeType === "string" ? f.mimeType : "",
        size: typeof f.size === "number" ? f.size : 0,
        createdAt: typeof f.createdAt === "number" ? f.createdAt : Date.now(),
      })),
    tasks: tasks
      .filter((t) => t && typeof t.id === "string" && typeof t.title === "string")
      .map((t) => ({
        id: t.id as string,
        title: t.title as string,
        subject: typeof t.subject === "string" ? t.subject : "通用",
        priority:
          t.priority === "low" || t.priority === "medium" || t.priority === "high"
            ? t.priority
            : detectPriority(t.title as string, (t.deadline as string) ?? ""),
        done: Boolean(t.done),
        deadline: typeof t.deadline === "string" ? t.deadline : "",
        deadlineTime:
          typeof t.deadlineTime === "string" && /^\d{2}:\d{2}$/.test(t.deadlineTime)
            ? t.deadlineTime
            : undefined,
        createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
        completedAt: typeof t.completedAt === "number" ? t.completedAt : undefined,
      })),
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
