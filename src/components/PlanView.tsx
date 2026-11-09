"use client";

import { useEffect, useMemo, useState } from "react";
import { todayKey, uid, type DayNote, type PlanItem } from "@/lib/types";

interface Props {
  plans: PlanItem[];
  dayNotes: DayNote[];
  onPlansChange: (plans: PlanItem[]) => void;
  onDayNotesChange: (dayNotes: DayNote[]) => void;
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

function fmtHM(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** 当日记录 + 今日反思（按日期绑定；失焦自动保存；key=date 保证切换日期时重置草稿） */
function DayNoteEditor({
  note,
  onSave,
}: {
  note?: DayNote;
  onSave: (record: string, reflection: string) => void;
}) {
  const [record, setRecord] = useState(note?.record ?? "");
  const [reflection, setReflection] = useState(note?.reflection ?? "");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // 云端同步等外部原因导致 note 更新时，草稿跟随重置（key=date 只覆盖切日期场景）
  useEffect(() => {
    setRecord(note?.record ?? "");
    setReflection(note?.reflection ?? "");
  }, [note?.id, note?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  function blur() {
    if (record === (note?.record ?? "") && reflection === (note?.reflection ?? "")) return;
    if (!record.trim() && !reflection.trim() && !note) return; // 全空且原本无记录：不建行
    onSave(record.trim(), reflection.trim());
    setSavedAt(Date.now());
  }

  const hint = savedAt
    ? `已自动保存 ${fmtHM(savedAt)}`
    : note
      ? `最后保存 ${fmtHM(note.updatedAt)}`
      : "失焦自动保存";

  return (
    <div className="note-wrap">
      <div className="note-block">
        <div className="note-label">
          <span>当 日 记 录</span>
          <span className="note-saved">{hint}</span>
        </div>
        <textarea
          className="inp note-ta"
          rows={3}
          value={record}
          onChange={(e) => setRecord(e.target.value)}
          onBlur={blur}
          placeholder="今天实际完成了什么、值得记住的事…"
        />
      </div>
      <div className="note-block">
        <div className="note-label">
          <span>今 日 反 思</span>
        </div>
        <textarea
          className="inp note-ta"
          rows={3}
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          onBlur={blur}
          placeholder="哪里做得好、哪里可以改进、明天怎么调整…"
        />
      </div>
    </div>
  );
}

export default function PlanView({ plans, dayNotes, onPlansChange, onDayNotesChange }: Props) {
  const [date, setDate] = useState(todayKey());
  // 制定 / 查看 双模式（默认查看：呈现计划 + 当日记录反思）
  const [mode, setMode] = useState<"view" | "edit">("view");
  // 每日计划输入
  const [time, setTime] = useState("");
  const [content, setContent] = useState("");
  // 长期计划输入（默认收起，点「制定长期计划」展开）
  const [ltOpen, setLtOpen] = useState(false);
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

  const dayNote = useMemo(() => dayNotes.find((n) => n.date === date), [dayNotes, date]);

  /* ---------- 每日计划 ---------- */
  function addDaily() {
    if (!content.trim()) return;
    const now = Date.now();
    onPlansChange([
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
    onPlansChange(plans.map((p) => (p.id === id ? { ...p, done: !p.done, updatedAt: Date.now() } : p)));
  }

  /* ---------- 当日记录与反思 ---------- */
  function saveDayNote(record: string, reflection: string) {
    const existing = dayNotes.find((n) => n.date === date);
    if (existing) {
      if (!record && !reflection) {
        onDayNotesChange(dayNotes.filter((n) => n.id !== existing.id)); // 清空即删除
      } else {
        onDayNotesChange(
          dayNotes.map((n) => (n.id === existing.id ? { ...n, record, reflection, updatedAt: Date.now() } : n))
        );
      }
    } else {
      onDayNotesChange([...dayNotes, { id: uid(), date, record, reflection, updatedAt: Date.now() }]);
    }
  }

  /* ---------- 长期计划 ---------- */
  function addLong() {
    if (!ltTitle.trim()) return;
    const now = Date.now();
    onPlansChange([
      ...plans,
      {
        id: uid(), type: "longterm", title: ltTitle.trim(),
        startDate: ltStart || undefined, endDate: ltEnd || undefined,
        content: ltContent.trim(), done: false, createdAt: now, updatedAt: now,
      },
    ]);
    setLtTitle(""); setLtStart(""); setLtEnd(""); setLtContent("");
    setLtOpen(false);
  }

  function startEdit(p: PlanItem) {
    setEditingId(p.id);
    setEditDraft({ ...p });
  }

  function saveEdit() {
    if (!editDraft) return;
    onPlansChange(
      plans.map((p) => (p.id === editDraft.id ? { ...editDraft, updatedAt: Date.now() } : p))
    );
    setEditingId(null);
    setEditDraft(null);
  }

  function removePlan(id: string) {
    const p = plans.find((x) => x.id === id);
    if (!p) return;
    if (!confirm(`确定删除${p.type === "daily" ? "这条计划" : `「${p.title}」`}吗？`)) return;
    onPlansChange(plans.filter((x) => x.id !== id));
  }

  return (
    <div className="grid2">
      {/* ============ 每日计划 ============ */}
      <div className="glass card">
        <div className="card-head">
          <h2>每 日 计 划</h2>
          <span className="card-hint">按日期安排 · 当日记录与反思</span>
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

        <div className="modebar">
          <button className={`mode-btn${mode === "view" ? " on" : ""}`} onClick={() => setMode("view")}>
            查看
          </button>
          <button className={`mode-btn${mode === "edit" ? " on" : ""}`} onClick={() => setMode("edit")}>
            制定
          </button>
        </div>

        {mode === "edit" && (
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
        )}

        <div className="plan-list">
          {dailyPlans.length === 0 ? (
            <p className="empty">
              这一天还没有制定计划
              {mode === "view" && (
                <button className="chip-btn" style={{ marginLeft: 10 }} onClick={() => setMode("edit")}>
                  去制定
                </button>
              )}
            </p>
          ) : (
            dailyPlans.map((p) => (
              <div key={p.id} className={`plan-item${p.done ? " done" : ""}`}>
                <span className="pbox" onClick={() => toggleDaily(p.id)}>✓</span>
                {p.time && <span className="ptime">{p.time}</span>}
                <span className="pt">{p.content}</span>
                {mode === "edit" && (
                  <button className="pdel" onClick={() => removePlan(p.id)} title="删除">✕</button>
                )}
              </div>
            ))
          )}
        </div>

        {mode === "view" && (
          <DayNoteEditor key={date} note={dayNote} onSave={saveDayNote} />
        )}
      </div>

      {/* ============ 长期计划 ============ */}
      <div className="glass card">
        <div className="card-head">
          <h2>长 期 计 划</h2>
          <span className="card-hint">围绕某件事的长期目标</span>
        </div>

        {!ltOpen ? (
          <button className="btn-primary small" style={{ alignSelf: "flex-start", marginBottom: 12 }} onClick={() => setLtOpen(true)}>
            + 制定长期计划
          </button>
        ) : (
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
            <div style={{ display: "flex", gap: 8, alignSelf: "flex-end" }}>
              <button className="lt-edit" onClick={() => setLtOpen(false)}>收起</button>
              <button className="btn-primary small" onClick={addLong} disabled={!ltTitle.trim()}>
                添加长期计划
              </button>
            </div>
          </div>
        )}

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
                        onClick={() => onPlansChange(plans.map((x) => (x.id === p.id ? { ...x, done: !x.done, updatedAt: Date.now() } : x)))}
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
