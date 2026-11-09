"use client";

import { useMemo, useState } from "react";
import { detectPriority, PRIORITY_META } from "@/lib/priority";
import { daysUntil, formatDeadline, todayKey, uid, type CheckIn, type Task, type TaskType } from "@/lib/types";
import TaskAttachments from "./TaskAttachments";

interface Props {
  /** 本页面管理的任务类型：每日任务与作业任务分开为两个独立页面 */
  type: TaskType;
  tasks: Task[];
  checkins: CheckIn[];
  onAdd: (task: Task) => void;
  onToggle: (id: string) => void;
  /** 每日任务打卡：勾选=记今天 done，取消=删除今天的记录 */
  onToggleDaily: (taskId: string, done: boolean) => void;
  onDelete: (id: string) => void;
  onUpdateTask: (task: Task) => void;
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

/** 每日任务连续打卡天数（从今天往回数） */
function dailyStreak(taskId: string, checkins: CheckIn[]): number {
  const doneDates = new Set(
    checkins.filter((c) => c.taskId === taskId && c.status === "done").map((c) => c.date)
  );
  let streak = 0;
  const d = new Date();
  // 今天没打不算断（还没到今天结束）
  if (!doneDates.has(todayKey(d))) d.setDate(d.getDate() - 1);
  while (doneDates.has(todayKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

const TYPE_META: Record<TaskType, { title: string; hint: string; icon: string; accent: string; btnClass: string }> = {
  daily: {
    title: "每日任务",
    hint: "固定每天要做，一次添加天天生效，在下方打卡记录",
    icon: "🔁",
    accent: "text-emerald-600",
    btnClass: "bg-emerald-600 hover:bg-emerald-700",
  },
  homework: {
    title: "作业任务",
    hint: "按截止日期布置的任务，附件可挂作业内容/网址/文件",
    icon: "📝",
    accent: "text-indigo-600",
    btnClass: "bg-indigo-600 hover:bg-indigo-700",
  },
};

export default function TaskList({ type, tasks, checkins, onAdd, onToggle, onToggleDaily, onDelete, onUpdateTask }: Props) {
  const meta = TYPE_META[type];
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [deadline, setDeadline] = useState(todayKey());
  const [deadlineTime, setDeadlineTime] = useState("");
  const [attachTaskId, setAttachTaskId] = useState<string | null>(null);

  const today = todayKey();
  const isDaily = type === "daily";
  const attachTask = tasks.find((t) => t.id === attachTaskId) ?? null;

  // 添加表单里实时预览智能识别结果
  const previewPriority = useMemo(
    () => (title.trim() ? detectPriority(title + subject, isDaily ? "" : deadline) : null),
    [title, subject, deadline, isDaily]
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      id: uid(),
      title: title.trim(),
      subject: subject.trim() || "通用",
      priority: detectPriority(title + subject, isDaily ? "" : deadline),
      type,
      done: false,
      deadline: isDaily ? "" : deadline,
      deadlineTime: !isDaily && deadlineTime ? deadlineTime : undefined,
      attachments: [],
      createdAt: Date.now(),
    });
    setTitle("");
    setSubject("");
    setDeadlineTime("");
  }

  const list = useMemo(() => {
    const mine = tasks.filter((t) => (isDaily ? t.type === "daily" : t.type !== "daily"));
    if (isDaily) return mine;
    return [...mine].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const w = PRIORITY_META[a.priority].weight - PRIORITY_META[b.priority].weight;
      if (w !== 0) return w;
      return daysUntil(a.deadline) - daysUntil(b.deadline);
    });
  }, [tasks, isDaily]);

  // 今日建议：排在最前面的未完成作业任务
  const suggestion = !isDaily ? list.find((t) => !t.done) : undefined;

  function todayCheckIn(taskId: string): CheckIn | undefined {
    return checkins.find((c) => c.taskId === taskId && c.date === today);
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">{meta.icon} {meta.title}</h2>
        <span className="text-xs text-slate-400">{meta.hint}</span>
      </div>

      {/* 添加表单 */}
      <form onSubmit={submit} className="mb-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px_140px_110px_auto]">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isDaily ? "每天要做什么？例如：背单词30个" : "要做什么作业？例如：物理实验报告"}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          />
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="科目"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          />
          {!isDaily ? (
            <>
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
            </>
          ) : (
            <div className="col-span-2 flex items-center rounded-lg bg-emerald-50 px-3 text-xs text-emerald-600">
              ⏰ 每天生效，无需设截止日期
            </div>
          )}
          <button
            type="submit"
            className={`rounded-lg px-5 py-2 text-sm font-semibold text-white ${meta.btnClass}`}
          >
            添加
          </button>
        </div>
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
        {list.length === 0 && (
          <li className="py-8 text-center text-sm text-slate-400">
            {isDaily ? "还没有每日任务，添加一个天天坚持的事吧 🌱" : "还没有作业任务 🎯"}
          </li>
        )}

        {isDaily &&
          list.map((t) => {
            const ci = todayCheckIn(t.id);
            const doneToday = ci?.status === "done";
            const streak = dailyStreak(t.id, checkins);
            return (
              <li
                key={t.id}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                  doneToday ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 hover:border-emerald-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={doneToday}
                  onChange={() => onToggleDaily(t.id, !doneToday)}
                  title="今天完成了吗？"
                  className="h-4 w-4 accent-emerald-600"
                />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium ${doneToday ? "text-emerald-700" : "text-slate-800"}`}>
                    {t.title}
                    {streak > 0 && <span className="ml-2 text-xs text-orange-500">🔥 连续 {streak} 天</span>}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-medium ${subjectColor(t.subject)}`}>{t.subject}</span>
                    <span className="text-slate-400">
                      {doneToday ? "今天已打卡 ✅" : ci?.status === "missed" ? "今天已记未做 ❌" : "今天还没打卡"}
                    </span>
                  </div>
                </div>
                <button onClick={() => setAttachTaskId(t.id)} className="relative text-slate-300 hover:text-indigo-500" title="附件">
                  📎
                  {t.attachments.length > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 rounded-full bg-indigo-600 px-1 text-[9px] text-white">
                      {t.attachments.length}
                    </span>
                  )}
                </button>
                <button onClick={() => onDelete(t.id)} className="text-slate-300 hover:text-rose-500" title="删除">
                  ✕
                </button>
              </li>
            );
          })}

        {!isDaily &&
          list.map((t) => {
            const d = daysUntil(t.deadline);
            const pmeta = PRIORITY_META[t.priority];
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
                    <span className={`rounded-full px-2 py-0.5 font-medium ring-1 ${pmeta.badge}`}>
                      {pmeta.label}优先级
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
                <button onClick={() => setAttachTaskId(t.id)} className="relative text-slate-300 hover:text-indigo-500" title="附件">
                  📎
                  {t.attachments.length > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 rounded-full bg-indigo-600 px-1 text-[9px] text-white">
                      {t.attachments.length}
                    </span>
                  )}
                </button>
                <button onClick={() => onDelete(t.id)} className="text-slate-300 hover:text-rose-500" title="删除">
                  ✕
                </button>
              </li>
            );
          })}
      </ul>

      {/* 附件面板 */}
      {attachTask && (
        <TaskAttachments
          task={attachTask}
          onChange={(updated) => onUpdateTask(updated)}
          onClose={() => setAttachTaskId(null)}
        />
      )}
    </section>
  );
}
