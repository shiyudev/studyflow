"use client";

import { useMemo, useState } from "react";
import { todayKey, uid, type PlanItem } from "@/lib/types";

interface Props {
  plans: PlanItem[];
  onChange: (plans: PlanItem[]) => void;
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function shiftDate(dateStr: string, delta: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return todayKey(d);
}

function friendlyDate(dateStr: string): string {
  const today = todayKey();
  if (dateStr === today) return "今天";
  if (dateStr === shiftDate(today, 1)) return "明天";
  if (dateStr === shiftDate(today, -1)) return "昨天";
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}月${d.getDate()}日 周${WEEKDAYS[d.getDay()]}`;
}

export default function PlanView({ plans, onChange }: Props) {
  const [date, setDate] = useState(todayKey());
  // 每日计划输入
  const [time, setTime] = useState("");
  const [content, setContent] = useState("");
  // 长期计划输入
  const [ltTitle, setLtTitle] = useState("");
  const [ltStart, setLtStart] = useState("");
  const [ltEnd, setLtEnd] = useState("");
  const [ltContent, setLtContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<PlanItem | null>(null);

  const dailyPlans = useMemo(
    () =>
      plans
        .filter((p) => p.type === "daily" && p.date === date)
        .sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99") || a.createdAt - b.createdAt),
    [plans, date]
  );

  const longPlans = useMemo(
    () => plans.filter((p) => p.type === "longterm").sort((a, b) => b.createdAt - a.createdAt),
    [plans]
  );

  /* ---------- 每日计划 ---------- */
  function addDaily() {
    if (!content.trim()) return;
    const now = Date.now();
    onChange([
      ...plans,
      {
        id: uid(), type: "daily", date, time: time || undefined,
        content: content.trim(), done: false, createdAt: now, updatedAt: now,
      },
    ]);
    setContent("");
    setTime("");
  }

  function toggleDaily(id: string) {
    onChange(plans.map((p) => (p.id === id ? { ...p, done: !p.done, updatedAt: Date.now() } : p)));
  }

  /* ---------- 长期计划 ---------- */
  function addLong() {
    if (!ltTitle.trim()) return;
    const now = Date.now();
    onChange([
      ...plans,
      {
        id: uid(), type: "longterm", title: ltTitle.trim(),
        startDate: ltStart || undefined, endDate: ltEnd || undefined,
        content: ltContent.trim(), done: false, createdAt: now, updatedAt: now,
      },
    ]);
    setLtTitle(""); setLtStart(""); setLtEnd(""); setLtContent("");
  }

  function startEdit(p: PlanItem) {
    setEditingId(p.id);
    setEditDraft({ ...p });
  }

  function saveEdit() {
    if (!editDraft) return;
    onChange(
      plans.map((p) => (p.id === editDraft.id ? { ...editDraft, updatedAt: Date.now() } : p))
    );
    setEditingId(null);
    setEditDraft(null);
  }

  function removePlan(id: string) {
    const p = plans.find((x) => x.id === id);
    if (!p) return;
    if (!confirm(`确定删除${p.type === "daily" ? "这条计划" : `「${p.title}」`}吗？`)) return;
    onChange(plans.filter((x) => x.id !== id));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ============ 每日计划 ============ */}
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">📅 每日计划</h2>
          <span className="text-xs text-slate-400">按日期写下详细安排</span>
        </div>

        {/* 日期切换 */}
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={() => setDate(shiftDate(date, -1))}
            className="h-8 w-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"
            title="前一天"
          >
            ‹
          </button>
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold text-slate-800">{friendlyDate(date)}</p>
            <p className="text-xs text-slate-400">{date}</p>
          </div>
          <button
            onClick={() => setDate(shiftDate(date, 1))}
            className="h-8 w-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"
            title="后一天"
          >
            ›
          </button>
        </div>
        <div className="mb-4 flex gap-2 text-xs">
          <button
            onClick={() => setDate(todayKey())}
            className={`rounded-full px-3 py-1 ${date === todayKey() ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
          >
            今天
          </button>
          <button
            onClick={() => setDate(shiftDate(todayKey(), 1))}
            className={`rounded-full px-3 py-1 ${date === shiftDate(todayKey(), 1) ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
          >
            明天
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="ml-auto rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 outline-none focus:border-indigo-400"
          />
        </div>

        {/* 添加条目 */}
        <div className="mb-4 flex gap-2">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            title="时段（可选）"
            className="w-28 rounded-lg border border-slate-200 px-2 py-2 text-sm text-slate-600 outline-none focus:border-indigo-400"
          />
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addDaily()}
            placeholder={`${friendlyDate(date)}的计划，如：上午 2 小时数学`}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
          <button
            onClick={addDaily}
            className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            添加
          </button>
        </div>

        {/* 当日计划列表 */}
        {dailyPlans.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            {friendlyDate(date)}还没有计划，写一条吧 ✏️
          </p>
        ) : (
          <ul className="space-y-1.5">
            {dailyPlans.map((p) => (
              <li
                key={p.id}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
                  p.done ? "border-slate-100 bg-slate-50" : "border-slate-200"
                }`}
              >
                <input
                  type="checkbox"
                  checked={p.done}
                  onChange={() => toggleDaily(p.id)}
                  className="h-4 w-4 shrink-0 accent-indigo-600"
                />
                {p.time && (
                  <span className="shrink-0 rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
                    {p.time}
                  </span>
                )}
                <span className={`min-w-0 flex-1 text-sm ${p.done ? "text-slate-400 line-through" : "text-slate-700"}`}>
                  {p.content}
                </span>
                <button onClick={() => removePlan(p.id)} className="shrink-0 text-slate-300 hover:text-rose-500" title="删除">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ============ 长期计划 ============ */}
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">🎯 长期计划</h2>
          <span className="text-xs text-slate-400">围绕某件事的长期目标</span>
        </div>

