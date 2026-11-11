"use client";

import { useMemo, useState } from "react";
import { todayKey, type CheckIn, type Task } from "@/lib/types";
import CollapsibleCard from "./CollapsibleCard";

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
  return `${d.getMonth() + 1}/${d.getDate()}`;
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

/** 反思/用时填写表单（打卡与反馈共用交互） */
export function ReflectionForm({
  defaultReason,
  defaultDuration,
  reasonRequired,
  reasonPlaceholder,
  submitText,
  cancelText = "收起",
  onSubmit,
  onCancel,
}: {
  defaultReason: string;
  defaultDuration?: number;
  reasonRequired?: boolean;
  reasonPlaceholder: string;
  submitText: string;
  /** 取消按钮文案（v1.3 起默认「收起」= 纯合上表单，不产生任何记录） */
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
    <div className="reflect">
      <textarea
        autoFocus
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={reasonPlaceholder}
      />
      <div className="reflect-row">
        <span className="lbl">用时</span>
        <input
          type="number"
          min={1}
          className="inp"
          style={{ width: 76, padding: "4px 8px", fontSize: 11.5 }}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="分钟"
        />
        {[15, 30, 45, 60].map((m) => (
          <button
            key={m}
            type="button"
            className={`rchip${duration === String(m) ? " on" : ""}`}
            onClick={() => setDuration(String(m))}
          >
            {m}′
          </button>
        ))}
        <span className="flex1" />
        {onCancel && (
          <button className="ck-btn" onClick={onCancel}>{cancelText}</button>
        )}
        <button className="ck-btn solid" onClick={submit}>{submitText}</button>
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

  const todayDone = tasks.filter((t) => findCheckIn(t.id, today)?.status === "done").length;
  const todayMissed = tasks.filter((t) => findCheckIn(t.id, today)?.status === "missed").length;
  const todayFullLabel = (() => {
    const d = new Date();
    return `${d.getMonth() + 1}月${d.getDate()}日 星期${WEEKDAYS[d.getDay()]}`;
  })();

  return (
    <>
      {/* 今日打卡（可折叠） */}
      <CollapsibleCard
        title="今 日 打 卡"
        hint={`${todayFullLabel} · ${tasks.length} 项 · 已完成 ${todayDone} · 未做 ${todayMissed}`}
      >

        {tasks.length === 0 ? (
          <p className="empty">还没有打卡任务。先在上方「打卡任务」卡里添加一个，比如「背单词 30 个」</p>
        ) : (
          <div className="ck-list">
            {tasks.map((t) => {
              const ci = findCheckIn(t.id, today);
              return (
                <div
                  key={t.id}
                  className={`ck-item${ci?.status === "done" ? " done" : ci?.status === "missed" ? " missed" : ""}`}
                >
                  <div className="ck-top">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="ck-title">{t.title}</div>
                      {ci && (
                        <div className="ck-status">
                          <span className={ci.status === "done" ? "done" : "missed"}>
                            {ci.status === "done" ? "已完成" : "没做"}
                          </span>{" "}
                          <span className="dim">
                            {timeLabel(ci.createdAt)}
                            {ci.duration ? ` · 用时 ${durationLabel(ci.duration)}` : ""}
                          </span>
                        </div>
                      )}
                      {ci?.reason && (
                        <div className="ck-status">
                          <span className="dim">
                            {ci.status === "done" ? "备注：" : "反思："}
                            {ci.reason}
                          </span>
                        </div>
                      )}
                      {!ci && (
                        <div className="ck-status"><span className="dim">今天还没打卡</span></div>
                      )}
                    </div>
                    <div className="ck-btns">
                      {ci ? (
                        <>
                          <button
                            className="ck-btn"
                            onClick={() => setFormFor(formFor === `edit:${t.id}` ? null : `edit:${t.id}`)}
                          >
                            {ci.reason || ci.duration ? "修改反思/用时" : ci.status === "done" ? "写完成情况" : "写反思"}
                          </button>
                          <button className="ck-btn" onClick={() => onRemove(t.id, today)}>撤销</button>
                        </>
                      ) : (
                        <>
                          <button
                            className="ck-btn solid"
                            onClick={() => setFormFor(formFor === `new:done:${t.id}` ? null : `new:done:${t.id}`)}
                          >
                            完成
                          </button>
                          <button
                            className="ck-btn"
                            onClick={() => setFormFor(formFor === `new:missed:${t.id}` ? null : `new:missed:${t.id}`)}
                          >
                            没做
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 完成：可选填反思/用时；「收起」只是合上表单，不产生记录 */}
                  {formFor === `new:done:${t.id}` && (
                    <ReflectionForm
                      defaultReason=""
                      reasonPlaceholder="完成情况/心得（可选）：如 20 分钟背完 30 个，错了 3 个"
                      submitText="保存完成"
                      onSubmit={(reason, duration) => {
                        onRecord(t.id, today, "done", reason, duration);
                        setFormFor(null);
                      }}
                      onCancel={() => setFormFor(null)}
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
                        setFormFor(null);
                      }}
                      onCancel={() => setFormFor(null)}
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
                        setFormFor(null);
                      }}
                      onCancel={() => setFormFor(null)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleCard>

      {/* 日期记录表（可折叠，默认收起——内容长，按需展开） */}
      <CollapsibleCard
        title="日 期 记 录 表"
        hint="最近 14 天 · ✓ 完成 · ✗ 没做（悬停看反思）· — 无记录"
        defaultOpen={false}
      >
        {tasks.length === 0 ? (
          <p className="empty">暂无记录</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="ctable">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>日期</th>
                  {tasks.map((t) => (
                    <th key={t.id} title={t.title}>{t.title.length > 4 ? t.title.slice(0, 4) : t.title}</th>
                  ))}
                  <th>完成率</th>
                </tr>
              </thead>
              <tbody>
                {days.map((date) => {
                  const records = tasks.map((t) => findCheckIn(t.id, date));
                  const doneCount = records.filter((r) => r?.status === "done").length;
                  const isToday = date === today;
                  return (
                    <tr key={date} className={isToday ? "today" : ""}>
                      <td className="date-cell">
                        {dateLabel(date)}{isToday && "（今天）"}
                      </td>
                      {records.map((r, i) => (
                        <td key={tasks[i].id}>
                          {r?.status === "done" ? (
                            <span
                              className="cell-yes"
                              title={`备注：${r.reason ?? "（无）"}${r.duration ? `\n用时：${durationLabel(r.duration)}` : ""}`}
                            >
                              ✓
                            </span>
                          ) : r?.status === "missed" ? (
                            <span className="cell-no" title={`反思：${r.reason ?? "（未填原因）"}`}>✗</span>
                          ) : (
                            <span className="cell-none">—</span>
                          )}
                        </td>
                      ))}
                      <td>{records.some(Boolean) ? `${doneCount}/${tasks.length}` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleCard>
    </>
  );
}
