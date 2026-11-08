"use client";

import { useMemo, useState } from "react";
import { detectPriority, PRIORITY_META } from "@/lib/priority";
import { daysUntil, formatDeadline, todayKey, uid, type Task } from "@/lib/types";

interface Props {
  tasks: Task[];
  onAdd: (task: Task) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const SUBJECT_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-pink-100 text-pink-700",
  "bg-cyan-100 text-cyan-700",
];

function subjectColor(subject: string): string {
  let h = 0;
  for (const ch of subject) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return SUBJECT_COLORS[h % SUBJECT_COLORS.length];
}

export default function TaskList({ tasks, onAdd, onToggle, onDelete }: Props) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [deadline, setDeadline] = useState(todayKey());
  const [deadlineTime, setDeadlineTime] = useState("");

  // 添加表单里实时预览智能识别结果
  const previewPriority = useMemo(
    () => (title.trim() ? detectPriority(title + subject, deadline) : null),
    [title, subject, deadline]
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      id: uid(),
      title: title.trim(),
      subject: subject.trim() || "通用",
      priority: detectPriority(title + subject, deadline),
      done: false,
      deadline,
      deadlineTime: deadlineTime || undefined,
      createdAt: Date.now(),
    });
    setTitle("");
    setSubject("");
    setDeadlineTime("");
  }

  // 排序：未完成在前；优先级 高>中>低；同级按截止日近的在前
  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const w = PRIORITY_META[a.priority].weight - PRIORITY_META[b.priority].weight;
      if (w !== 0) return w;
      return daysUntil(a.deadline) - daysUntil(b.deadline);
    });
  }, [tasks]);

  // 今日建议：排在最前面的未完成任务
  const suggestion = sorted.find((t) => !t.done);

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">学习计划</h2>
        <span className="text-xs text-slate-400">智能识别优先级并排序</span>
      </div>

      <form onSubmit={submit} className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px_140px_110px_auto]">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="要学什么？例如：准备期末考试"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
        />
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="科目"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
        />
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
        />
        <input
          type="time"
          value={deadlineTime}
          onChange={(e) => setDeadlineTime(e.target.value)}
          title="截止时刻（可选，不填则只精确到日）"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          添加
        </button>
      </form>

      {previewPriority && (
        <p className="mb-3 text-xs text-slate-400">
          🤖 智能识别：该任务优先级为
          <span className={`ml-1 rounded-full px-2 py-0.5 font-medium ring-1 ${PRIORITY_META[previewPriority].badge}`}>
            {PRIORITY_META[previewPriority].label}
          </span>
        </p>
      )}

      {suggestion && (
        <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
          💡 建议优先完成「{suggestion.title}」（{PRIORITY_META[suggestion.priority].label}优先级）——
          {daysUntil(suggestion.deadline) < 0
            ? `已逾期 ${-daysUntil(suggestion.deadline)} 天，尽快处理！`
            : daysUntil(suggestion.deadline) === 0
              ? `今天${suggestion.deadlineTime ? ` ${suggestion.deadlineTime} ` : ""}截止！`
              : `距离截止还有 ${daysUntil(suggestion.deadline)} 天。`}
        </div>
      )}

      <ul className="space-y-2">
        {sorted.length === 0 && (
          <li className="py-8 text-center text-sm text-slate-400">
            还没有计划，添加第一个学习任务吧 🎯
          </li>
        )}
        {sorted.map((t) => {
          const d = daysUntil(t.deadline);
          const meta = PRIORITY_META[t.priority];
          return (
            <li
              key={t.id}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                t.done ? "border-slate-100 bg-slate-50" : "border-slate-200 hover:border-indigo-300"
              }`}
            >
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => onToggle(t.id)}
                className="h-4 w-4 accent-indigo-600"
              />
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-medium ${t.done ? "text-slate-400 line-through" : "text-slate-800"}`}>
                  {t.title}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full px-2 py-0.5 font-medium ring-1 ${meta.badge}`}>
                    {meta.label}优先级
                  </span>
                  <span className={`rounded-full px-2 py-0.5 font-medium ${subjectColor(t.subject)}`}>{t.subject}</span>
                  <span className={d <= 0 && !t.done ? "font-medium text-rose-600" : "text-slate-400"}>
                    {t.done
                      ? "已完成"
                      : d < 0
                        ? `已逾期 ${-d} 天 · ${formatDeadline(t)}`
                        : d === 0
                          ? `今天${t.deadlineTime ? ` ${t.deadlineTime} ` : ""}截止`
                          : `${d} 天后截止 · ${formatDeadline(t)}`}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onDelete(t.id)}
                className="text-slate-300 hover:text-rose-500"
                title="删除"
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