        {/* 添加长期计划 */}
        <div className="mb-4 space-y-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <input
            value={ltTitle}
            onChange={(e) => setLtTitle(e.target.value)}
            placeholder="计划标题，如：期末数学复习"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <input type="date" value={ltStart} onChange={(e) => setLtStart(e.target.value)} title="开始日期（可选）"
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-500 outline-none" />
            <span>→</span>
            <input type="date" value={ltEnd} onChange={(e) => setLtEnd(e.target.value)} title="结束日期（可选）"
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-500 outline-none" />
          </div>
          <textarea
            value={ltContent}
            onChange={(e) => setLtContent(e.target.value)}
            placeholder="详细内容：目标是什么、分几个阶段、每阶段做什么…"
            rows={3}
            className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
          <button
            onClick={addLong}
            disabled={!ltTitle.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            添加长期计划
          </button>
        </div>

        {/* 长期计划卡片 */}
        {longPlans.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">还没有长期计划 🎯</p>
        ) : (
          <ul className="space-y-2.5">
            {longPlans.map((p) => (
              <li
                key={p.id}
                className={`rounded-xl border p-4 ${
                  p.done ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200"
                }`}
              >
                {editingId === p.id && editDraft ? (
                  <div className="space-y-2">
                    <input
                      value={editDraft.title ?? ""}
                      onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
                    />
                    <div className="flex items-center gap-2 text-xs">
                      <input type="date" value={editDraft.startDate ?? ""}
                        onChange={(e) => setEditDraft({ ...editDraft, startDate: e.target.value || undefined })}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none" />
                      <span className="text-slate-400">→</span>
                      <input type="date" value={editDraft.endDate ?? ""}
                        onChange={(e) => setEditDraft({ ...editDraft, endDate: e.target.value || undefined })}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none" />
                    </div>
                    <textarea
                      value={editDraft.content}
                      onChange={(e) => setEditDraft({ ...editDraft, content: e.target.value })}
                      rows={4}
                      className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                    />
                    <div className="flex gap-2">
                      <button onClick={saveEdit} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white">保存</button>
                      <button onClick={() => setEditingId(null)} className="rounded-lg px-3 py-1.5 text-xs text-slate-400">取消</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold ${p.done ? "text-emerald-700" : "text-slate-800"}`}>
                          {p.done && "✅ "}{p.title}
                        </p>
                        {(p.startDate || p.endDate) && (
                          <p className="mt-0.5 text-xs text-slate-400">
                            {p.startDate ?? "…"} → {p.endDate ?? "…"}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => onChange(plans.map((x) => (x.id === p.id ? { ...x, done: !x.done, updatedAt: Date.now() } : x)))}
                        title={p.done ? "取消达成" : "标记达成"}
                        className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium ${
                          p.done ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-700"
                        }`}
                      >
                        {p.done ? "已达成 ✓" : "达成"}
                      </button>
                      <button onClick={() => startEdit(p)} className="shrink-0 text-xs text-slate-400 hover:text-indigo-600">编辑</button>
                      <button onClick={() => removePlan(p.id)} className="shrink-0 text-xs text-slate-300 hover:text-rose-500">✕</button>
                    </div>
                    {p.content && (
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-500">{p.content}</p>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
