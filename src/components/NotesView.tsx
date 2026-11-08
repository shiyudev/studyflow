"use client";

import { useMemo, useState } from "react";
import { uid, type Note } from "@/lib/types";

interface Props {
  notes: Note[];
  onChange: (notes: Note[]) => void;
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

function timeLabel(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (sameDay) return hm;
  return `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}

export default function NotesView({ notes, onChange }: Props) {
  const [activeId, setActiveId] = useState<string | null>(notes[0]?.id ?? null);
  const [search, setSearch] = useState("");

  // 置顶优先，其余按更新时间倒序
  const sorted = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return [...notes]
      .filter(
        (n) =>
          !kw ||
          n.title.toLowerCase().includes(kw) ||
          n.content.toLowerCase().includes(kw) ||
          n.subject.toLowerCase().includes(kw)
      )
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.updatedAt - a.updatedAt;
      });
  }, [notes, search]);

  const active = notes.find((n) => n.id === activeId) ?? null;

  function createNote() {
    const note: Note = {
      id: uid(),
      title: "",
      subject: "通用",
      content: "",
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onChange([note, ...notes]);
    setActiveId(note.id);
  }

  function updateActive(patch: Partial<Note>) {
    if (!active) return;
    onChange(
      notes.map((n) => (n.id === active.id ? { ...n, ...patch, updatedAt: Date.now() } : n))
    );
  }

  function deleteActive() {
    if (!active) return;
    const rest = notes.filter((n) => n.id !== active.id);
    onChange(rest);
    setActiveId(rest[0]?.id ?? null);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
      {/* 左栏：搜索 + 笔记列表 */}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="mb-3 flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索笔记…"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          />
          <button
            onClick={createNote}
            className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            ＋ 新建
          </button>
        </div>

        <ul className="max-h-[60vh] space-y-1.5 overflow-y-auto lg:max-h-[70vh]">
          {sorted.length === 0 && (
            <li className="py-10 text-center text-sm text-slate-400">
              {notes.length === 0 ? "还没有笔记，点「新建」开始记录 ✏️" : "没有匹配的笔记"}
            </li>
          )}
          {sorted.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => setActiveId(n.id)}
                className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  n.id === activeId
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-slate-200 hover:border-indigo-200 hover:bg-slate-50"
                }`}
              >
                <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                  {n.pinned && <span title="已置顶">📌</span>}
                  <span className="truncate">{n.title || "未命名笔记"}</span>
                </p>
                <p className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${subjectColor(n.subject)}`}>
                    {n.subject}
                  </span>
                  <span>{timeLabel(n.updatedAt)}</span>
                </p>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* 右栏：编辑器 */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        {!active ? (
          <div className="flex h-full min-h-64 items-center justify-center text-sm text-slate-400">
            选择左侧笔记，或新建一篇
          </div>
        ) : (
          <div className="flex h-full flex-col gap-3">
            <div className="flex items-center gap-2">
              <input
                value={active.title}
                onChange={(e) => updateActive({ title: e.target.value })}
                placeholder="笔记标题"
                className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1.5 text-lg font-bold text-slate-900 focus:border-indigo-300 focus:outline-none"
              />
              <button
                onClick={() => updateActive({ pinned: !active.pinned })}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  active.pinned
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
                title={active.pinned ? "取消置顶" : "置顶"}
              >
                {active.pinned ? "📌 已置顶" : "📌 置顶"}
              </button>
              <button
                onClick={deleteActive}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-rose-100 hover:text-rose-600"
              >
                删除
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <input
                value={active.subject}
                onChange={(e) => updateActive({ subject: e.target.value || "通用" })}
                placeholder="科目/分类"
                className={`w-24 rounded-full px-2 py-1 text-center text-[11px] font-medium focus:outline-none ${subjectColor(active.subject)}`}
              />
              <span>更新于 {timeLabel(active.updatedAt)}</span>
              <span>{active.content.length} 字</span>
              <span className="ml-auto">自动保存 ✓</span>
            </div>

            <textarea
              value={active.content}
              onChange={(e) => updateActive({ content: e.target.value })}
              placeholder="开始记录……支持多行文本"
              className="min-h-[50vh] flex-1 resize-y rounded-lg border border-slate-200 p-4 font-mono text-sm leading-relaxed text-slate-700 focus:border-indigo-300 focus:outline-none lg:min-h-[58vh]"
            />
          </div>
        )}
      </div>
    </div>
  );
}
