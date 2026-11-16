import { NextResponse } from "next/server";

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
