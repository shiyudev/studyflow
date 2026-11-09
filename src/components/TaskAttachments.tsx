"use client";

import { useRef, useState } from "react";
import { deleteFileBlob, loadFileBlob, saveFileBlob } from "@/lib/fileStore";
import { uid, type Attachment, type Task } from "@/lib/types";

interface Props {
  task: Task;
  onChange: (task: Task) => void;
  onClose: () => void;
}

const KIND_META: Record<Attachment["kind"], { icon: string; label: string }> = {
  text: { icon: "📝", label: "内容" },
  link: { icon: "🔗", label: "网址" },
  file: { icon: "📄", label: "文件" },
};

export default function TaskAttachments({ task, onChange, onClose }: Props) {
  const [tab, setTab] = useState<"text" | "link" | "file">("text");
  const [textName, setTextName] = useState("");
  const [textContent, setTextContent] = useState("");
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [viewTextId, setViewTextId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function update(attachments: Attachment[]) {
    onChange({ ...task, attachments });
  }

  function addText() {
    if (!textContent.trim()) return;
    update([
      ...task.attachments,
      {
        id: uid(),
        kind: "text",
        name: textName.trim() || "作业内容",
        text: textContent.trim(),
        createdAt: Date.now(),
      },
    ]);
    setTextName("");
    setTextContent("");
  }

  function addLink() {
    let url = linkUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    update([
      ...task.attachments,
      {
        id: uid(),
        kind: "link",
        name: linkName.trim() || url,
        url,
        createdAt: Date.now(),
      },
    ]);
    setLinkName("");
    setLinkUrl("");
  }

  async function addFile(fileList: FileList) {
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        if (file.size > 50 * 1024 * 1024) {
          alert(`「${file.name}」超过 50MB，请放到学习仓库后再用网址关联`);
          continue;
        }
        const fileId = `att-${uid()}`;
        try {
          await saveFileBlob(fileId, file);
        } catch {
          alert(`「${file.name}」上传失败`);
          continue;
        }
        update([
          ...task.attachments,
          { id: uid(), kind: "file", name: file.name, fileId, createdAt: Date.now() },
        ]);
      }
    } finally {
      setUploading(false);
    }
  }

  async function openFile(a: Attachment) {
    if (!a.fileId) return;
    const blob = await loadFileBlob(a.fileId);
    if (!blob) {
      alert("文件内容不存在，可能已被清理");
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = a.name;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function removeAttachment(a: Attachment) {
    if (a.kind === "file" && a.fileId) {
      await deleteFileBlob(a.fileId).catch(() => {});
    }
    update(task.attachments.filter((x) => x.id !== a.id));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-slate-400">任务附件</p>
            <h3 className="truncate text-base font-semibold text-slate-800">{task.title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        {/* 添加区 */}
        <div className="mb-4 rounded-xl border border-slate-200 p-3">
          <div className="mb-2 flex gap-1.5">
            {(["text", "link", "file"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`rounded-lg px-3 py-1 text-xs font-medium ${
                  tab === k ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {KIND_META[k].icon} {KIND_META[k].label}
              </button>
            ))}
          </div>

          {tab === "text" && (
            <div className="space-y-2">
              <input
                value={textName}
                onChange={(e) => setTextName(e.target.value)}
                placeholder="标题，如：第三章习题要求"
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400"
              />
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="把作业要求、题目内容直接粘贴到这里…"
                rows={4}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400"
              />
              <button
                onClick={addText}
                disabled={!textContent.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
              >
                保存内容
              </button>
            </div>
          )}

          {tab === "link" && (
            <div className="space-y-2">
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="网址，如：learn.tsinghua.edu.cn/…"
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400"
              />
              <input
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                placeholder="备注（可选），如：网络学堂作业入口"
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400"
              />
              <button
                onClick={addLink}
                disabled={!linkUrl.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
              >
                保存网址
              </button>
            </div>
          )}

          {tab === "file" && (
            <div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full rounded-lg border-2 border-dashed border-slate-300 py-5 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-50"
              >
                {uploading ? "上传中…" : "点击选择文件（作业题目 PDF、图片等）"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFile(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          )}
        </div>

        {/* 附件列表 */}
        {task.attachments.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">
            还没有附件。作业内容、网址、文件都能放在这里，随任务一起保存
          </p>
        ) : (
          <ul className="max-h-56 space-y-1.5 overflow-y-auto">
            {task.attachments.map((a) => (
              <li key={a.id} className="rounded-lg border border-slate-100 bg-slate-50/60">
                <div className="flex items-center gap-2 px-3 py-2">
                  <span>{KIND_META[a.kind].icon}</span>
                  <button
                    onClick={() => {
                      if (a.kind === "link" && a.url) window.open(a.url, "_blank");
                      else if (a.kind === "file") openFile(a);
                      else setViewTextId(viewTextId === a.id ? null : a.id);
                    }}
                    className="min-w-0 flex-1 truncate text-left text-sm text-slate-700 hover:text-indigo-600"
                    title={a.kind === "link" ? "打开网址" : a.kind === "file" ? "下载文件" : "查看内容"}
                  >
                    {a.name}
                    {a.kind === "link" && <span className="ml-1 text-xs text-slate-400">↗</span>}
                  </button>
                  <span className="text-[10px] text-slate-400">{KIND_META[a.kind].label}</span>
                  <button
                    onClick={() => removeAttachment(a)}
                    className="text-slate-300 hover:text-rose-500"
                    title="删除附件"
                  >
                    ✕
                  </button>
                </div>
                {a.kind === "text" && viewTextId === a.id && (
                  <pre className="mx-3 mb-2 max-h-36 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-2.5 text-xs leading-relaxed text-slate-600 ring-1 ring-slate-200">
                    {a.text}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
