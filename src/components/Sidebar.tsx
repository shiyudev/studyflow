"use client";

export type View = "plan" | "dailyTasks" | "homeworkTasks" | "repo";

interface Props {
  view: View;
  onChange: (view: View) => void;
  pendingCount: number;
  /** 今日未打卡的每日任务数 */
  dailyUnchecked: number;
}

const NAV_ITEMS: { key: View; label: string; icon: string }[] = [
  { key: "plan", label: "计划", icon: "🗓️" },
  { key: "dailyTasks", label: "每日任务", icon: "📌" },
  { key: "homeworkTasks", label: "作业任务", icon: "📄" },
  { key: "repo", label: "学习仓库", icon: "📁" },
];

export default function Sidebar({ view, onChange, pendingCount, dailyUnchecked }: Props) {
  return (
    <>
      {/* 桌面端侧边栏 */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2.5 px-5 py-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-lg text-white">
            🎯
          </span>
          <div>
            <p className="text-base font-bold leading-tight text-slate-900">StudyFlow</p>
            <p className="text-[11px] text-slate-400">你的智能学习搭子</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            const active = view === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onChange(item.key)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{item.icon}</span>
                <span className="flex-1 text-left">{item.label}</span>
                {item.key === "homeworkTasks" && pendingCount > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      active ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {pendingCount}
                  </span>
                )}
                {item.key === "dailyTasks" && dailyUnchecked > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      active ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-600"
                    }`}
                  >
                    {dailyUnchecked}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 px-5 py-4">
          <p className="text-[11px] leading-relaxed text-slate-400">
            ☁️ 数据已云端同步（Supabase）
            <br />
            换设备打开也能看到同一份数据
          </p>
        </div>
      </aside>

      {/* 移动端顶部标签 */}
      <div className="flex gap-2 border-b border-slate-200 bg-white px-4 py-2 md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = view === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium ${
                active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
              {item.key === "homeworkTasks" && pendingCount > 0 && (
                <span className={`rounded-full px-1.5 text-xs ${active ? "bg-white/25" : "bg-slate-200"}`}>
                  {pendingCount}
                </span>
              )}
              {item.key === "dailyTasks" && dailyUnchecked > 0 && (
                <span className={`rounded-full px-1.5 text-xs ${active ? "bg-white/25" : "bg-emerald-200"}`}>
                  {dailyUnchecked}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
