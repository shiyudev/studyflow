/** 主题相关的小工具（科目 chip 六色与文件角标色，规格书特许的写死色值） */
import type { RepoFile } from "@/lib/types";

const SUBJ_PALETTE = ["#7d9cc8", "#a98ad0", "#d9a860", "#6fb39a", "#d9905c", "#6fb6d8"];

export function subjectColor(subject: string): string {
  let h = 0;
  for (const ch of subject) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return SUBJ_PALETTE[h % SUBJ_PALETTE.length];
}

export interface FileTile {
  tile: string;
  color: string;
}

export function fileTile(f: RepoFile): FileTile {
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  if (["md", "markdown"].includes(ext)) return { tile: "MD", color: "#7d9cc8" };
  if (f.mimeType === "application/pdf" || ext === "pdf") return { tile: "PDF", color: "#d97c6c" };
  if (["doc", "docx"].includes(ext)) return { tile: "DOC", color: "#6fa3d8" };
  if (["ppt", "pptx"].includes(ext)) return { tile: "PPT", color: "#d9a860" };
  if (["xls", "xlsx", "csv"].includes(ext)) return { tile: "XLS", color: "#6fb39a" };
  if (["zip", "rar", "7z"].includes(ext)) return { tile: "ZIP", color: "#9a958c" };
  if (f.mimeType.startsWith("image/")) return { tile: "IMG", color: "#c98ab0" };
  if (f.mimeType.startsWith("text/") || ext === "txt") return { tile: "TXT", color: "#8aa0b8" };
  return { tile: ext.slice(0, 3).toUpperCase() || "FILE", color: "#9a958c" };
}
