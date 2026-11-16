# StudyFlow「学习搭子」AI 聊天 · 实现规格书（给 DeepWorks）

> 版本 v1 · 2026-11-16 · 由 Claude 撰写，DeepWorks 负责实现
>
> 目标：在 StudyFlow 里加一个右下角悬浮的「学习搭子」AI 聊天窗。
> 后端走 DeepSeek API（流式 SSE），key 只存在服务端 `.env.local`，不暴露给浏览器。

---

## 0. 一键提示词（复制整段喂给 DeepWorks）

```
在 StudyFlow 项目（Next 16.4.5 + Tailwind v4，C:\Users\倪世豫\DeepWorks\studyflow）里实现「学习搭子」AI 聊天功能：
右下角悬浮按钮 + 聊天面板，后端 POST /api/chat 代理 DeepSeek API（流式 SSE）。

按 docs/ai-chatbuddy-spec.md 这份规格书实现。规格书里有全部 5 个文件的完整代码，直接照抄，不要自行发挥。
约束：
- 不要改设计语言：玻璃面板、楷体标题、无 emoji、全部用现有 CSS 变量（--glass-bg/--accent/--text/--kai 等）
- 不要动其他文件里无关的代码
- .env.local 里追加 DEEPSEEK_API_KEY 和 DEEPSEEK_MODEL 两行（规格书 2.1 有）
- 完成后先 npm run dev 起服务，再按第 3 节自查清单逐项确认，最后把结果告诉我
```

---

## 1. 架构总览

```
浏览器 ChatBuddy.tsx（流式读回）
   │  POST /api/chat  { messages, context }
   ▼
src/app/api/chat/route.ts（服务端，读 DEEPSEEK_API_KEY）
   │  POST https://api.deepseek.com/chat/completions  stream:true
   ▼
DeepSeek API → SSE 逐字流回 → 直接透传给浏览器
```

- **为什么用服务端代理**：API key 绝不能写进前端代码，否则任何人 F12 就能偷走。
- **context 字段**：前端把用户今天的任务/计划/打卡概括成一段文字发来，服务端拼进 system prompt，AI 就「知道」用户今天要干什么。
- **换模型**：以后想换 GLM/Claude，只改 `.env.local` 两行 + route.ts 的 URL，UI 不用动。

---

## 2. 五个文件逐个实现

### 2.1 `.env.local`（在文件末尾追加两行）

```
# 学习搭子 AI（DeepSeek）
DEEPSEEK_API_KEY=sk-（填你的 DeepSeek Key，只在 .env.local，勿提交）
DEEPSEEK_MODEL=deepseek-chat
```

改完 `.env.local` 必须**重启** dev server 才会生效。

### 2.2 `src/app/api/chat/route.ts`（新建文件，全文照抄）

```ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEEPSEEK_URL =
  process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/chat/completions";
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const MAX_HISTORY = 30;

const BASE_SYSTEM = [
  "你是 StudyFlow 的「学习搭子」，一个住在学习网站里的 AI 助手。",
  "规则：",
  "- 用简体中文回答，语气亲切自然，像同学而不是客服，不说「作为AI」之类的套话。",
  "- 帮用户答疑（数学、英语、编程）、梳理学习计划、总结今日任务、陪聊鼓励。",
  "- 数学/代码题给出关键思路和步骤，不要只丢答案。",
  "- 回复尽量简洁，除非用户要求展开。",
  "- 不要使用 emoji。",
].join("\n");

interface ChatBody {
  messages?: { role: string; content: string }[];
  context?: string;
}

export async function POST(req: Request) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "服务端未配置 DEEPSEEK_API_KEY，请在 .env.local 中添加。" },
      { status: 500 }
    );
  }

  let body: ChatBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON。" }, { status: 400 });
  }

  const msgs = Array.isArray(body.messages) ? body.messages : [];
  const history = msgs
    .filter(
      (m) =>
        m &&
        typeof m.content === "string" &&
        (m.role === "user" || m.role === "assistant")
    )
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content }));
  if (history.length === 0) {
    return NextResponse.json({ error: "messages 为空。" }, { status: 400 });
  }

  const contextBlock = body.context
    ? `\n\n当前用户的学习数据（回答时可以结合，但不要主动复述）：\n${body.context}`
    : "";

  let upstream: Response;
  try {
    upstream = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: BASE_SYSTEM + contextBlock }, ...history],
        stream: true,
      }),
    });
  } catch {
    return NextResponse.json(
      { error: "无法连接 DeepSeek API（网络问题？）。" },
      { status: 502 }
    );
  }

  if (!upstream.ok || !upstream.body) {
    let detail = "";
    try {
      detail = (await upstream.text()).slice(0, 300);
    } catch {
      // 读不到正文就算了，状态码已足够定位
    }
    return NextResponse.json(
      { error: `DeepSeek API 返回 ${upstream.status}${detail ? "：" + detail : ""}` },
      { status: 502 }
    );
  }

  // SSE 直接透传：DeepSeek 返回什么就原样转发什么，最省事也最不容易错
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
```

