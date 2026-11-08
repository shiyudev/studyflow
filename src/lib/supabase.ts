"use client";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** 是否已配置 Supabase 后端（未配置时应用退化为纯本地模式） */
export const hasBackend = Boolean(url && key);

export const supabase = hasBackend
  ? createClient(url as string, key as string)
  : null;
