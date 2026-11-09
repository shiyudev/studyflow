"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { deleteFileBlob, loadFileBlob, saveFileBlob } from "@/lib/fileStore";
import { uid, type RepoFile } from "@/lib/types";
import { fileTile, subjectColor } from "./theme";

interface Props {
  files: RepoFile[];
  onChange: (files: RepoFile[]) => void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/** 待上传的文件：file 为内容，path 为相对路径（单文件时为空串） */
interface UploadItem {
  file: File;
  path: string;
}

/** 科目推断：用户手填了科目就用手填的；否则文件夹上传时取顶层目录名 */
function inferSubject(path: string, manual: string): string {
  const m = manual.trim();
  if (m && m !== "通用") return m;
  const topDir = path.split("/").filter(Boolean)[0];
  if (topDir && path.includes("/")) return topDir;
  return m || "通用";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

type PreviewKind = "image" | "text" | "pdf" | "none";

function previewKind(f: RepoFile): PreviewKind {
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  if (f.mimeType.startsWith("image/")) return "image";
  if (f.mimeType === "application/pdf" || ext === "pdf") return "pdf";
  if (
    f.mimeType.startsWith("text/") ||
    ["md", "markdown", "txt", "json", "csv", "log"].includes(ext)
  ) {
    return "text";
  }
  return "none";
}

interface Preview {
  url: string | null;
  text: string | null;
}

/** 递归读取拖拽进来的文件系统条目（支持目录） */
async function readEntry(entry: FileSystemEntry, path: string): Promise<UploadItem[]> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) =>
      (entry as FileSystemFileEntry).file(resolve, reject)
    );
    return [{ file, path: path + file.name }];
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    // readEntries 每次最多返回 100 条，需循环读完
    const entries: FileSystemEntry[] = [];
    let batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject)
    );
    while (batch.length > 0) {
      entries.push(...batch);
      batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
        reader.readEntries(resolve, reject)
      );
    }
    const nested = await Promise.all(
      entries.map((e) => readEntry(e, `${path}${entry.name}/`))
    );
    return nested.flat();
  }
  return [];
}