### 2.3 `src/components/ChatBuddy.tsx`（新建文件，全文照抄）

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const LS_KEY = "studyflow-chatbuddy-v1";
const MAX_SAVED = 40;

function loadHistory(): ChatMsg[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return (arr as ChatMsg[])
      .filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string"
      )
      .slice(-MAX_SAVED);
  } catch {
    return [];
  }
}

export default function ChatBuddy({ context }: { context?: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[] | null>(null); // null=历史还没从 localStorage 读出
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 客户端挂载后从 localStorage 恢复聊天历史
  useEffect(() => {
    setMessages(loadHistory());
  }, []);

  // 历史变化时写回 localStorage
  useEffect(() => {
    if (messages !== null) {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(messages.slice(-MAX_SAVED)));
      } catch {
        // 隐私模式等场景写不进去就算了
      }
    }
  }, [messages]);

  // 新内容出现时滚到底部
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open, busy]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next: ChatMsg[] = [...(messages ?? []), { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setOpen(true);
    if (taRef.current) taRef.current.style.height = "auto";

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, context }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        let msg = `请求失败（${res.status}）`;
        try {
          const j = (await res.json()) as { error?: string };
          if (j?.error) msg = j.error;
        } catch {
          // 保持默认错误文案
        }
        setMessages((m) => [...(m ?? []), { role: "assistant", content: msg }]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let buffer = "";
      // 先放一条空的助手消息，流式内容逐字填进去
      setMessages((m) => [...(m ?? []), { role: "assistant", content: "" }]);

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const data = t.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const j = JSON.parse(data) as {
              choices?: { delta?: { content?: string } }[];
            };
            const delta = j?.choices?.[0]?.delta?.content ?? "";
            if (!delta) continue;
            acc += delta;
            setMessages((m) => {
              const copy = [...m];
              const last = copy[copy.length - 1];
              if (last && last.role === "assistant") {
                copy[copy.length - 1] = { ...last, content: acc };
              }
              return copy;
            });
          } catch {
            // 半截 JSON 直接跳过
          }
        }
      }

      // 流结束兜底：模型啥也没输出时给个提示
      setMessages((m) => {
        const copy = [...m];
        const last = copy[copy.length - 1];
        if (last && last.role === "assistant" && !last.content.trim()) {
          copy[copy.length - 1] = {
            ...last,
            content: "（模型没有返回内容，请再试一次）",
          };
        }
        return copy;
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return; // 用户点了停止，静默
      setMessages((m) => [
        ...(m ?? []),
        { role: "assistant", content: "网络异常，请稍后再试。" },
      ]);
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }, [input, busy, messages, context]);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setBusy(false);
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 发送，Shift+Enter 换行；isComposing 防止中文输入法选词时误发
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <>
      {open && (
        <div className="cb-panel glass">
          <header className="cb-head">
            <b className="kai">学习搭子</b>
            <span className="cb-head-sub">DeepSeek 驱动</span>
            <div className="cb-actions">
              <button className="mini" onClick={clear} title="清空对话">
                清空
              </button>
            </div>
          </header>
          <div className="cb-list" ref={listRef}>
            {messages === null ? (
              <p className="cb-hint">…</p>
            ) : messages.length === 0 ? (
              <p className="cb-hint">
                我是你的学习搭子。
                <br />
                数学、英语、代码都可以问我，
                <br />
                也能帮你总结今天的任务。
              </p>
            ) : (
              messages.map((m, i) => {
                // 流式生成中的空占位消息不渲染
                if (m.role === "assistant" && !m.content && busy) return null;
                return (
                  <div key={i} className={`cb-msg ${m.role}`}>
                    <div className="cb-bubble">{m.content}</div>
                  </div>
                );
              })
            )}
            {busy && (
              <div className="cb-msg assistant">
                <div className="cb-bubble cb-typing">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            )}
          </div>
          <footer className="cb-foot">
            <textarea
              ref={taRef}
              className="cb-input"
              rows={1}
              placeholder="问点什么…（Enter 发送）"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                const el = e.target;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 120) + "px";
              }}
              onKeyDown={onKeyDown}
            />
            {busy ? (
              <button className="cb-send" onClick={stop} title="停止生成">
                停止
              </button>
            ) : (
              <button
                className="cb-send"
                onClick={() => void send()}
                disabled={!input.trim()}
              >
                发送
              </button>
            )}
          </footer>
        </div>
      )}
      <button
        className={`cb-fab ${open ? "on" : ""}`}
        onClick={() => setOpen((v) => !v)}
        title="学习搭子"
        aria-label="打开学习搭子聊天窗"
      >
        <span className="cb-fab-mark">AI</span>
      </button>
    </>
  );
}
```

### 2.4 `src/app/page.tsx`（三处修改）

**修改 1 —— 顶部 import 区**（`import RepoView ...` 之后加一行）：

```tsx
import ChatBuddy from "@/components/ChatBuddy";
```

**修改 2 —— 在 `dailyUnchecked` 的 useMemo 之后、`if (!hydrated)` 之前**，插入 buddyContext：

```tsx
  /** 学习搭子上下文：把今天的学习数据概括成一段文字喂给 AI */
  const buddyContext = useMemo(() => {
    if (!hydrated) return "";
    const today = todayKey();
    const pending = state.tasks.filter((t) => t.type === "homework" && !t.done);
    const dailyLeft = state.tasks.filter(
      (t) =>
        t.type === "daily" &&
        !state.checkins.some((c) => c.taskId === t.id && c.date === today)
    );
    const planToday = state.plans.filter((p) => p.type === "daily" && p.date === today);
    const note = state.dayNotes.find((n) => n.date === today);
    const parts: string[] = [`今天是 ${today}。`];
    if (pending.length > 0) {
      parts.push(
        `待完成作业：${pending
          .map((t) => `${t.title}${t.deadline ? "（截止 " + t.deadline + "）" : ""}`)
          .join("、")}。`
      );
    } else {
      parts.push("作业已全部完成。");
    }
    if (dailyLeft.length > 0) {
      parts.push(`今日打卡未完成：${dailyLeft.map((t) => t.title).join("、")}。`);
    }
    if (planToday.length > 0) {
      parts.push(
        `今日计划：${planToday
          .map((p) => `${p.content}${p.done ? "（已完成）" : "（未完成）"}`)
          .join("、")}。`
      );
    }
    if (note?.planNote) parts.push(`今日寄语：${note.planNote}`);
    if (note?.record) parts.push(`今日已记录：${note.record}`);
    return parts.join("");
  }, [state, hydrated]);
