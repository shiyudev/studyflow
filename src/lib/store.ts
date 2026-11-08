"use client";

import { useEffect, useState } from "react";
import type { AppState } from "./types";

const STORAGE_KEY = "studyflow-state-v1";

const initialState: AppState = { tasks: [], focusLog: {} };

/**
 * 把应用状态持久化到 localStorage。
 * 黑客松 MVP 阶段不接后端，刷新/重开页面数据不丢。
 */
export function useAppState(): [AppState, React.Dispatch<React.SetStateAction<AppState>>, boolean] {
  const [state, setState] = useState<AppState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setState(JSON.parse(raw));
      }
    } catch {
      // 忽略损坏数据
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  return [state, setState, hydrated];
}
