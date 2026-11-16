"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const LS_KEY = "studyflow-chatbuddy-v1";
const MAX_SAVED = 40;

export interface PlanSuggestion {
  content: string;
  time?: string;
}

const PLAN_RE = /```plan\s*\n([\s\S]*?)```/;

/** 从 AI 回复里提取 ```plan JSON 代码块，解析失败返回 null */
function parsePlans(text: string): PlanSuggestion[] | null {
  const m = text.match(PLAN_RE);
  if (!m) return null;
  try {
    const arr: unknown = JSON.parse(m[1].trim());
    if (!Array.isArray(arr)) return null;
    const items = (arr as PlanSuggestion[])
      .filter((it) => it && typeof it.content === "string" && it.content.trim())
      .map((it) => ({
        content: it.content.trim().slice(0, 200),
        ...(typeof it.time === "string" && /^\d{2}:\d{2}$/.test(it.time)
          ? { time: it.time }
          : {}),
      }));
    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}

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

export default function ChatBuddy({
  context,
  onAddPlan,
}: {
  context?: string;
  onAddPlan?: (items: PlanSuggestion[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[] | null>(null); // null=历史还没从 localStorage 读出
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [planOffers, setPlanOffers] = useState<Record<number, PlanSuggestion[]>>({});
  const [addedAt, setAddedAt] = useState<Record<number, boolean>>({});
  const listRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 客户端挂载后从 localStorage 恢复聊天历史（queueMicrotask 规避 React 19 effect 内同步 setState 规则）
  useEffect(() => {
    queueMicrotask(() => {
      const hist = loadHistory();
      setMessages(hist);
      const offers: Record<number, PlanSuggestion[]> = {};
      hist.forEach((m, i) => {
        if (m.role === "assistant") {
          const p = parsePlans(m.content);
          if (p) offers[i] = p;
        }
      });
      setPlanOffers(offers);
    });
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
              const copy = [...(m ?? [])];
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
        const copy = [...(m ?? [])];
        const last = copy[copy.length - 1];
        if (last && last.role === "assistant" && !last.content.trim()) {
          copy[copy.length - 1] = {
            ...last,
            content: "（模型没有返回内容，请再试一次）",
          };
        }
        return copy;
      });

      // 回复里若带 ```plan JSON 代码块，解析出来供一键添加
      const plans = parsePlans(acc);
      if (plans) setPlanOffers((o) => ({ ...o, [next.length]: plans }));
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
    setPlanOffers({});
    setAddedAt({});
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
                const display =
                  m.role === "assistant"
                    ? m.content.replace(PLAN_RE, "").trim()
                    : m.content;
                // 流式生成中的空占位消息不渲染
                if (m.role === "assistant" && !display && busy) return null;
                if (!display && !planOffers[i]) return null;
                return (
                  <div key={i} className={`cb-msg ${m.role}`}>
                    <div className="cb-msg-body">
                      {display && <div className="cb-bubble">{display}</div>}
                      {planOffers[i] && (
                        <div className="cb-plan-card">
                          <div className="cb-plan-title">
                            建议计划 · {planOffers[i].length} 条
                          </div>
                          {planOffers[i].map((p, j) => (
                            <div key={j} className="cb-plan-item">
                              <span className="cb-plan-dot" />
                              <span className="cb-plan-content">{p.content}</span>
                              {p.time && (
                                <span className="cb-plan-time">{p.time}</span>
                              )}
                            </div>
                          ))}
                          {onAddPlan ? (
                            addedAt[i] ? (
                              <div className="cb-plan-done">已添加到今日计划</div>
                            ) : (
                              <button
                                className="cb-plan-add"
                                onClick={() => {
                                  onAddPlan(planOffers[i]);
                                  setAddedAt((a) => ({ ...a, [i]: true }));
                                }}
                              >
                                添加到今日计划
                              </button>
                            )
                          ) : null}
                        </div>
                      )}
                    </div>
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
