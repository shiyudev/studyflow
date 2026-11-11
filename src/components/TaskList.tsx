"use client";

import { useMemo, useState } from "react";
import { detectPriority, PRIORITY_META } from "@/lib/priority";
import { daysUntil, formatDeadline, todayKey, uid, type CheckIn, type Task, type TaskType } from "@/lib/types";
import { subjectColor } from "./theme";
import CollapsibleCard from "./CollapsibleCard";
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

const TYPE_META: Record<TaskType, { title: string; hint: string }> = {
  daily: {
    title: "打 卡 任 务",
    hint: "添加后每天固定要做，一次添加天天生效，在下方打卡记录",
  },
  homework: {
    title: "作 业 任 务",
    hint: "按截止日期布置的任务，附件可挂作业内容/网址/文件",
  },
};

const PR_CLASS: Record<string, string> = {
  high: "pr-high",
  medium: "pr-mid",
  low: "pr-low",
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
    <>
    {/* v1.3：整卡可折叠（默认展开），内容长时一键收起 */}
    <CollapsibleCard title={meta.title} hint={meta.hint}>
      {/* 添加表单 */}
      <form onSubmit={submit} className="add-row" style={{ marginBottom: previewPriority ? 6 : 12 }}>
        <input
          className="inp grow"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isDaily ? "每天要做什么？例如：背单词 30 个" : "要做什么作业？例如：物理实验报告"}
        />
        <input
          className="inp"
          style={{ width: 100 }}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="科目"
        />
        {!isDaily && (
          <>
            <input
              type="date"
              className="inp"
              style={{ width: 130 }}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
            <input
              type="time"
              className="inp"
              style={{ width: 100 }}
              value={deadlineTime}
              onChange={(e) => setDeadlineTime(e.target.value)}
              title="截止时刻（可选，不填则只精确到日）"
            />
          </>
        )}
        {isDaily && (
          <span className="mini-note" style={{ alignSelf: "center", flex: "none" }}>
            每天生效，无需设截止日期
          </span>
        )}
        <button type="submit" className="btn-primary small">添加</button>
      </form>

      {previewPriority && (
        <p className="smart-line">
          智能识别：该任务优先级为
          <span className={`pr-badge ${PR_CLASS[previewPriority]}`}>{PRIORITY_META[previewPriority].label}优先级</span>
        </p>
      )}

      {suggestion && (
        <div className="sug-strip">
          建议优先完成 <b>「{suggestion.title}」</b>（{PRIORITY_META[suggestion.priority].label}优先级）——{" "}
          {daysUntil(suggestion.deadline) < 0 ? (
            <b>已逾期 {-daysUntil(suggestion.deadline)} 天，尽快处理！</b>
          ) : daysUntil(suggestion.deadline) === 0 ? (
            <b>今天{suggestion.deadlineTime ? ` ${suggestion.deadlineTime} ` : ""}截止！</b>
          ) : (
            <>距离截止还有 {daysUntil(suggestion.deadline)} 天。</>
          )}
        </div>
      )}

      <div className="task-list">
        {list.length === 0 && (
          <p className="empty">{isDaily ? "还没有每日任务，添加一个天天坚持的事吧" : "还没有作业任务"}</p>
        )}

        {isDaily &&
          list.map((t) => {
            const ci = todayCheckIn(t.id);
            const doneToday = ci?.status === "done";
            const streak = dailyStreak(t.id, checkins);
            const sc = subjectColor(t.subject);
            return (
              <div key={t.id} className={`task-item${doneToday ? " done" : ""}`}>
                <span className="tbox" onClick={() => onToggleDaily(t.id, !doneToday)} title="今天完成了吗？">✓</span>
                <div className="tbody">
                  <div className="tt">
                    {t.title}
                    {streak > 0 && <span className="tstreak"> · 连续 {streak} 天</span>}
                  </div>
                  <div className="tmeta">
                    <span className="subj" style={{ color: sc, background: `${sc}24` }}>{t.subject}</span>
                    {doneToday ? (
                      <span className="tstatus done">今天已打卡</span>
                    ) : ci?.status === "missed" ? (
                      <span className="tstatus missed">今天已记未做</span>
                    ) : (
                      <span>今天还没打卡</span>
                    )}
                  </div>
                </div>
                <button className="tact" onClick={() => setAttachTaskId(t.id)} title="附件">
                  {t.attachments.length > 0 ? `附件${t.attachments.length}` : "附件"}
                </button>
                <button className="tact" onClick={() => onDelete(t.id)} title="删除">✕</button>
              </div>
            );
          })}

        {!isDaily &&
          list.map((t) => {
            const d = daysUntil(t.deadline);
            const pmeta = PRIORITY_META[t.priority];
            const sc = subjectColor(t.subject);
            return (
              <div key={t.id} className={`task-item${t.done ? " done" : ""}`}>
                <span className="tbox" onClick={() => onToggle(t.id)}>✓</span>
                <div className="tbody">
                  <div className="tt">{t.title}</div>
                  <div className="tmeta">
                    <span className={`pr-badge ${PR_CLASS[t.priority]}`}>{pmeta.label}优先级</span>
                    <span className="subj" style={{ color: sc, background: `${sc}24` }}>{t.subject}</span>
                    {t.done ? (
                      <span>已完成</span>
                    ) : d < 0 ? (
                      <span className="dl-warn">已逾期 {-d} 天 · {formatDeadline(t)}</span>
                    ) : d === 0 ? (
                      <span className="dl-warn">今天{t.deadlineTime ? ` ${t.deadlineTime} ` : ""}截止</span>
                    ) : (
                      <span>{d} 天后截止 · {formatDeadline(t)}</span>
                    )}
                  </div>
                </div>
                <button className="tact" onClick={() => setAttachTaskId(t.id)} title="附件">
                  {t.attachments.length > 0 ? `附件${t.attachments.length}` : "附件"}
                </button>
                <button className="tact" onClick={() => onDelete(t.id)} title="删除">✕</button>
              </div>
            );
          })}
      </div>

    </CollapsibleCard>

    {/* 附件面板（模态放在折叠卡外，避免收起时被卸载） */}
    {attachTask && (
      <TaskAttachments
        task={attachTask}
        onChange={(updated) => onUpdateTask(updated)}
        onClose={() => setAttachTaskId(null)}
      />
    )}
    </>
  );
}
