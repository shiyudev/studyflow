"use client";

/**
 * 学习仓库的文件内容存储。
 * localStorage 不适合存二进制大文件，改用 IndexedDB 存 Blob，
 * 元信息（文件名/科目/大小）仍走 localStorage 的 AppState。
 */

const DB_NAME = "studyflow-files";
const STORE_NAME = "blobs";

function openDB(): Promise<IDBDatabase> {
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

function run<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const req = fn(tx.objectStore(STORE_NAME));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function saveFileBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDB();
  await run(db, "readwrite", (s) => s.put(blob, id));
}

export async function loadFileBlob(id: string): Promise<Blob | null> {
  const db = await openDB();
  const result = await run(db, "readonly", (s) => s.get(id));
  return result instanceof Blob ? result : null;
}

export async function deleteFileBlob(id: string): Promise<void> {
  const db = await openDB();
  await run(db, "readwrite", (s) => s.delete(id));
}
