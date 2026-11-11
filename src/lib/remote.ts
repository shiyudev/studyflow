"use client";

import { supabase } from "./supabase";
import type { AppState, CheckIn, DayNote, PlanItem, RepoFile, Task } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

function rowToTask(r: any): Task {
  return {
    id: r.id,
    title: r.title ?? "",
    subject: r.subject ?? "",
    priority: r.priority ?? "low",
    type: r.type === "daily" ? "daily" : "homework",
    done: Boolean(r.done),
    deadline: r.deadline ?? "",
    deadlineTime: r.deadline_time ?? undefined,
    attachments: Array.isArray(r.attachments) ? r.attachments : [],
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
    type: t.type,
    done: t.done,
    deadline: t.deadline,
    deadline_time: t.deadlineTime ?? null,
    attachments: t.attachments,
    created_at: t.createdAt,
    completed_at: t.completedAt ?? null,
  };
}

function rowToCheckIn(r: any): CheckIn {
  return {
    id: r.id,
    taskId: r.task_id,
    date: r.date ?? "",
    status: r.status === "missed" ? "missed" : "done",
    reason: r.reason ?? undefined,
    duration: typeof r.duration === "number" && r.duration > 0 ? r.duration : undefined,
    createdAt: Number(r.created_at) || Date.now(),
  };
}

function checkInToRow(c: CheckIn) {
  return {
    id: c.id,
    task_id: c.taskId,
    date: c.date,
    status: c.status,
    reason: c.reason ?? null,
    duration: c.duration ?? null,
    created_at: c.createdAt,
  };
}

function rowToPlan(r: any): PlanItem {
  return {
    id: r.id,
    type: r.type === "longterm" ? "longterm" : "daily",
    date: r.date ?? undefined,
    time: r.time ?? undefined,
    title: r.title ?? undefined,
    content: r.content ?? "",
    startDate: r.start_date ?? undefined,
    endDate: r.end_date ?? undefined,
    done: Boolean(r.done),
    reflection: r.reflection ?? undefined,
    completedAt: typeof r.completed_at === "number" ? r.completed_at : undefined,
    createdAt: Number(r.created_at) || Date.now(),
    updatedAt: Number(r.updated_at) || Date.now(),
  };
}

