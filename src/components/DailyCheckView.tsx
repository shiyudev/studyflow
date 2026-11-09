"use client";

import { useMemo, useState } from "react";
import { todayKey, type CheckIn, type Task } from "@/lib/types";

interface Props {
  tasks: Task[]; // 仅每日任务
  checkins: CheckIn[];
  /** 记录某天某任务的状态（同日同任务覆盖），可带反思/备注与用时（分钟） */
  onRecord: (
    taskId: string,
    date: string,
    status: "done" | "missed",
    reason?: string,
    duration?: number
  ) => void;
  /** 撤销某天某任务的记录 */
  onRemove: (taskId: string, date: string) => void;
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function dateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()} 周${WEEKDAYS[d.getDay()]}`;
}

function timeLabel(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** 用时展示：分钟 → "25 分钟" / "1 小时 25 分钟" */
export function durationLabel(min?: number): string {
  if (!min) return "";
  if (min < 60) return `${min} 分钟`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} 小时 ${m} 分钟` : `${h} 小时`;
}

/** 反思/用时填写表单（每日打卡与作业反馈共用交互） */
export function ReflectionForm({
  defaultReason,
  defaultDuration,
  reasonRequired,
  reasonPlaceholder,
  submitText,
  cancelText,
  onSubmit,
  onCancel,
}: {
  defaultReason: string;
  defaultDuration?: number;
  reasonRequired?: boolean;
  reasonPlaceholder: string;
  submitText: string;
  cancelText?: string;
  onSubmit: (reason: string | undefined, duration: number | undefined) => void;
  onCancel?: () => void;
}) {
  const [reason, setReason] = useState(defaultReason);
  const [duration, setDuration] = useState<string>(defaultDuration ? String(defaultDuration) : "");

  function submit() {
    const r = reason.trim();
    if (reasonRequired && !r) {
      alert("写一句反思吧，哪怕一句话也行");
      return;
    }
    const d = duration.trim() ? Number(duration) : NaN;
    onSubmit(r || undefined, Number.isFinite(d) && d > 0 ? Math.round(d) : undefined);
  }

  return (
    <div className="mt-2 space-y-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <textarea
        autoFocus
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), submit())}
        placeholder={reasonPlaceholder}
        rows={2}
        className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
      />
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xs text-slate-400">用时</span>
        <input
          type="number"
          min={1}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="分钟"
          className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
        />
        <span className="text-xs text-slate-400">分钟</span>
        {[15, 30, 45, 60].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setDuration(String(m))}
            className={`rounded-lg px-2 py-1 text-xs ${
              duration === String(m)
                ? "bg-indigo-600 text-white"
                : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-indigo-50"
            }`}
          >
            {m}′
          </button>
        ))}
        <div className="flex-1" />
        {onCancel && (
          <button onClick={onCancel} className="rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600">
            {cancelText ?? "跳过"}
          </button>
        )}
        <button
          onClick={submit}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
        >
          {submitText}
        </button>
      </div>
    </div>
  );
}

