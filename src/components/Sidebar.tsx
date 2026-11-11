"use client";

import type { ReactNode } from "react";

export type View = "plan" | "dailyTasks" | "homeworkTasks" | "repo" | "footprint";

interface Props {
  view: View;
  onChange: (view: View) => void;
  pendingCount: number;
  /** 今日未打卡的每日任务数 */
  dailyUnchecked: number;
  /** 场景时间预览（useSceneClock 透传） */
  previewMin: number | null;
  ff: boolean;
  effectiveMin: number;
  setPreview: (v: number | null) => void;
  toggleFF: () => void;
}

const NAV_ITEMS: { key: View; label: string; icon: ReactNode }[] = [
  {
    key: "plan",
    label: "计划",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    key: "dailyTasks",
    label: "今日任务",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4M9 12h7M9 16h7" />
      </svg>
    ),
  },
  {
    key: "homeworkTasks",
    label: "作业任务",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5c-2-2-5-2-7-1v15c2-1 5-1 7 1 2-2 5-2 7-1V4c-2-1-5-1-7 1z" /><path d="M12 5v15" />
      </svg>
    ),
  },
  {
    key: "footprint",
    label: "我的足迹",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="2.2" /><circle cx="18" cy="18" r="2.2" />
        <path d="M7.5 7.5c4 1 6 3 8 8" strokeDasharray="3 2.2" />
      </svg>
    ),
  },
  {
    key: "repo",
    label: "学习仓库",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
];

function fmtMin(m: number): string {
  return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(Math.floor(m % 60)).padStart(2, "0")}`;
}

export default function Sidebar({
  view, onChange, pendingCount, dailyUnchecked,
  previewMin, ff, effectiveMin, setPreview, toggleFF,
}: Props) {
  return (
    <aside className="side">
      <div className="logo">
        <div className="logo-mark">
          <svg viewBox="0 0 48 28">
            <rect x="3" y="5" width="30" height="14" rx="3" fill="currentColor" />
            <path d="M5 5 h26 v-2.2 a3 3 0 0 0 -3 -2.8 h-20 a3 3 0 0 0 -3 2.8 z" fill="currentColor" />
            <rect x="29" y="16" width="9" height="4.5" rx="1.2" fill="currentColor" />
            <circle cx="12" cy="21.5" r="3.2" fill="rgba(0,0,0,.3)" />
            <circle cx="26" cy="21.5" r="3.2" fill="rgba(0,0,0,.3)" />
            <rect x="7.5" y="8" width="5" height="5" rx="1" fill="#fff" opacity=".9" />
            <rect x="15" y="8" width="5" height="5" rx="1" fill="#fff" opacity=".9" />
            <rect x="22.5" y="8" width="4" height="5" rx="1" fill="#ffd9a0" />
          </svg>
        </div>
        <div className="logo-text">
          <b>StudyFlow</b>
          <span>你的智能学习搭子</span>
        </div>
      </div>
      <div className="logo sub-row"><span>STUDYFLOW · 逐光</span></div>

      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`nav-item${view === item.key ? " on" : ""}`}
            onClick={() => onChange(item.key)}
          >
            {item.icon}
            {item.label}
            {item.key === "homeworkTasks" && pendingCount > 0 && (
              <span className="nav-badge">{pendingCount}</span>
            )}
            {item.key === "dailyTasks" && dailyUnchecked > 0 && (
              <span className="nav-badge">{dailyUnchecked}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="spacer" />
      <p className="sync-note">
        数据已云端同步（Supabase）
        <br />
        换设备打开也能看到同一份数据
      </p>

      <div className="mode-card glass">
        <div className="mc-title">时 间 预 览</div>
        <div className="pv-row">
          <span>全天任意时刻</span>
          <b>{fmtMin(effectiveMin)}</b>
        </div>
        <input
          type="range"
          min={0}
          max={1439}
          step={1}
          value={previewMin ?? Math.round(effectiveMin)}
          onChange={(e) => setPreview(Number(e.target.value))}
        />
        <div className="pv-btns">
          <button className="mini" onClick={() => setPreview(null)}>此刻</button>
          <button className="mini" onClick={toggleFF}>{ff ? "停止快进" : "快进一日"}</button>
        </div>
      </div>
    </aside>
  );
}
