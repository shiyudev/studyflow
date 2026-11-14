"use client";

import { useMemo } from "react";

/**
 * 场景层（天空/星星/天体/列车/山雾/房屋）+ 电影层（底纱/暗角）
 * 全部 pointer-events:none，z-index 0；UI 层 z-index 1。
 * 颜色全部由 useSceneClock 写入的 CSS 变量驱动，本组件无状态。
 */
export default function Scene() {
  // 120 颗星星：用确定性伪随机生成，避免渲染期调用 Math.random
  const stars = useMemo(() => {
    const rand = (seed: number) => {
      const x = Math.sin(seed * 127.1) * 43758.5453;
      return x - Math.floor(x);
    };
    return Array.from({ length: 120 }, (_, i) => {
      const seed = i + 1;
      const s = (rand(seed) * 1.6 + 0.6).toFixed(1);
      const c = rand(seed * 7) < 0.14 ? "#ffd9a0" : "#dfe8ff";
      return (
        <span
          key={i}
          className="star"
          style={{
            left: `${(rand(seed * 11) * 100).toFixed(2)}vw`,
            top: `${(rand(seed * 13) * 74).toFixed(2)}vh`,
            width: `${s}px`,
            height: `${s}px`,
            background: c,
            animationDuration: `${(3 + rand(seed * 17) * 4.5).toFixed(1)}s`,
            animationDelay: `${(-rand(seed * 19) * 7).toFixed(1)}s`,
          }}
        />
      );
    });
  }, []);

  return (
    <>
      <div className="scene" aria-hidden="true">
        <div className="sky" />
        <div className="milkyway" />
        <div className="stars">{stars}</div>
        <div className="shaft l" id="sf-shaftL" />
        <div className="shaft r" id="sf-shaftR" />
        <div className="sun" id="sf-sun" style={{ opacity: 0 }} />
        <div className="moon" id="sf-moon" style={{ opacity: 0 }} />
        <div className="clouds">
          <i className="cloud c1" /><i className="cloud c2" /><i className="cloud c3" /><i className="cloud c4" />
        </div>
        <div className="glow" />
        <div className="mist m1" />
        <svg className="hills hills-far" viewBox="0 0 1440 300" preserveAspectRatio="none">
          <path d="M0 200 C 220 120, 430 215, 660 155 C 890 95, 1090 205, 1440 135 L1440 300 L0 300 Z" />
        </svg>
        <div className="trackline" />
        <div className="xing">
          <svg viewBox="0 0 132 9" preserveAspectRatio="none">
            <defs>
              <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="rgba(255,214,150,.55)" />
                <stop offset="1" stopColor="rgba(255,214,150,0)" />
              </linearGradient>
            </defs>
            <path d="M27 1 L58 0 L58 8 L27 7 Z" fill="url(#beam)" style={{ opacity: "var(--win-op)" }} />
            <rect x="0" y="0.5" width="27" height="7" rx="1.5" fill="#0b1122" />
            <rect x="3" y="2" width="5" height="4" rx="0.6" fill="#ffd9a0" style={{ opacity: "var(--win-op)" }} />
            <rect x="10" y="2" width="4" height="4" rx="0.6" fill="#ffd9a0" style={{ opacity: "var(--win-op)" }} />
            <rect x="31" y="1" width="20" height="6" rx="1.2" fill="#0b1122" />
            <rect x="34" y="2.2" width="4" height="3.6" rx="0.5" fill="#ffd9a0" style={{ opacity: "var(--win-op)" }} />
            <rect x="41" y="2.2" width="4" height="3.6" rx="0.5" fill="#ffd9a0" style={{ opacity: "var(--win-op)" }} />
            <rect x="55" y="1" width="20" height="6" rx="1.2" fill="#0b1122" />
            <rect x="58" y="2.2" width="4" height="3.6" rx="0.5" fill="#ffd9a0" style={{ opacity: "var(--win-op)" }} />
            <rect x="65" y="2.2" width="4" height="3.6" rx="0.5" fill="#ffd9a0" style={{ opacity: "var(--win-op)" }} />
            <rect x="79" y="1" width="20" height="6" rx="1.2" fill="#0b1122" />
            <rect x="82" y="2.2" width="4" height="3.6" rx="0.5" fill="#ffd9a0" style={{ opacity: "var(--win-op)" }} />
            <rect x="89" y="2.2" width="4" height="3.6" rx="0.5" fill="#ffd9a0" style={{ opacity: "var(--win-op)" }} />
            <rect x="103" y="1.2" width="16" height="5.5" rx="1" fill="#0b1122" />
            <rect x="106" y="2.4" width="3.5" height="3.2" rx="0.5" fill="#ffd9a0" style={{ opacity: "var(--win-op)" }} />
          </svg>
        </div>
        <svg className="hills hills-near" viewBox="0 0 1440 240" preserveAspectRatio="none">
          <path d="M0 150 C 200 95, 430 165, 700 105 C 970 45, 1210 155, 1440 95 L1440 240 L0 240 Z" />
        </svg>
        <div className="mist m2" />
        <div className="pole p1" /><div className="pole p2" /><div className="pole p3" /><div className="pole p4" />
        <div className="house h1"><i /><i /></div>
        <div className="house h2"><i /><i /><i /></div>
        <div className="house h3"><i /><i /></div>
      </div>
      <div className="scrim" />
      <div className="vignette" />
    </>
  );
}
