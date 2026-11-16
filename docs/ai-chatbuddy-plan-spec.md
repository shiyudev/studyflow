# StudyFlow「学习搭子」v2 · AI 制定计划一键写入（给 DeepWorks）

> 版本 v2 · 2026-11-16 · 在 v1（docs/ai-chatbuddy-spec.md）基础上扩展
>
> 目标：AI 帮忙制定计划后，聊天窗里出现「添加到今日计划」按钮，
> 点一下计划条目直接写进 StudyFlow 的计划视图（PlanView）。
>
> 原理：AI 回复末尾附一个 ```plan JSON 代码块 → 前端解析 → 显示建议卡 → 点按钮走 page.tsx 的 setState 写进 plans。

---

## 0. 一键提示词（复制整段喂给 DeepWorks）

```
在 StudyFlow 项目里给「学习搭子」聊天功能加 v2 扩展：AI 制定计划后可以一键写入今日计划。
按 docs/ai-chatbuddy-plan-spec.md 实现。v1 的文件（api/chat/route.ts、ChatBuddy.tsx、page.tsx、globals.css）
都已经在项目里了，规格书 2.x 节给出的是对现有文件的「精确修改」：
先定位到规格书给的旧代码，替换/插入成新代码，其他部分一律不动。
改完后 npm run dev 起服务，按第 3 节自查清单逐项确认。
```

---

## 1. 交互流程

```
用户：「帮我安排今晚的复习计划」
  ↓
AI 回复文字建议 + 末尾 ```plan JSON 代码块
  ↓
ChatBuddy 解析代码块 → 在气泡下方显示「建议计划 · N 条」卡片
  ↓
用户点「添加到今日计划」
  ↓
onAddPlan 回调 → page.tsx 把条目写进 plans（date=今天, type=daily, done=false）
  ↓
PlanView 计划视图立刻能看到（去重：内容重复的条目跳过）
```

---

## 2. 四个文件的精确修改

### 2.1 `src/app/api/chat/route.ts` —— 替换 BASE_SYSTEM

把现有的：

```ts
const BASE_SYSTEM = [
  "你是 StudyFlow 的「学习搭子」，一个住在学习网站里的 AI 助手。",
  "规则：",
  "- 用简体中文回答，语气亲切自然，像同学而不是客服，不说「作为AI」之类的套话。",
  "- 帮用户答疑（数学、英语、编程）、梳理学习计划、总结今日任务、陪聊鼓励。",
  "- 数学/代码题给出关键思路和步骤，不要只丢答案。",
  "- 回复尽量简洁，除非用户要求展开。",
  "- 不要使用 emoji。",
].join("\n");
```

替换成：

```ts
const BASE_SYSTEM = [
  "你是 StudyFlow 的「学习搭子」，一个住在学习网站里的 AI 助手。",
  "规则：",
  "- 用简体中文回答，语气亲切自然，像同学而不是客服，不说「作为AI」之类的套话。",
  "- 帮用户答疑（数学、英语、编程）、梳理学习计划、总结今日任务、陪聊鼓励。",
  "- 数学/代码题给出关键思路和步骤，不要只丢答案。",
  "- 回复尽量简洁，除非用户要求展开。",
  "- 不要使用 emoji。",
  "",
  "【制定计划协议】当用户让你制定计划、安排复习或规划时间时：",
  "1. 先用一两句简短文字给出建议；",
  "2. 然后在回复最后附一个 plan 代码块，里面只放 JSON 数组，格式：",
  '```plan',
  '[{"content":"复习微积分 15.4 习题","time":"19:00"}]',
  '```',
  "3. content 必填：一句话、具体可执行（含科目与内容）；time 可选：24 小时制 HH:mm，没有明确时间就省略该字段；",
  "4. 一般给 3-6 条，不要超过 8 条；",
  "5. plan 代码块内除 JSON 数组外不要有任何文字。",
].join("\n");
```

### 2.2 `src/components/ChatBuddy.tsx` —— 六处修改

**(a) 常量区之后加解析器**。找到：

```tsx
const LS_KEY = "studyflow-chatbuddy-v1";
const MAX_SAVED = 40;
```

在其后（loadHistory 函数之前）插入：

```tsx
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
```

**(b) 组件签名 + 新增两个 state**。找到：

```tsx
export default function ChatBuddy({ context }: { context?: string }) {
```

替换成：

```tsx
export default function ChatBuddy({
  context,
  onAddPlan,
}: {
  context?: string;
  onAddPlan?: (items: PlanSuggestion[]) => void;
}) {
```

找到：

```tsx
  const [busy, setBusy] = useState(false);
```

在其后加两行：

```tsx
  const [planOffers, setPlanOffers] = useState<Record<number, PlanSuggestion[]>>({});
  const [addedAt, setAddedAt] = useState<Record<number, boolean>>({});
```

**(c) 历史加载时也解析 plan 代码块**。找到：

```tsx
  // 客户端挂载后从 localStorage 恢复聊天历史（queueMicrotask 规避 React 19 effect 内同步 setState 规则）
  useEffect(() => {
    queueMicrotask(() => setMessages(loadHistory()));
  }, []);
```

替换成：

```tsx
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
```

**(d) 流结束后解析并记录建议**。找到 send() 里的兜底代码块结尾：

```tsx
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
    } catch (err) {
```

在 `} catch (err) {` 之前插入：

```tsx
      // 回复里若带 ```plan JSON 代码块，解析出来供一键添加
      const plans = parsePlans(acc);
      if (plans) setPlanOffers((o) => ({ ...o, [next.length]: plans }));
```

**(e) 清空时连带重置**。找到：

```tsx
  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setBusy(false);
  }, []);
