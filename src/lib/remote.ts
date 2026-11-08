"use client";

import { supabase } from "./supabase";
import type { AppState, RepoFile, Task } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

function rowToTask(r: any): Task {
  return {
    id: r.id,
    title: r.title ?? "",
    subject: r.subject ?? "",
    priority: r.priority ?? "low",
    done: Boolean(r.done),
    deadline: r.deadline ?? "",
    deadlineTime: r.deadline_time ?? undefined,
    createdAt: Number(r.created_at) || Date.now(),
    completedAt: r.completed_at ?? undefined,
  };
}

function taskToRow(t: Task) {
  return {
    id: t.id,
    title: t.title,
    subject: t.subject,
    priority: t.priority,
    done: t.done,
    deadline: t.deadline,
    deadline_time: t.deadlineTime ?? null,
    created_at: t.createdAt,
    completed_at: t.completedAt ?? null,
  };
}

function rowToFile(r: any): RepoFile {
  return {
    id: r.id,
    name: r.name ?? "",
    path: r.path ?? undefined,
    subject: r.subject ?? "通用",
    mimeType: r.mime_type ?? "",
    size: Number(r.size) || 0,
    createdAt: Number(r.created_at) || Date.now(),
  };
}

function fileToRow(f: RepoFile) {
  return {
    id: f.id,
    name: f.name,
    path: f.path ?? null,
    subject: f.subject,
    mime_type: f.mimeType,
    size: f.size,
    created_at: f.createdAt,
  };
}

/** 从 Supabase 拉取全量状态；出错（含表不存在）返回 null，调用方回退本地 */
export async function fetchRemoteState(): Promise<AppState | null> {
  if (!supabase) return null;
  try {
    const [t, f] = await Promise.all([
      supabase.from("tasks").select("*"),
      supabase.from("repo_files").select("*"),
    ]);
    if (t.error || f.error) {
      console.warn("[studyflow] 拉取云端数据失败：", t.error?.message ?? f.error?.message);
      return null;
    }
    return {
      tasks: (t.data ?? []).map(rowToTask),
      files: (f.data ?? []).map(rowToFile),
    };
  } catch (e) {
    console.warn("[studyflow] 云端不可用，使用本地数据", e);
    return null;
  }
}

/**
 * 把全量状态同步到 Supabase（upsert + 删除已移除的行），失败仅告警不影响本地。
 * 注意：必须通过 pushRemoteState 串行执行（upsert 与 delete-not-in 若并发交错，
 * 后到的 delete 会误删前一个 push 刚写入的行）。
 */
let pushQueue: Promise<void> = Promise.resolve();

export function pushRemoteState(state: AppState): Promise<void> {
  pushQueue = pushQueue.then(() => doPushRemoteState(state));
  return pushQueue;
}

async function doPushRemoteState(state: AppState): Promise<void> {
  if (!supabase) return;
  try {
    const taskIds = state.tasks.map((t) => t.id);
    const fileIds = state.files.map((f) => f.id);

    if (state.tasks.length > 0) {
      const up = await supabase.from("tasks").upsert(state.tasks.map(taskToRow));
      if (up.error) console.warn("[studyflow] tasks upsert 失败：", up.error.message);
      const del = await supabase.from("tasks").delete().not("id", "in", `(${taskIds.join(",")})`);
      if (del.error) console.warn("[studyflow] tasks delete 失败：", del.error.message);
    } else {
      const del = await supabase.from("tasks").delete().neq("id", "");
      if (del.error) console.warn("[studyflow] tasks delete 失败：", del.error.message);
    }

    if (state.files.length > 0) {
      const up = await supabase.from("repo_files").upsert(state.files.map(fileToRow));
      if (up.error) console.warn("[studyflow] repo_files upsert 失败：", up.error.message);
      const del = await supabase.from("repo_files").delete().not("id", "in", `(${fileIds.join(",")})`);
      if (del.error) console.warn("[studyflow] repo_files delete 失败：", del.error.message);
    } else {
      const del = await supabase.from("repo_files").delete().neq("id", "");
      if (del.error) console.warn("[studyflow] repo_files delete 失败：", del.error.message);
    }
  } catch (e) {
    console.warn("[studyflow] 同步云端失败（本地数据不受影响）", e);
  }
}