export default function RepoView({ files, onChange }: Props) {
  const [search, setSearch] = useState("");
  const [uploadSubject, setUploadSubject] = useState("通用");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview>({ url: null, text: null });
  const [previewLoading, setPreviewLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const active = files.find((f) => f.id === activeId) ?? null;

  // 加载选中文件的预览内容
  useEffect(() => {
    if (!active) {
      setPreview({ url: null, text: null });
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    setPreviewLoading(true);
    setPreview({ url: null, text: null });

    loadFileBlob(active.id).then(async (blob) => {
      if (cancelled) return;
      setPreviewLoading(false);
      if (!blob) {
        setPreview({ url: null, text: null });
        return;
      }
      const kind = previewKind(active);
      if (kind === "text") {
        const text = await blob.text();
        if (!cancelled) setPreview({ url: null, text });
      } else if (kind !== "none") {
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setPreview({ url: objectUrl, text: null });
      }
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? files.filter(
          (f) =>
            f.name.toLowerCase().includes(q) ||
            (f.path ?? "").toLowerCase().includes(q) ||
            f.subject.toLowerCase().includes(q)
        )
      : files;
    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  }, [files, search]);

  async function addFiles(items: UploadItem[]) {
    const next: RepoFile[] = [];
    for (const { file, path } of items) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`「${path || file.name}」超过 50MB，暂不支持存储`);
        continue;
      }
      const id = uid();
      try {
        await saveFileBlob(id, file);
      } catch {
        alert(`「${path || file.name}」保存失败，浏览器存储空间可能不足`);
        continue;
      }
      next.push({
        id,
        name: file.name,
        path: path || undefined,
        subject: inferSubject(path, uploadSubject),
        mimeType: file.type,
        size: file.size,
        createdAt: Date.now(),
      });
    }
    if (next.length > 0) {
      onChange([...files, ...next]);
      setActiveId(next[next.length - 1].id);
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const entries = Array.from(e.dataTransfer.items)
      .map((item) => item.webkitGetAsEntry())
      .filter((en): en is FileSystemEntry => en !== null);
    if (entries.length > 0) {
      const nested = await Promise.all(entries.map((en) => readEntry(en, "")));
      await addFiles(nested.flat());
    } else if (e.dataTransfer.files.length > 0) {
      await addFiles(
        Array.from(e.dataTransfer.files).map((file) => ({ file, path: "" }))
      );
    }
  }

  async function removeFile(id: string) {
    const target = files.find((f) => f.id === id);
    if (!target) return;
    if (!confirm(`确定删除「${target.path || target.name}」吗？`)) return;
    await deleteFileBlob(id).catch(() => {});
    onChange(files.filter((f) => f.id !== id));
    if (activeId === id) setActiveId(null);
  }

  async function downloadFile(f: RepoFile) {
    const blob = await loadFileBlob(f.id);
    if (!blob) {
      alert("文件内容不存在，可能已被浏览器清理");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function updateSubject(id: string, subject: string) {
    onChange(
      files.map((f) =>
        f.id === id ? { ...f, subject: subject.trim() || "通用" } : f
      )
    );
    setEditingSubjectId(null);
  }

  const kind = active ? previewKind(active) : "none";

  return (
    <>
      {/* 上传区 */}
      <div
        className="glass dropzone"
        style={dragOver ? { borderColor: "var(--accent)" } : undefined}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <p className="dz-main">
          把文件或整个文件夹拖到这里，或
          <button onClick={() => inputRef.current?.click()}>选择文件</button>
          /
          <button onClick={() => folderInputRef.current?.click()}>选择文件夹</button>
        </p>
        <p className="dz-sub">
          支持 PDF / Markdown / Word / 图片等任意文件，单个不超过 50MB；文件夹会保留目录结构，文件夹名自动作为科目
        </p>
        <div className="dz-subject">
          <span>归入科目</span>
          <input
            className="inp"
            value={uploadSubject}
            onChange={(e) => setUploadSubject(e.target.value)}
            placeholder="通用"
          />
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              addFiles(Array.from(e.target.files).map((file) => ({ file, path: "" })));
            }
            e.target.value = "";
          }}
        />
        <input
          ref={(el) => {
            folderInputRef.current = el;
            // React 不认识 webkitdirectory 属性，手动挂载以支持选择文件夹
            el?.setAttribute("webkitdirectory", "");
          }}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              addFiles(
                Array.from(e.target.files).map((file) => ({
                  file,
                  path: file.webkitRelativePath || "",
                }))
              );
            }
            e.target.value = "";
          }}
        />
      </div>

      <div className="repo-grid">
        {/* 文件列表 */}
        <div className="glass card">
          <input
            className="inp"
            style={{ width: "100%", marginBottom: 12 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索文件名、路径或科目…"
          />
          {filtered.length === 0 ? (
            <p className="empty">{files.length === 0 ? "仓库还是空的，上传第一个文件吧" : "没有匹配的文件"}</p>
          ) : (
            <div style={{ maxHeight: "52vh", overflowY: "auto" }}>
              {filtered.map((f) => {
                const ft = fileTile(f);
                const sc = subjectColor(f.subject);
                return (
                  <div
                    key={f.id}
                    className={`file-row${activeId === f.id ? " on" : ""}`}
                    onClick={() => setActiveId(f.id)}
                  >
                    <span className="ftile" style={{ background: ft.color }}>{ft.tile}</span>
                    <div className="fbody">
                      <div className="fname">{f.name}</div>
                      {f.path && f.path.includes("/") && <div className="fpath">{f.path}</div>}
                      <div className="fmeta">
                        {editingSubjectId === f.id ? (
                          <input
                            autoFocus
                            className="inp"
                            style={{ width: 72, padding: "2px 6px", fontSize: 10.5 }}
                            defaultValue={f.subject}
                            onClick={(e) => e.stopPropagation()}
                            onBlur={(e) => updateSubject(f.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") updateSubject(f.id, e.currentTarget.value);
                              if (e.key === "Escape") setEditingSubjectId(null);
                            }}
                          />
                        ) : (
                          <button
                            className="subj"
                            style={{ color: sc, background: `${sc}24`, border: "none", cursor: "pointer" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSubjectId(f.id);
                            }}
                            title="点击修改科目"
                          >
                            {f.subject}
                          </button>
                        )}
                        <span>{formatSize(f.size)}</span>
                        <span>{new Date(f.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      className="tact"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadFile(f);
                      }}
                      title="下载"
                    >
                      下载
                    </button>
                    <button
                      className="tact"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(f.id);
                      }}
                      title="删除"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 预览区 */}
        <div className="glass card preview-box">
          {!active ? (
            <div className="pempty">选择左侧文件查看预览</div>
          ) : (
            <>
              <div className="phead">
                <span className="pname">{active.path || active.name}</span>
                <button className="pdl" onClick={() => downloadFile(active)}>下载</button>
              </div>
              {previewLoading ? (
                <div className="pempty">加载中…</div>
              ) : kind === "image" && preview.url ? (
                <div style={{ flex: 1, overflow: "auto" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview.url} alt={active.name} style={{ maxWidth: "100%", borderRadius: 10, display: "block", margin: "0 auto" }} />
                </div>
              ) : kind === "pdf" && preview.url ? (
                <iframe src={preview.url} title={active.name} style={{ flex: 1, width: "100%", border: "none", borderRadius: 10 }} />
              ) : kind === "text" && preview.text !== null ? (
                <pre className="pretext">{preview.text}</pre>
              ) : kind === "none" ? (
                <div className="pempty">
                  <span className="ftile" style={{ width: 44, height: 44, fontSize: 12, background: fileTile(active).color }}>
                    {fileTile(active).tile}
                  </span>
                  此文件类型暂不支持在线预览，请下载后查看
                </div>
              ) : (
                <div className="pempty">文件内容不存在，可能已被浏览器清理</div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
