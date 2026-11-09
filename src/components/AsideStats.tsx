"use client";

import { useMemo } from "react";
import { todayKey, type CheckIn, type Task } from "@/lib/types";
import { QUOTES } from "@/hooks/useSceneClock";

interface Props {
  tasks: Task[];
  checkins: CheckIn[];
  phase: string;
}

const DN = ["一", "二", "三", "四", "五", "六", "日"];

/** 每日任务连续打卡天数 */
function streakOf(taskId: string, checkins: CheckIn[]): number {
  const dates = new Set(
    checkins.filter((c) => c.taskId === taskId && c.status === "done").map((c) => c.date)
  );
  let n = 0;
  const d = new Date();
  if (!dates.has(todayKey(d))) d.setDate(d.getDate() - 1);
  while (dates.has(todayKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export default function AsideStats({ tasks, checkins, phase }: Props) {
  const dailyTasks = useMemo(() => tasks.filter((t) => t.type === "daily"), [tasks]);
  const today = todayKey();

  const doneToday = dailyTasks.filter((t) =>
    checkins.some((c) => c.taskId === t.id && c.date === today && c.status === "done")
  ).length;

  // 最长连续打卡
  const best = useMemo(() => {
    let name = "", n = 0;
    for (const t of dailyTasks) {
      const s = streakOf(t.id, checkins);
      if (s > n) { n = s; name = t.title; }
    }
    return { name, n };
  }, [dailyTasks, checkins]);

  // 近 7 天：每天是否有打卡（任一任务 done 即算）
  const weekDots = useMemo(() => {
    const out: { label: string; done: boolean; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = todayKey(d);
      out.push({
        label: DN[(d.getDay() + 6) % 7],
        done: checkins.some((c) => c.date === key && c.status === "done"),
        isToday: i === 0,
      });
    }
    return out;
  }, [checkins]);

  // 近 7 天记录条数（done+missed）
  const weekBars = useMemo(() => {
    const days: { label: string; count: number; isToday: boolean }[] = [];
    let max = 1, total = 0;
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = todayKey(d);
      const count = checkins.filter((c) => c.date === key).length;
      max = Math.max(max, count);
      total += count;
      days.push({ label: DN[(d.getDay() + 6) % 7], count, isToday: i === 0 });
    }
    return { days, max, total };
  }, [checkins]);

  const [quote, quoteSrc] = QUOTES[phase] ?? QUOTES["夜晚"];

  return (
    <aside className="right">
      <div className="vquote">
        <span className="vline" />
        <div className="vq-body">
          <p className="vq-text">{quote}</p>
          {quoteSrc && <span className="vq-src">{quoteSrc}</span>}
          <span className="seal">逐</span>
        </div>
      </div>
      <div className="hr" />
      <div>
        <div className="stat-label">今日打卡</div>
        <div className="stat-num">
          {doneToday}
          <span>/ {dailyTasks.length}</span>
        </div>
        <div className="sdots">
          {weekDots.map((d, i) => (
            <span
              key={i}
              className={`sdot${d.done ? " done" : ""}${d.isToday ? " today" : ""}`}
              title={`周${d.label}`}
            >
              {d.done ? "✓" : ""}
            </span>
          ))}
        </div>
        {best.n > 0 && <p className="stat-note">{best.name}已连续 {best.n} 天 · 全站最长</p>}
      </div>
      <div className="hr" />
      <div>
        <div className="wk-head">
          <span className="stat-label">近 7 天记录</span>
          <span className="wk-total">{weekBars.total} 条</span>
        </div>
        <div className="wk-chart">
          {weekBars.days.map((d, i) => (
            <div key={i} className={`bar-col${d.isToday ? " today" : ""}`}>
              <span className="bval">{d.count} 条</span>
              <span className="bk" style={{ height: `${Math.max(3, (d.count / weekBars.max) * 100)}%` }} />
              <span className="bl">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
