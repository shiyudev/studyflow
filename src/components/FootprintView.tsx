"use client";

import { useMemo } from "react";
import { todayKey, type CheckIn, type DayNote, type PlanItem, type Task } from "@/lib/types";
import CollapsibleCard from "./CollapsibleCard";
import { durationLabel } from "./DailyCheckView";

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

function weekdayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}月${d.getDate()}日 星期${WEEKDAYS[d.getDay()]}`;
}

/**
 * 我的足迹（v1.4）：按日期倒序的时间线——
 * 每天的当日描述、计划与完成状态、打卡记录、当日记录与反思，
 * 以及当天达成的长期计划（含达成反思）。
 */
export default function FootprintView({
  plans,
  dayNotes,
  checkins,
  tasks,
}: {
  plans: PlanItem[];
  dayNotes: DayNote[];
  checkins: CheckIn[];
  tasks: Task[];
}) {
  const today = todayKey();

  const days = useMemo(() => {
    const set = new Set<string>();
    plans.forEach((p) => {
      if (p.type === "daily" && p.date) set.add(p.date);
      if (p.type === "longterm" && p.done && p.completedAt) {
        set.add(todayKey(new Date(p.completedAt)));
      }
    });
    dayNotes.forEach((n) => set.add(n.date));
    checkins.forEach((c) => set.add(c.date));
    return [...set].sort().reverse();
  }, [plans, dayNotes, checkins]);

  const planDone = useMemo(
    () => plans.filter((p) => p.type === "longterm" && p.done && p.completedAt),
    [plans]
  );

  const taskTitle = (id: string) => tasks.find((t) => t.id === id)?.title ?? id;

  if (days.length === 0) {
    return (
      <div className="glass card">
        <div className="card-head">
          <h2>我 的 足 迹</h2>
          <span className="card-hint">按日期保留计划、反思与达成</span>
        </div>
        <p className="empty">还没有足迹——去制定今天的计划、打个卡、写一段反思吧</p>
      </div>
    );
  }

  return (
    <>
      {days.map((date) => {
        const dailyPlans = plans
          .filter((p) => p.type === "daily" && p.date === date)
          .sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99") || a.createdAt - b.createdAt);
        const note = dayNotes.find((n) => n.date === date);
        const dayCheckins = checkins.filter((c) => c.date === date);
        const longDone = planDone.filter((p) => p.completedAt && todayKey(new Date(p.completedAt)) === date);

        const planDoneCount = dailyPlans.filter((p) => p.done).length;
        const ckDone = dayCheckins.filter((c) => c.status === "done").length;
        const hasReflection = Boolean(note?.reflection);
        const summary = [
          dailyPlans.length > 0 ? `计划 ${planDoneCount}/${dailyPlans.length}` : "",
          dayCheckins.length > 0 ? `打卡 ${ckDone}/${dayCheckins.length}` : "",
          longDone.length > 0 ? `达成 ${longDone.length} 项长期计划` : "",
          hasReflection ? "有反思" : "",
          note?.planNote ? "有今日描述" : "",
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <CollapsibleCard
            key={date}
            title={friendlyDate(date)}
            hint={summary || "这一天"}
            defaultOpen={date === today || date === shiftDate(today, -1)}
          >
            <div className="fp-body">
              {/* 今日描述（制定计划时写的计划日志） */}
              {note?.planNote && (
                <div className="note-plan">
                  <span className="note-plan-label">今 日 描 述</span>
                  <p>{note.planNote}</p>
                </div>
              )}

              {/* 当日计划 */}
              {dailyPlans.length > 0 && (
                <div className="fp-sec">
                  <div className="fp-sec-title">
                    当 日 计 划 <span>{planDoneCount}/{dailyPlans.length}</span>
                  </div>
                  <div className="plan-list">
                    {dailyPlans.map((p) => (
                      <div key={p.id} className={`plan-item${p.done ? " done" : ""}`}>
                        <span className="pbox" style={{ cursor: "default" }}>✓</span>
                        {p.time && <span className="ptime">{p.time}</span>}
                        <span className="pt">{p.content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 打卡记录 */}
              {dayCheckins.length > 0 && (
                <div className="fp-sec">
                  <div className="fp-sec-title">
                    打 卡 记 录 <span>{ckDone}/{dayCheckins.length}</span>
                  </div>
                  {dayCheckins.map((c) => (
                    <div key={c.id} className="fp-ck-row">
                      <span className={`fp-ck-dot${c.status === "done" ? " yes" : " no"}`}>
                        {c.status === "done" ? "✓" : "✗"}
                      </span>
                      <span className="fp-ck-task">{taskTitle(c.taskId)}</span>
                      {c.status === "done" && c.duration ? (
                        <span className="fp-ck-meta">用时 {durationLabel(c.duration)}</span>
                      ) : c.reason ? (
                        <span className="fp-ck-meta">{c.reason}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              {/* 当日记录与反思 */}
              {note && (note.record || note.reflection) && (
                <div className="fp-sec">
                  {note.record && (
                    <>
                      <div className="fp-sec-title">当 日 记 录</div>
                      <p className="fp-text">{note.record}</p>
                    </>
                  )}
                  {note.reflection && (
                    <>
                      <div className="fp-sec-title">今 日 反 思</div>
                      <p className="fp-text">{note.reflection}</p>
                    </>
                  )}
                </div>
              )}

              {/* 当天达成的长期计划 */}
              {longDone.length > 0 && (
                <div className="fp-sec">
                  <div className="fp-sec-title">达 成 长 期 计 划</div>
                  {longDone.map((p) => (
                    <div key={p.id} className="fp-lt">
                      <div className="fp-lt-title">✓ {p.title ?? p.content}</div>
                      {p.reflection && <p className="fp-text">{p.reflection}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleCard>
        );
      })}
      <p className="card-hint" style={{ textAlign: "center", paddingBottom: 4 }}>
        {weekdayLabel(today)} · 共 {days.length} 天有足迹
      </p>
    </>
  );
}