```

**修改 3 —— JSX 渲染**：在 `</div>`（.app 的收尾）之后、`</>` 之前，加一行：

```tsx
        <ChatBuddy context={buddyContext} />
```

即最后结构：

```tsx
  return (
    <>
      <Scene />
      <div className="app">
        ...
        <AsideQuote phase={clock.phase} />
      </div>
      <ChatBuddy context={buddyContext} />
    </>
  );
```

### 2.5 `src/app/globals.css`（文件末尾追加整段）

```css
/* ============================================================
   学习搭子 ChatBuddy（悬浮聊天窗，玻璃面板语言）
   ============================================================ */
.cb-fab {
  position: fixed; right: 26px; bottom: 26px; z-index: 40;
  width: 58px; height: 58px; border-radius: 50%;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  backdrop-filter: blur(26px) saturate(120%); -webkit-backdrop-filter: blur(26px) saturate(120%);
  color: var(--text); cursor: pointer;
  box-shadow: var(--shadow);
  display: flex; align-items: center; justify-content: center;
  transition: transform .25s ease, background .25s ease, box-shadow .25s ease;
}
.cb-fab:hover {
  transform: translateY(-3px);
  box-shadow: 0 34px 90px -18px rgba(0, 0, 0, .5), 0 0 24px var(--accent-soft);
}
.cb-fab.on { background: var(--accent); color: var(--accent-ink) }
.cb-fab-mark { font-family: var(--kai); font-size: 15px; font-weight: 700; letter-spacing: .06em }
.cb-panel {
  position: fixed; right: 26px; bottom: 96px; z-index: 40;
  width: min(392px, calc(100vw - 32px)); height: min(600px, calc(100vh - 140px));
  display: flex; flex-direction: column; overflow: hidden;
  animation: cb-up .3s ease;
}
@keyframes cb-up {
  from { opacity: 0; transform: translateY(14px) scale(.98) }
  to { opacity: 1; transform: none }
}
.cb-head {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px 12px; border-bottom: 1px solid var(--track); flex: none;
}
.cb-head b { font-size: 17px; letter-spacing: .18em; text-shadow: var(--ts) }
.cb-head-sub { font-size: 10px; color: var(--faint); letter-spacing: .1em }
.cb-actions { margin-left: auto }
.cb-list {
  flex: 1; min-height: 0; overflow-y: auto; padding: 16px;
  display: flex; flex-direction: column; gap: 12px;
  scrollbar-width: thin; scrollbar-color: var(--track) transparent;
}
.cb-list::-webkit-scrollbar { width: 5px }
.cb-list::-webkit-scrollbar-thumb { background: var(--track); border-radius: 99px }
.cb-hint {
  color: var(--faint); font-size: 12.5px; letter-spacing: .05em; line-height: 2.1;
  text-align: center; padding: 18px 6px;
}
.cb-msg { display: flex }
.cb-msg.user { justify-content: flex-end }
.cb-bubble {
  max-width: 82%; padding: 9px 13px; border-radius: 14px;
  font-size: 13px; line-height: 1.65;
  white-space: pre-wrap; word-break: break-word;
}
.cb-msg.user .cb-bubble {
  background: var(--accent); color: var(--accent-ink);
  border-bottom-right-radius: 5px;
}
.cb-msg.assistant .cb-bubble {
  background: rgba(var(--glass-rgb), .62); border: 1px solid var(--glass-border);
  border-bottom-left-radius: 5px;
}
.cb-typing { display: flex; gap: 5px; align-items: center; padding: 13px 15px }
.cb-typing i {
  width: 5px; height: 5px; border-radius: 50%; background: var(--dim);
  animation: cb-blink 1.2s ease-in-out infinite;
}
.cb-typing i:nth-child(2) { animation-delay: .18s }
.cb-typing i:nth-child(3) { animation-delay: .36s }
@keyframes cb-blink { 0%, 60%, 100% { opacity: .25 } 30% { opacity: .9 } }
.cb-foot {
  display: flex; gap: 8px; align-items: flex-end;
  padding: 12px; border-top: 1px solid var(--track); flex: none;
}
.cb-input {
  flex: 1; resize: none; border: 1px solid rgba(var(--text-rgb), .18);
  background: rgb(var(--glass-rgb)); color: var(--text);
  border-radius: 12px; padding: 9px 12px; font-size: 13px; line-height: 1.5;
  outline: none; max-height: 120px; font-family: inherit;
}
.cb-input::placeholder { color: var(--faint) }
.cb-input:focus { border-color: var(--accent) }
.cb-send {
  flex: none; border: 1px solid var(--glass-border);
  background: var(--accent-soft); color: var(--accent);
  border-radius: 12px; padding: 9px 14px;
  font-size: 12.5px; font-weight: 600; letter-spacing: .14em; cursor: pointer;
}
.cb-send:hover { filter: brightness(1.15) }
.cb-send:disabled { opacity: .4; cursor: default }
```

---

## 3. 自查清单（实现完逐项确认）

1. `npm run dev` 能正常起来（如果提示 3000 端口被占，先杀掉旧进程再起）。
2. 页面右下角出现圆形悬浮按钮（写 AI）。
3. 点开聊天面板：玻璃面板、楷体「学习搭子」标题、右上角「清空」。
4. 发一句话（比如「你好」），AI 逐字流式回复，不是整段蹦出来。
5. 中文输入法打拼音回车选词**不会**误发送（isComposing 已处理）。
6. 问「我今天有什么任务」，AI 能结合你真实的任务数据回答（context 生效）。
7. 刷新页面，聊天记录还在（localStorage 生效）。
8. 点「清空」，对话归零。
9. 生成中途点「停止」，能停下来。
10. 控制台无报错；`.env.local` 的 key 确认没出现在任何前端 bundle 里（可用浏览器 F12 源码里搜 `sk-15c4` 验证搜不到）。

**API 接口单独测试**（可选，PowerShell 里执行）：

```powershell
curl.exe -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{\"messages\":[{\"role\":\"user\",\"content\":\"say ok\"}]}'
```

预期：滚动输出 SSE 数据行，最后 `data: [DONE]`。

---

## 4. 常见坑

| 现象 | 原因 | 解决 |
|---|---|---|
| 回复「服务端未配置 DEEPSEEK_API_KEY」 | 改了 .env.local 没重启 | 重启 dev server |
| 回复「DeepSeek API 返回 401」 | key 拼错/被删 | 核对 2.1 的 key，或去 platform.deepseek.com 重建 |
| 整段一次蹦出来 | 没走流式 | 检查 route.ts 是否 `stream: true` 且 SSE 头透传 |
| 中文输入回车误发 | 老代码没判断 isComposing | 规格书里已处理，照抄即可 |
| 3000 被占 | 有旧 dev server 还活着 | `netstat -ano | findstr :3000` 找 PID，`taskkill /F /PID <pid>` |
| 页面报 `--glass-rgb` 未定义 | CSS 没追加到 globals.css 末尾 | 检查 2.5 是否整段复制 |
```

---

## 5. 后续可升级方向（本次不做）

- Markdown 渲染（公式、代码高亮）
- 流式输出里加「正在思考」阶段提示（DeepSeek reasoner）
- 把「学习搭子」接入任务操作（说一句话直接加任务）
- 多模型切换开关（.env 里已留 DEEPSEEK_MODEL 口子）
