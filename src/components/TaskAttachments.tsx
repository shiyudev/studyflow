"use client";

import { useRef, useState } from "react";
import { deleteFileBlob, loadFileBlob, saveFileBlob } from "@/lib/fileStore";
import { uid, type Attachment, type Task } from "@/lib/types";

interface Props {
  task: Task;
  onChange: (task: Task) => void;
  onClose: () => void;
}

const KIND_META: Record<Attachment["kind"], { label: string }> = {
  text: { label: "内容" },
  link: { label: "网址" },
  file: { label: "文件" },
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
    <div className="att-overlay" onClick={onClose}>
      <div className="glass att-panel" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 10.5, color: "var(--faint)", letterSpacing: ".2em" }}>任 务 附 件</p>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {task.title}
            </h3>
          </div>
          <button className="tact" onClick={onClose}>✕</button>
        </div>

        {/* 添加区 */}
        <div className="lt-form" style={{ marginBottom: 12 }}>
          <div className="att-tabs">
            {(["text", "link", "file"] as const).map((k) => (
              <button
                key={k}
                className={`chip-btn${tab === k ? " on" : ""}`}
                onClick={() => setTab(k)}
              >
                {KIND_META[k].label}
              </button>
            ))}
          </div>

          {tab === "text" && (
            <>
              <input
                className="inp"
                value={textName}
                onChange={(e) => setTextName(e.target.value)}
                placeholder="标题，如：第三章习题要求"
              />
              <textarea
                className="inp"
                rows={4}
                style={{ resize: "vertical" }}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="把作业要求、题目内容直接粘贴到这里…"
              />
              <button
                className="btn-primary small"
                style={{ alignSelf: "flex-end" }}
                onClick={addText}
                disabled={!textContent.trim()}
              >
                保存内容
              </button>
            </>
          )}

          {tab === "link" && (
            <>
              <input
                className="inp"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="网址，如：learn.tsinghua.edu.cn/…"
              />
              <input
                className="inp"
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                placeholder="备注（可选），如：网络学堂作业入口"
              />
              <button
                className="btn-primary small"
                style={{ alignSelf: "flex-end" }}
                onClick={addLink}
                disabled={!linkUrl.trim()}
              >
                保存网址
              </button>
            </>
          )}

          {tab === "file" && (
            <>
              <button
                className="dropzone"
                style={{ width: "100%", padding: 18, cursor: "pointer", background: "transparent" }}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <span className="dz-main">{uploading ? "上传中…" : "点击选择文件（作业题目 PDF、图片等）"}</span>
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
            </>
          )}
        </div>

        {/* 附件列表 */}
        {task.attachments.length === 0 ? (
          <p className="empty">还没有附件。作业内容、网址、文件都能放在这里</p>
        ) : (
          <div className="task-list" style={{ maxHeight: 224, overflowY: "auto" }}>
            {task.attachments.map((a) => (
              <div key={a.id} style={{ border: "1px solid var(--glass-border)", borderRadius: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px" }}>
                  <button
                    className="grow"
                    style={{
                      background: "none", border: "none", color: "var(--text)", textAlign: "left",
                      fontSize: 13, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}
                    onClick={() => {
                      if (a.kind === "link" && a.url) window.open(a.url, "_blank");
                      else if (a.kind === "file") openFile(a);
                      else setViewTextId(viewTextId === a.id ? null : a.id);
                    }}
                    title={a.kind === "link" ? "打开网址" : a.kind === "file" ? "下载文件" : "查看内容"}
                  >
                    {a.name}
                    {a.kind === "link" && <span style={{ marginLeft: 4, fontSize: 11, color: "var(--faint)" }}>↗</span>}
                  </button>
                  <span style={{ fontSize: 10, color: "var(--faint)", flex: "none" }}>{KIND_META[a.kind].label}</span>
                  <button className="tact" onClick={() => removeAttachment(a)} title="删除附件">✕</button>
                </div>
                {a.kind === "text" && viewTextId === a.id && (
                  <pre className="pretext" style={{ margin: "0 12px 10px", maxHeight: 144 }}>{a.text}</pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
