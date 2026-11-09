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

function fullDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}月${d.getDate()}日 星期${WEEKDAYS[d.getDay()]}`;
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
    <div className="grid2">
      {/* ============ 每日计划 ============ */}
      <div className="glass card">
        <div className="card-head">
          <h2>每 日 计 划</h2>
          <span className="card-hint">按日期写下详细安排</span>
        </div>

        <div className="datebar">
          <button className="dbtn" onClick={() => setDate(shiftDate(date, -1))} title="前一天">‹</button>
          <div className="datebar-mid">
            <b>{friendlyDate(date)}</b>
            <span>{fullDateLabel(date)}</span>
          </div>
          <button className="dbtn" onClick={() => setDate(shiftDate(date, 1))} title="后一天">›</button>
          <button
            className={`chip-btn${date === todayKey() ? " on" : ""}`}
            onClick={() => setDate(todayKey())}
          >
            今天
          </button>
          <button
            className={`chip-btn${date === shiftDate(todayKey(), 1) ? " on" : ""}`}
            onClick={() => setDate(shiftDate(todayKey(), 1))}
          >
            明天
          </button>
          <input
            type="date"
            className="inp"
            style={{ width: 128, padding: "5px 8px", fontSize: 11.5 }}
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            title="选择日期"
          />
        </div>

        <div className="add-row">
          <input
            type="time"
            className="inp"
            style={{ width: 110 }}
            value={time}
            onChange={(e) => setTime(e.target.value)}
            title="时段（可选）"
          />
          <input
            className="inp grow"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addDaily()}
            placeholder={`${friendlyDate(date)}的计划，如：上午 2 小时数学`}
          />
          <button className="btn-primary small" onClick={addDaily}>添加</button>
        </div>

        <div className="plan-list">
          {dailyPlans.length === 0 ? (
            <p className="empty">这一天还没有计划，写一条吧</p>
          ) : (
            dailyPlans.map((p) => (
              <div key={p.id} className={`plan-item${p.done ? " done" : ""}`}>
                <span className="pbox" onClick={() => toggleDaily(p.id)}>✓</span>
                {p.time && <span className="ptime">{p.time}</span>}
                <span className="pt">{p.content}</span>
                <button className="pdel" onClick={() => removePlan(p.id)} title="删除">✕</button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ============ 长期计划 ============ */}
      <div className="glass card">
        <div className="card-head">
          <h2>长 期 计 划</h2>
          <span className="card-hint">围绕某件事的长期目标</span>
        </div>

        <div className="lt-form">
          <input
            className="inp"
            value={ltTitle}
            onChange={(e) => setLtTitle(e.target.value)}
            placeholder="计划标题，如：期末数学复习"
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11.5, color: "var(--faint)" }}>
            <input type="date" className="inp grow" value={ltStart} onChange={(e) => setLtStart(e.target.value)} title="开始日期（可选）" />
            <span>→</span>
            <input type="date" className="inp grow" value={ltEnd} onChange={(e) => setLtEnd(e.target.value)} title="结束日期（可选）" />
          </div>
          <textarea
            className="inp"
            rows={3}
            style={{ resize: "vertical" }}
            value={ltContent}
            onChange={(e) => setLtContent(e.target.value)}
            placeholder="详细内容：目标是什么、分几个阶段、每阶段做什么…"
          />
          <button className="btn-primary small" style={{ alignSelf: "flex-end" }} onClick={addLong} disabled={!ltTitle.trim()}>
            添加长期计划
          </button>
        </div>

        <div>
          {longPlans.length === 0 ? (
            <p className="empty">还没有长期计划</p>
          ) : (
            longPlans.map((p) => (
              <div key={p.id} className={`lt-item${p.done ? " done" : ""}`}>
                {editingId === p.id && editDraft ? (
                  <div className="lt-form" style={{ marginBottom: 0, background: "transparent", border: "none", padding: 0 }}>
                    <input
                      className="inp"
                      value={editDraft.title ?? ""}
                      onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
                    />
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="date" className="inp grow" value={editDraft.startDate ?? ""}
                        onChange={(e) => setEditDraft({ ...editDraft, startDate: e.target.value || undefined })} />
                      <span style={{ color: "var(--faint)" }}>→</span>
                      <input type="date" className="inp grow" value={editDraft.endDate ?? ""}
                        onChange={(e) => setEditDraft({ ...editDraft, endDate: e.target.value || undefined })} />
                    </div>
                    <textarea
                      className="inp"
                      rows={4}
                      style={{ resize: "vertical" }}
                      value={editDraft.content}
                      onChange={(e) => setEditDraft({ ...editDraft, content: e.target.value })}
                    />
                    <div className="lt-actions">
                      <button className="lt-done" onClick={saveEdit}>保存</button>
                      <button className="lt-edit" onClick={() => setEditingId(null)}>取消</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="lt-title">{p.title}</div>
                    {(p.startDate || p.endDate) && (
                      <div className="lt-meta">{p.startDate ?? "…"} → {p.endDate ?? "…"}</div>
                    )}
                    {p.content && <div className="lt-content">{p.content}</div>}
                    <div className="lt-actions">
                      <button
                        className="lt-done"
                        onClick={() => onChange(plans.map((x) => (x.id === p.id ? { ...x, done: !x.done, updatedAt: Date.now() } : x)))}
                      >
                        {p.done ? "已达成 ✓" : "达成"}
                      </button>
                      <button className="lt-edit" onClick={() => startEdit(p)}>编辑</button>
                      <button className="lt-edit" onClick={() => removePlan(p.id)} title="删除">✕</button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
