"use client";

import { useEffect, useRef, useState } from "react";
import { detectPriority } from "./priority";
import { fetchRemoteState, pushRemoteState } from "./remote";
import { hasBackend } from "./supabase";
import type { AppState, Attachment, CheckIn, RepoFile, Task } from "./types";

const STORAGE_KEY = "studyflow-state-v1";

const initialState: AppState = { tasks: [], files: [], checkins: [] };

/** 兼容旧版本数据：补默认字段、剔除废弃字段（v0.5 的 notes 编辑器数据已废弃，自动忽略） */
function normalize(raw: unknown): AppState {
  if (!raw || typeof raw !== "object") return initialState;
  const tasks = Array.isArray((raw as { tasks?: unknown }).tasks)
    ? ((raw as { tasks: unknown[] }).tasks as Partial<Task>[])
    : [];
  const files = Array.isArray((raw as { files?: unknown }).files)
    ? ((raw as { files: unknown[] }).files as Partial<RepoFile>[])
    : [];
  const checkins = Array.isArray((raw as { checkins?: unknown }).checkins)
    ? ((raw as { checkins: unknown[] }).checkins as Partial<CheckIn>[])
    : [];
  return {
    checkins: checkins
      .filter(
        (c) =>
          c &&
          typeof c.id === "string" &&
          typeof c.taskId === "string" &&
          typeof c.date === "string" &&
          (c.status === "done" || c.status === "missed")
      )
      .map((c) => ({
        id: c.id as string,
        taskId: c.taskId as string,
        date: c.date as string,
        status: c.status as "done" | "missed",
        reason: typeof c.reason === "string" && c.reason ? c.reason : undefined,
        duration:
          typeof c.duration === "number" && c.duration > 0 ? c.duration : undefined,
        createdAt: typeof c.createdAt === "number" ? c.createdAt : Date.now(),
      })),
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
        type: t.type === "daily" ? "daily" : "homework",
        deadline: typeof t.deadline === "string" ? t.deadline : "",
        deadlineTime:
          typeof t.deadlineTime === "string" && /^\d{2}:\d{2}$/.test(t.deadlineTime)
            ? t.deadlineTime
            : undefined,
        attachments: Array.isArray(t.attachments)
          ? (t.attachments as Partial<Attachment>[])
              .filter((a) => a && typeof a.id === "string" && typeof a.name === "string")
              .map((a) => ({
                id: a.id as string,
                kind:
                  a.kind === "text" || a.kind === "link" || a.kind === "file"
                    ? a.kind
                    : ("text" as const),
                name: a.name as string,
                text: typeof a.text === "string" ? a.text : undefined,
                url: typeof a.url === "string" ? a.url : undefined,
                fileId: typeof a.fileId === "string" ? a.fileId : undefined,
                createdAt: typeof a.createdAt === "number" ? a.createdAt : Date.now(),
              }))
          : [],
        createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
        completedAt: typeof t.completedAt === "number" ? t.completedAt : undefined,
      })),
  };
}

/**
 * 应用状态持久化（v0.7 起）：
 * 1. localStorage 秒开（首屏不等待网络）；
 * 2. 后台拉取 Supabase 云端数据，云端为准；
 * 3. 每次变更同时写 localStorage 和云端（写云端失败不影响本地，离线可用）；
 * 4. 首次接入时，若云端为空而本地有数据，自动把本地数据迁移上云。
 */
export function useAppState(): [AppState, React.Dispatch<React.SetStateAction<AppState>>, boolean] {
  const [state, setState] = useState<AppState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  // 云端首次拉取完成后才允许回写，避免用旧本地数据覆盖云端
  const remoteReady = useRef(!hasBackend);

  useEffect(() => {
    let local = initialState;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        local = normalize(JSON.parse(raw));
        setState(local);
      }
    } catch {
      // 忽略损坏数据
    }
    setHydrated(true);

    if (!hasBackend) return;
    let cancelled = false;
    (async () => {
      const remote = await fetchRemoteState();
      if (cancelled) return;
      if (remote) {
        const remoteEmpty =
          remote.tasks.length === 0 && remote.files.length === 0 && remote.checkins.length === 0;
        const localHasData =
          local.tasks.length > 0 || local.files.length > 0 || local.checkins.length > 0;
        if (remoteEmpty && localHasData) {
          // 首次接入：把本地数据迁移上云，界面保持本地数据不变
          await pushRemoteState(local);
        } else {
          setState(remote);
        }
      }
      remoteReady.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (remoteReady.current) {
      pushRemoteState(state);
    }
  }, [state, hydrated]);

  return [state, setState, hydrated];
}