export default function DailyCheckView({ tasks, checkins, onRecord, onRemove }: Props) {
  const today = todayKey();
  const [formFor, setFormFor] = useState<string | null>(null); // "new:done:<id>" | "new:missed:<id>" | "edit:<id>"

  const days = useMemo(() => {
    const list: string[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      list.push(todayKey(d));
    }
    return list;
  }, []);

  function findCheckIn(taskId: string, date: string): CheckIn | undefined {
    return checkins.find((c) => c.taskId === taskId && c.date === date);
  }

  function closeForm() {
    setFormFor(null);
  }

  const todayDone = tasks.filter((t) => findCheckIn(t.id, today)?.status === "done").length;
  const todayMissed = tasks.filter((t) => findCheckIn(t.id, today)?.status === "missed").length;

  return (
    <div className="space-y-4">
      {/* 今日打卡 */}
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">🔁 今日打卡</h2>
          <span className="text-xs text-slate-400">
            {dateLabel(today)} · {tasks.length} 项 · 已完成 {todayDone} · 未做 {todayMissed}
          </span>
        </div>

        {tasks.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            还没有每日任务。去「学习计划」添加一个，比如"背单词30个" 🌱
          </p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => {
              const ci = findCheckIn(t.id, today);
              return (
                <li
                  key={t.id}
                  className={`rounded-xl border px-4 py-3 ${
                    ci?.status === "done"
                      ? "border-emerald-200 bg-emerald-50/60"
                      : ci?.status === "missed"
                        ? "border-rose-200 bg-rose-50/60"
                        : "border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{t.title}</p>
                      {ci && (
                        <p className={`mt-1 text-xs ${ci.status === "done" ? "text-emerald-700" : "text-rose-600"}`}>
                          {ci.status === "done" ? "✅ 已完成" : "❌ 没做"}
                          <span className="ml-2 font-normal text-slate-400">{timeLabel(ci.createdAt)}</span>
                          {ci.duration ? (
                            <span className="ml-2 font-normal text-indigo-500">⏱ {durationLabel(ci.duration)}</span>
                          ) : null}
                        </p>
                      )}
                      {ci?.reason && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {ci.status === "done" ? "📝 备注：" : "💭 反思："}
                          {ci.reason}
                        </p>
                      )}
                    </div>
                    {ci ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() =>
                            setFormFor(formFor === `edit:${t.id}` ? null : `edit:${t.id}`)
                          }
                          className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-indigo-600 ring-1 ring-indigo-200 hover:bg-indigo-50"
                        >
                          ✍️ {ci.reason || ci.duration ? "修改反思/用时" : ci.status === "done" ? "写完成情况" : "写反思"}
                        </button>
                        <button
                          onClick={() => onRemove(t.id, today)}
                          className="text-xs text-slate-400 hover:text-slate-600"
                        >
                          撤销
                        </button>
                      </div>
                    ) : (
                      <div className="flex shrink-0 gap-1.5">
                        <button
                          onClick={() => {
                            setFormFor(`new:done:${t.id}`);
                          }}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                        >
                          ✅ 完成
                        </button>
                        <button
                          onClick={() => {
                            setFormFor(`new:missed:${t.id}`);
                          }}
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-rose-100 hover:text-rose-600"
                        >
                          ❌ 没做
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 完成：可选填反思/用时 */}
                  {formFor === `new:done:${t.id}` && (
                    <ReflectionForm
                      defaultReason=""
                      reasonPlaceholder="完成情况/心得（可选）：如 20 分钟背完 30 个，错了 3 个"
                      submitText="保存完成"
                      onSubmit={(reason, duration) => {
                        onRecord(t.id, today, "done", reason, duration);
                        closeForm();
                      }}
                      onCancel={() => {
                        onRecord(t.id, today, "done");
                        closeForm();
                      }}
                    />
                  )}
                  {/* 没做：必须写反思，可填用时 */}
                  {formFor === `new:missed:${t.id}` && (
                    <ReflectionForm
                      defaultReason=""
                      reasonRequired
                      reasonPlaceholder="反思一下：今天为什么没做？（必填）如：社团活动太晚，明天早上补"
                      submitText="记录没做"
                      onSubmit={(reason, duration) => {
                        onRecord(t.id, today, "missed", reason, duration);
                        closeForm();
                      }}
                      onCancel={closeForm}
                    />
                  )}
                  {/* 编辑已有记录 */}
                  {formFor === `edit:${t.id}` && ci && (
                    <ReflectionForm
                      defaultReason={ci.reason ?? ""}
                      defaultDuration={ci.duration}
                      reasonRequired={ci.status === "missed"}
                      reasonPlaceholder={
                        ci.status === "done" ? "完成情况/心得…" : "反思：今天为什么没做？…"
                      }
                      submitText="保存"
                      onSubmit={(reason, duration) => {
                        onRecord(t.id, today, ci.status, reason, duration);
                        closeForm();
                      }}
                      onCancel={closeForm}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 日期记录表 */}
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">📅 日期记录表</h2>
          <span className="text-xs text-slate-400">最近 14 天 · ✅ 完成 · ❌ 没做（悬停看反思）· ➖ 无记录</span>
        </div>
        {tasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">暂无记录</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-center text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-400">
                  <th className="px-2 py-2 text-left font-medium">日期</th>
                  {tasks.map((t) => (
                    <th key={t.id} className="max-w-24 truncate px-2 py-2 font-medium" title={t.title}>
                      {t.title}
                    </th>
                  ))}
                  <th className="px-2 py-2 font-medium">完成率</th>
                </tr>
              </thead>
              <tbody>
                {days.map((date) => {
                  const records = tasks.map((t) => findCheckIn(t.id, date));
                  const doneCount = records.filter((r) => r?.status === "done").length;
                  const isToday = date === today;
                  return (
                    <tr key={date} className={`border-b border-slate-100 ${isToday ? "bg-indigo-50/50" : ""}`}>
                      <td className={`px-2 py-2 text-left text-xs ${isToday ? "font-semibold text-indigo-600" : "text-slate-500"}`}>
                        {dateLabel(date)}{isToday && "（今天）"}
                      </td>
                      {records.map((r, i) => (
                        <td key={tasks[i].id} className="px-2 py-2">
                          {r?.status === "done" ? (
                            <span
                              title={`备注：${r.reason ?? "（无）"}${r.duration ? `\n用时：${durationLabel(r.duration)}` : ""}`}
                              className={r.reason || r.duration ? "cursor-help" : undefined}
                            >
                              ✅
                            </span>
                          ) : r?.status === "missed" ? (
                            <span title={`反思：${r.reason ?? "（未填原因）"}`} className="cursor-help">
                              ❌
                            </span>
                          ) : (
                            <span className="text-slate-300">➖</span>
                          )}
                        </td>
                      ))}
                      <td className="px-2 py-2 text-xs text-slate-500">
                        {records.some(Boolean) ? `${doneCount}/${tasks.length}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
