"use client";

import { QUOTES } from "@/hooks/useSceneClock";

/** 右栏：竖排时段诗句 + 朱红印章，安静陪伴不打扰 */
export default function AsideQuote({ phase }: { phase: string }) {
  const [quote, quoteSrc] = QUOTES[phase] ?? QUOTES["夜晚"];

  return (
    <aside className="right">
      <div className="vquote">
        <span className="vline" />
        <div className="vq-body">
          <p className="vq-text">{quote}</p>
          {quoteSrc && <span className="vq-src">{quoteSrc}</span>}
          <span className="seal">逐</span>
        </div>
      </div>
    </aside>
  );
}
