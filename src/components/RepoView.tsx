"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { deleteFileBlob, loadFileBlob, saveFileBlob } from "@/lib/fileStore";
import { uid, type RepoFile } from "@/lib/types";

interface Props {
  files: RepoFile[];
  onChange: (files: RepoFile[]) => void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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

function fileIcon(f: RepoFile): string {
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  if (f.mimeType.startsWith("image/")) return "🖼️";
  if (f.mimeType === "application/pdf" || ext === "pdf") return "📕";
  if (["md", "markdown"].includes(ext)) return "📝";
  if (["doc", "docx"].includes(ext)) return "📘";
  if (["ppt", "pptx"].includes(ext)) return "📊";
  if (["xls", "xlsx", "csv"].includes(ext)) return "📈";
  if (["zip", "rar", "7z"].includes(ext)) return "🗜️";
  if (f.mimeType.startsWith("text/") || ["txt"].includes(ext)) return "📄";
  return "📎";
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

export default function RepoView({ files, onChange }: Props) {
  const [search, setSearch] = useState("");
  const [uploadSubject, setUploadSubject] = useState("通用");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview>({ url: null, text: null });
  const [previewLoading, setPreviewLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
            f.subject.toLowerCase().includes(q)
        )
      : files;
    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  }, [files, search]);

  async function addFiles(fileList: FileList | File[]) {
    const next: RepoFile[] = [];
    for (const file of Array.from(fileList)) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`「${file.name}」超过 50MB，暂不支持存储`);
        continue;
      }
      const id = uid();
      try {
        await saveFileBlob(id, file);
      } catch {
        alert(`「${file.name}」保存失败，浏览器存储空间可能不足`);
        continue;
      }
      next.push({
        id,
        name: file.name,
        subject: uploadSubject.trim() || "通用",
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

  async function removeFile(id: string) {
    const target = files.find((f) => f.id === id);
    if (!target) return;
    if (!confirm(`确定删除「${target.name}」吗？`)) return;
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
    <div className="space-y-4">
      {/* 上传区 */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
        }}
        className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
          dragOver ? "border-indigo-400 bg-indigo-50" : "border-slate-300 bg-white"
        }`}
      >
        <p className="text-sm text-slate-500">
          把笔记文件拖到这里，或
          <button
            onClick={() => inputRef.current?.click()}
            className="mx-1 font-medium text-indigo-600 hover:underline"
          >
            点击选择文件
          </button>
        </p>
        <p className="mt-1 text-xs text-slate-400">
          支持 PDF / Markdown / Word / 图片等任意文件，单个不超过 50MB，文件保存在本机浏览器中
        </p>
        <div className="mt-3 flex items-center justify-center gap-2 text-sm">
          <span className="text-slate-400">归入科目</span>
          <input
            value={uploadSubject}
            onChange={(e) => setUploadSubject(e.target.value)}
            className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-indigo-400"
            placeholder="通用"
          />
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* 文件列表 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 搜索文件名或科目…"
            className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">
              {files.length === 0 ? "仓库还是空的，上传第一个文件吧 📂" : "没有匹配的文件"}
            </p>
          ) : (
            <ul className="max-h-[52vh] space-y-2 overflow-y-auto">
              {filtered.map((f) => (
                <li
                  key={f.id}
                  onClick={() => setActiveId(f.id)}
                  className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                    activeId === f.id
                      ? "border-indigo-300 bg-indigo-50/60"
                      : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xl leading-none">{fileIcon(f)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{f.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                        {editingSubjectId === f.id ? (
                          <input
                            autoFocus
                            defaultValue={f.subject}
                            onClick={(e) => e.stopPropagation()}
                            onBlur={(e) => updateSubject(f.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") updateSubject(f.id, e.currentTarget.value);
                              if (e.key === "Escape") setEditingSubjectId(null);
                            }}
                            className="w-20 rounded border border-indigo-300 px-1 py-0.5 text-xs outline-none"
                          />
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSubjectId(f.id);
                            }}
                            title="点击修改科目"
                            className={`rounded-full px-2 py-0.5 ${subjectColor(f.subject)}`}
                          >
                            {f.subject}
                          </button>
                        )}
                        <span>{formatSize(f.size)}</span>
                        <span>{new Date(f.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(f);
                        }}
                        title="下载"
                        className="rounded-lg px-1.5 py-1 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                      >
                        ⬇️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(f.id);
                        }}
                        title="删除"
                        className="rounded-lg px-1.5 py-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 预览区 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          {!active ? (
            <div className="flex h-full min-h-48 flex-col items-center justify-center text-sm text-slate-400">
              <span className="mb-2 text-3xl">👀</span>
              选择左侧文件查看预览
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <p className="truncate text-sm font-medium text-slate-800">
                  {fileIcon(active)} {active.name}
                </p>
                <button
                  onClick={() => downloadFile(active)}
                  className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs text-white hover:bg-indigo-700"
                >
                  下载
                </button>
              </div>
              {previewLoading ? (
                <p className="py-10 text-center text-sm text-slate-400">加载中…</p>
              ) : kind === "image" && preview.url ? (
                <div className="max-h-[52vh] overflow-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview.url} alt={active.name} className="mx-auto max-w-full rounded-lg" />
                </div>
              ) : kind === "pdf" && preview.url ? (
                <iframe src={preview.url} title={active.name} className="h-[52vh] w-full rounded-lg border border-slate-100" />
              ) : kind === "text" && preview.text !== null ? (
                <pre className="max-h-[52vh] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
                  {preview.text}
                </pre>
              ) : kind === "none" ? (
                <div className="flex flex-col items-center py-10 text-sm text-slate-400">
                  <span className="mb-2 text-3xl">{fileIcon(active)}</span>
                  此文件类型暂不支持在线预览，请下载后查看
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-slate-400">
                  文件内容不存在，可能已被浏览器清理
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
