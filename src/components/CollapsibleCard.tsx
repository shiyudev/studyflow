"use client";

import { useState, type ReactNode } from "react";

/** 可折叠卡片：标题栏右侧「收起 / 展开」按钮切换内容显隐 */
export default function CollapsibleCard({
  title,
  hint,
  defaultOpen = true,
  children,
}: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="glass card">
      <div className="card-head" style={open ? undefined : { marginBottom: 0 }}>
        <h2>{title}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
          {hint && <span className="card-hint">{hint}</span>}
          <button className="fold-btn" onClick={() => setOpen((o) => !o)}>
            {open ? "收起" : "展开"}
          </button>
        </div>
      </div>
      {open && children}
    </div>
  );
}