```

替换成：

```tsx
  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setBusy(false);
    setPlanOffers({});
    setAddedAt({});
  }, []);
```

**(f) 渲染：气泡下方显示建议卡**。找到：

```tsx
              messages.map((m, i) => {
                // 流式生成中的空占位消息不渲染
                if (m.role === "assistant" && !m.content && busy) return null;
                return (
                  <div key={i} className={`cb-msg ${m.role}`}>
                    <div className="cb-bubble">{m.content}</div>
                  </div>
                );
              })
```

替换成：

```tsx
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
```

> 若某一处定位失败，就把整个 ChatBuddy.tsx 读出来重写一版，逻辑照上面六处改，其余原样保留。

### 2.3 `src/app/page.tsx` —— 两处修改

**(a) 新增回调**。找到：

```tsx
  const pendingCount = useMemo(
    () => state.tasks.filter((t) => t.type !== "daily" && !t.done).length,
    [state.tasks]
  );
```

在其之前插入：

```tsx
  /** 学习搭子建议的计划 → 一键写入今日计划（按内容去重） */
  const addBuddyPlans = useCallback(
    (items: { content: string; time?: string }[]) => {
      const today = todayKey();
      setState((s) => {
        const existing = new Set(
          s.plans
            .filter((p) => p.type === "daily" && p.date === today)
            .map((p) => p.content)
        );
        const fresh = items
          .filter((it) => it.content.trim() && !existing.has(it.content.trim()))
          .map((it) => ({
            id: uid(),
            type: "daily" as const,
            date: today,
            time: it.time,
            content: it.content.trim(),
            done: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }));
        return { ...s, plans: [...s.plans, ...fresh] };
      });
    },
    [setState]
  );
```

**(b) 传参**。找到：

```tsx
      <ChatBuddy context={buddyContext} />
```

替换成：

```tsx
      <ChatBuddy context={buddyContext} onAddPlan={addBuddyPlans} />
```

### 2.4 `src/app/globals.css` —— 末尾追加整段

```css
/* ============================================================
   学习搭子 v2：一键添加计划卡
   ============================================================ */
.cb-msg-body { display: flex; flex-direction: column; gap: 6px; max-width: 82%; min-width: 0 }
.cb-msg.user .cb-msg-body { align-items: flex-end }
.cb-msg-body .cb-bubble { max-width: 100% }
.cb-plan-card {
  background: rgb(var(--glass-rgb)); border: 1px solid var(--glass-border);
  border-radius: 14px; padding: 10px 12px;
  display: flex; flex-direction: column; gap: 7px;
}
.cb-plan-title { font-size: 10.5px; letter-spacing: .18em; color: var(--faint) }
.cb-plan-item { display: flex; align-items: baseline; gap: 8px; font-size: 12.5px; color: var(--soft) }
.cb-plan-dot { flex: none; width: 4px; height: 4px; border-radius: 50%; background: var(--accent); align-self: center }
.cb-plan-content { flex: 1; min-width: 0 }
.cb-plan-time { flex: none; font-size: 11px; color: var(--faint); font-variant-numeric: tabular-nums }
.cb-plan-add {
  margin-top: 4px; border: 1px solid var(--glass-border); background: var(--accent-soft);
  color: var(--accent); border-radius: 10px; padding: 7px 12px; cursor: pointer;
  font-size: 12px; font-weight: 600; letter-spacing: .12em;
}
.cb-plan-add:hover { filter: brightness(1.15) }
.cb-plan-done {
  margin-top: 4px; font-size: 11.5px; color: var(--faint); letter-spacing: .08em;
  text-align: center; padding: 6px 0;
}
```

---

## 3. 自查清单

1. `npm run dev` 正常，页面无报错。
2. 问「帮我安排今晚的复习计划」→ AI 回复末尾带一个 ```plan JSON 代码块。
3. 气泡**下面**出现「建议计划 · N 条」卡片，条目带小圆点，有时间的话右侧显示 HH:mm。
4. 气泡正文里**不显示**原始 JSON 代码块（已被剥掉）。
5. 点「添加到今日计划」→ 按钮变成「已添加到今日计划」。
6. 切到「计划」视图（选今天的日期）→ 新条目已出现，done 未勾选，时间正确。
7. 再点一次添加（或重新问同样的问题）→ 重复内容不会重复添加（去重生效）。
8. 刷新页面 → 聊天记录还在；历史消息下的建议卡也还在，仍可一键添加。
9. 普通聊天（不涉及制定计划）不出现建议卡。
10. 控制台无报错。

---

## 4. 常见坑

| 现象 | 原因 | 解决 |
|---|---|---|
| 建议卡不出现 | AI 没按协议输出 ```plan 代码块 | 检查 route.ts 的 BASE_SYSTEM 是否替换完整（协议在第 8-16 行） |
| JSON 解析失败 | AI 在 JSON 里混了文字 | 协议已约束；若仍偶发，parsePlans 会静默忽略，不会崩 |
| 点了添加但计划视图没有 | 日期不对（加到了别的日期） | addBuddyPlans 固定用今天的 date，检查 PlanView 是否选中今天 |
| 重复添加 | 没走到去重 | 检查 page.tsx 的 existing Set 逻辑是否在 |
| TS 报 uid/todayKey 未找到 | page.tsx 顶部没有这些 import | 这两个 v1 就已经 import 过了（lib/types），不要重复 import |
| 气泡里还能看到 JSON | 渲染没剥代码块 | 检查 (f) 处 display 是否用了 replace(PLAN_RE, "") |

---

## 5. 后续可升级方向（本次不做）

- 让 AI 也能一键写「作业任务」（homework，带截止日期和优先级）
- 「帮我总结今天」→ 一键写进 DayNote
- 计划条目带科目色 chip（用 subjectColor）