function planToRow(p: PlanItem) {
  return {
    id: p.id,
    type: p.type,
    date: p.date ?? null,
    time: p.time ?? null,
    title: p.title ?? null,
    content: p.content,
    start_date: p.startDate ?? null,
    end_date: p.endDate ?? null,
    done: p.done,
    reflection: p.reflection ?? null,
    completed_at: p.completedAt ?? null,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

function rowToDayNote(r: any): DayNote {
  return {
    id: r.id,
    date: r.date ?? "",
    record: r.record ?? "",
    reflection: r.reflection ?? "",
    planNote: r.plan_note ?? undefined,
    updatedAt: Number(r.updated_at) || Date.now(),
  };
}

function dayNoteToRow(n: DayNote) {
  return {
    id: n.id,
    date: n.date,
    record: n.record,
    reflection: n.reflection,
    plan_note: n.planNote ?? null,
    updated_at: n.updatedAt,
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
    const [t, f, c, p] = await Promise.all([
      supabase.from("tasks").select("*"),
      supabase.from("repo_files").select("*"),
      supabase.from("checkins").select("*"),
      supabase.from("plans").select("*"),
    ]);
    if (t.error || f.error || c.error || p.error) {
      console.warn(
        "[studyflow] 拉取云端数据失败：",
        t.error?.message ?? f.error?.message ?? c.error?.message ?? p.error?.message
      );
      return null;
    }
    // day_notes（v1.2 新增表）：若用户尚未重跑建表 SQL，单独容错为空，
    // 不影响其他表的云端恢复
    let dayNotes: AppState["dayNotes"] = [];
    try {
      const n = await supabase.from("day_notes").select("*");
      if (n.error) {
        console.warn("[studyflow] day_notes 拉取失败（需重跑 docs/supabase-setup.sql）：", n.error.message);
      } else {
        dayNotes = (n.data ?? []).map(rowToDayNote);
      }
    } catch (e) {
      console.warn("[studyflow] day_notes 不可用，按空表处理", e);
    }
    return {
      tasks: (t.data ?? []).map(rowToTask),
      files: (f.data ?? []).map(rowToFile),
      checkins: (c.data ?? []).map(rowToCheckIn),
      plans: (p.data ?? []).map(rowToPlan),
      dayNotes,
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

    const checkInIds = state.checkins.map((c) => c.id);
    if (state.checkins.length > 0) {
      const up = await supabase.from("checkins").upsert(state.checkins.map(checkInToRow));
      if (up.error) console.warn("[studyflow] checkins upsert 失败：", up.error.message);
      const del = await supabase.from("checkins").delete().not("id", "in", `(${checkInIds.join(",")})`);
      if (del.error) console.warn("[studyflow] checkins delete 失败：", del.error.message);
    } else {
      const del = await supabase.from("checkins").delete().neq("id", "");
      if (del.error) console.warn("[studyflow] checkins delete 失败：", del.error.message);
    }

    const planIds = state.plans.map((p) => p.id);
    if (state.plans.length > 0) {
      let rows: Record<string, unknown>[] = state.plans.map(planToRow);
      let up = await supabase.from("plans").upsert(rows);
      if (up.error && /reflection|completed_at/i.test(up.error.message)) {
        // 旧版 plans 表缺 v1.4 新列：去掉新列降级重试（反思暂存本地，重跑 SQL 后自动恢复）
        console.warn("[studyflow] plans 缺 v1.4 列（需重跑 docs/supabase-setup.sql），降级同步其余字段");
        rows = state.plans.map((p) => {
          const { reflection: _r, completed_at: _c, ...rest } = planToRow(p);
          return rest;
        });
        up = await supabase.from("plans").upsert(rows);
      }
      if (up.error) console.warn("[studyflow] plans upsert 失败：", up.error.message);
      const del = await supabase.from("plans").delete().not("id", "in", `(${planIds.join(",")})`);
      if (del.error) console.warn("[studyflow] plans delete 失败：", del.error.message);
    } else {
      const del = await supabase.from("plans").delete().neq("id", "");
      if (del.error) console.warn("[studyflow] plans delete 失败：", del.error.message);
    }

    // day_notes：表不存在时仅告警（用户重跑建表 SQL 后自动恢复同步）
    try {
      const noteIds = state.dayNotes.map((n) => n.id);
      if (state.dayNotes.length > 0) {
        let rows: Record<string, unknown>[] = state.dayNotes.map(dayNoteToRow);
        let up = await supabase.from("day_notes").upsert(rows);
        if (up.error && /plan_note/i.test(up.error.message)) {
          // 旧版 day_notes 表缺 v1.4 的 plan_note 列：降级重试
          console.warn("[studyflow] day_notes 缺 plan_note 列（需重跑 docs/supabase-setup.sql），降级同步");
          rows = state.dayNotes.map((n) => {
            const { plan_note: _p, ...rest } = dayNoteToRow(n);
            return rest;
          });
          up = await supabase.from("day_notes").upsert(rows);
        }
        if (up.error) console.warn("[studyflow] day_notes upsert 失败：", up.error.message);
        const del = await supabase.from("day_notes").delete().not("id", "in", `(${noteIds.join(",")})`);
        if (del.error) console.warn("[studyflow] day_notes delete 失败：", del.error.message);
      } else {
        const del = await supabase.from("day_notes").delete().neq("id", "");
        if (del.error) console.warn("[studyflow] day_notes delete 失败：", del.error.message);
      }
    } catch (e) {
      console.warn("[studyflow] day_notes 同步失败（本地数据不受影响）", e);
    }
  } catch (e) {
    console.warn("[studyflow] 同步云端失败（本地数据不受影响）", e);
  }
}
