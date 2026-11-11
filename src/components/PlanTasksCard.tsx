"use client";

import { useMemo } from "react";
import { todayKey, type PlanItem } from "@/lib/types";
import CollapsibleCard from "./CollapsibleCard";

/**
 * 计划任务卡（v1.4）：今日任务专栏的一部分。
 * 展示今天的每日计划（每天不同，在计划页制定），勾选完成与计划页实时联动。
 */
export default function PlanTasksCard({
  plans,
  onToggle,
  onGoPlan,
}: {
  plans: PlanItem[];
  onToggle: (id: string) => void;
  onGoPlan: () => void;
}) {
  const todayPlans = useMemo(
    () =>
      plans
        .filter((p) => p.type === "daily" && p.date === todayKey())
        .sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99") || a.createdAt - b.createdAt),
    [plans]
  );
  const doneCount = todayPlans.filter((p) => p.done).length;

  return (
    <CollapsibleCard
      title="计 划 任 务"
      hint={`今天的计划 · 完成 ${doneCount}/${todayPlans.length} · 在计划页制定`}
    >
      {todayPlans.length === 0 ? (
        <p className="empty">
          今天还没有计划任务
          <button className="chip-btn" style={{ marginLeft: 10 }} onClick={onGoPlan}>
            去计划页制定
          </button>
        </p>
      ) : (
        <div className="plan-list">
          {todayPlans.map((p) => (
            <div key={p.id} className={`plan-item${p.done ? " done" : ""}`}>
              <span className="pbox" onClick={() => onToggle(p.id)}>✓</span>
              {p.time && <span className="ptime">{p.time}</span>}
              <span className="pt">{p.content}</span>
            </div>
          ))}
        </div>
      )}
    </CollapsibleCard>
  );
}
