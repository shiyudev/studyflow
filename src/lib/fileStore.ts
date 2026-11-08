"use client";

/**
 * 学习仓库的文件内容存储。
 * v0.7 起主存储为 Supabase Storage（云端，清缓存/换设备不丢）；
 * v0.6 曾存 IndexedDB，读取时自动回退并把旧文件迁移上云。
 * 另有内存缓存避免同一会话重复下载。
 */

import { supabase } from "./supabase";

const BUCKET = "repo-files";
const memCache = new Map<string, Blob>();

/* ---------- legacy：v0.6 的 IndexedDB 本地存储（只读迁移用） ---------- */

const DB_NAME = "studyflow-files";
const STORE_NAME = "blobs";

function openLegacyDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadLegacy(id: string): Promise<Blob | null> {
  try {
    const db = await openLegacyDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result instanceof Blob ? req.result : null);
      req.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

async function deleteLegacy(id: string): Promise<void> {
  try {
    const db = await openLegacyDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => resolve();
    });
  } catch {
    // 忽略
  }
}

/* ---------- 对外 API（与 v0.6 保持一致，RepoView 无需改动） ---------- */

export async function saveFileBlob(id: string, blob: Blob): Promise<void> {
  if (!supabase) throw new Error("后端未配置");
  const { error } = await supabase.storage.from(BUCKET).upload(id, blob, {
    contentType: blob.type || "application/octet-stream",
    upsert: true,
  });
  if (error) throw error;
  memCache.set(id, blob);
}

export async function loadFileBlob(id: string): Promise<Blob | null> {
  const cached = memCache.get(id);
  if (cached) return cached;

  if (supabase) {
    const { data, error } = await supabase.storage.from(BUCKET).download(id);
    if (!error && data) {
      memCache.set(id, data);
      return data;
    }
  }

  // 回退：v0.6 时代存在 IndexedDB 的旧文件 → 迁移上云后返回
  const legacy = await loadLegacy(id);
  if (legacy) {
    memCache.set(id, legacy);
    if (supabase) {
      saveFileBlob(id, legacy)
        .then(() => deleteLegacy(id))
        .catch(() => {});
    }
  }
  return legacy;
}

export async function deleteFileBlob(id: string): Promise<void> {
  memCache.delete(id);
  await deleteLegacy(id);
  if (supabase) {
    await supabase.storage.from(BUCKET).remove([id]);
  }
}
