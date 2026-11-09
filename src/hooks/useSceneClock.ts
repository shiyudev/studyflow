"use client";

import { useEffect, useRef, useState } from "react";

/* ============================================================
 * 场景时钟：7 关键帧调色板随真实时间连续插值（逐字照抄草稿 v5）
 * rAF 每帧写入 CSS 变量 + 天体位置；React 状态仅在分钟/时段变化时更新
 * ============================================================ */

interface PalFrame {
  skyT: number[]; skyM: number[]; skyB: number[]; glow: number[]; glowA: number;
  sun: number[]; star: number; cloud: number; mist: number; win: number;
  scrim: number; vig: number; hillF: number[]; hillN: number[];
  glass: number[]; glassA: number; borderA: number;
  text: number[]; dim: number[]; faint: number[];
  accent: number[]; accentInk: number[];
  shadowA: number; moonGlowA: number; shaftA: number; ts: string;
}

const PAL: Record<string, PalFrame> = {
  night:{skyT:[8,11,26],skyM:[16,22,44],skyB:[32,40,74],glow:[168,186,232],glowA:.1,sun:[255,236,190],star:1,cloud:.05,mist:.1,win:.95,scrim:.3,vig:.5,hillF:[18,26,52],hillN:[9,13,30],glass:[10,15,32],glassA:.3,borderA:.12,text:[232,235,246],dim:[166,174,200],faint:[118,128,158],accent:[157,180,232],accentInk:[8,12,28],shadowA:.4,moonGlowA:.8,shaftA:0,ts:'0 1px 24px rgba(5,8,20,.35)'},
  pre:{skyT:[15,19,40],skyM:[36,40,74],skyB:[84,76,112],glow:[228,158,120],glowA:.16,sun:[255,236,190],star:.5,cloud:.08,mist:.22,win:.5,scrim:.26,vig:.45,hillF:[24,30,60],hillN:[12,17,38],glass:[18,24,48],glassA:.28,borderA:.11,text:[230,233,246],dim:[164,172,202],faint:[116,126,158],accent:[176,156,220],accentInk:[12,10,28],shadowA:.38,moonGlowA:.4,shaftA:.5,ts:'0 1px 24px rgba(5,8,20,.35)'},
  dawn:{skyT:[52,58,96],skyM:[128,100,136],skyB:[206,158,116],glow:[240,168,108],glowA:.4,sun:[244,214,158],star:.2,cloud:.2,mist:.3,win:0,scrim:.24,vig:.38,hillF:[74,62,92],hillN:[42,36,62],glass:[40,36,52],glassA:.3,borderA:.16,text:[238,232,224],dim:[176,166,160],faint:[134,126,126],accent:[230,160,104],accentInk:[20,14,26],shadowA:.3,moonGlowA:0,shaftA:.55,ts:'0 1px 24px rgba(5,8,20,.35)'},
  morning:{skyT:[112,144,178],skyM:[168,186,204],skyB:[226,214,190],glow:[244,222,176],glowA:.28,sun:[252,240,214],star:0,cloud:.3,mist:.34,win:0,scrim:.09,vig:.26,hillF:[96,122,146],hillN:[60,84,108],glass:[248,246,242],glassA:.38,borderA:.34,text:[34,42,58],dim:[60,70,88],faint:[84,94,112],accent:[100,120,156],accentInk:[252,250,246],shadowA:.18,moonGlowA:0,shaftA:.3,ts:'none'},
  day:{skyT:[104,142,178],skyM:[158,186,206],skyB:[214,226,228],glow:[250,246,232],glowA:.24,sun:[255,250,238],star:0,cloud:.42,mist:.2,win:0,scrim:.07,vig:.22,hillF:[100,132,152],hillN:[62,90,110],glass:[250,250,248],glassA:.4,borderA:.38,text:[28,38,52],dim:[56,68,84],faint:[80,90,108],accent:[82,106,142],accentInk:[252,250,246],shadowA:.14,moonGlowA:0,shaftA:.1,ts:'none'},
  dusk:{skyT:[46,42,80],skyM:[122,84,108],skyB:[196,138,92],glow:[238,152,96],glowA:.42,sun:[246,196,134],star:.3,cloud:.22,mist:.26,win:.1,scrim:.2,vig:.4,hillF:[76,58,84],hillN:[44,34,54],glass:[46,38,56],glassA:.3,borderA:.16,text:[240,232,222],dim:[172,158,152],faint:[130,122,122],accent:[240,166,110],accentInk:[24,14,20],shadowA:.3,moonGlowA:0,shaftA:.55,ts:'0 1px 24px rgba(5,8,20,.35)'},
  post:{skyT:[11,15,34],skyM:[22,28,56],skyB:[52,54,92],glow:[170,162,220],glowA:.18,sun:[255,236,190],star:.9,cloud:.04,mist:.12,win:.9,scrim:.28,vig:.48,hillF:[20,28,56],hillN:[10,15,34],glass:[12,18,38],glassA:.3,borderA:.13,text:[230,233,244],dim:[162,170,198],faint:[114,124,154],accent:[157,180,232],accentInk:[8,12,28],shadowA:.4,moonGlowA:.85,shaftA:.15,ts:'0 1px 24px rgba(5,8,20,.35)'}
};

const KEYS: [number, PalFrame][] = [
  [0, PAL.night], [270, PAL.pre], [330, PAL.dawn], [420, PAL.morning],
  [690, PAL.day], [1080, PAL.dusk], [1155, PAL.post], [1440, PAL.night],
];
const sm = (t: number) => t * t * (3 - 2 * t);
const mix = (a: unknown, b: unknown, t: number): unknown =>
  Array.isArray(a) ? (a as number[]).map((v, i) => v + ((b as number[])[i] - v) * t)
    : typeof a === "number" ? (a as number) + ((b as number) - (a as number)) * t
    : t < 0.5 ? a : b;

function palAt(m: number): PalFrame {
  for (let i = 0; i < KEYS.length - 1; i++) {
    const [a, pa] = KEYS[i], [b, pb] = KEYS[i + 1];
    if (m >= a && m < b) {
      const t = sm((m - a) / (b - a));
      const o: Record<string, unknown> = {};
      const paR = pa as unknown as Record<string, unknown>;
      const pbR = pb as unknown as Record<string, unknown>;
      for (const k in paR) o[k] = mix(paR[k], pbR[k], t);
      return o as unknown as PalFrame;
    }
  }
  return PAL.night;
}
const rgb = (c: readonly number[]) => `${c[0] | 0},${c[1] | 0},${c[2] | 0}`;

/* ---------- 太阳 / 月亮轨道（逐字照抄） ---------- */
function sunPos(m: number) {
  const r = 330, s = 1140;
  if (m < r || m > s) return null;
  const t = (m - r) / (s - r);
  const el = Math.sin(Math.PI * t);
  return { x: 8 + 84 * t, y: 78 - 58 * Math.pow(el, 0.85), el };
}
function moonPos(m: number) {
  const r = 1140, len = 615;
  let t = (m - r) / len;
  if (t < 0) t = (m + 1440 - r) / len;
  if (t < 0 || t >= 1) return null;
  const el = Math.sin(Math.PI * t);
  return { x: 14 + 72 * t, y: 78 - 52 * Math.pow(el, 0.9), el };
}

/* ---------- 时段文案（逐字照抄） ---------- */
export function phaseName(m: number): string {
  if (m < 315 || m >= 1140) return "夜晚";
  if (m < 420) return "黎明";
  if (m < 690) return "清晨";
  if (m < 1080) return "白昼";
  return "黄昏";
}
export const QUOTES: Record<string, [string, string]> = {
  黎明: ["破晓之前，星光最亮。", ""],
  清晨: ["一日之计在于晨。", "《增广贤文》"],
  白昼: ["怕什么真理无穷，进一寸有一寸的欢喜。", "胡适"],
  黄昏: ["莫道桑榆晚，为霞尚满天。", "刘禹锡"],
  夜晚: ["吹灭读书灯，一身都是月。", "桂苓"],
};
export function greeting(m: number): [string, string] {
  if (m < 300) return ["夜深了", "夜色正浓——明天的早班车还在等你。"];
  if (m < 345) return ["天快亮了", "黎明前的最后一段路，走完就是日出。"];
  if (m < 480) return ["早安", "日出时分，第一班列车准时发车。"];
  if (m < 720) return ["早上好", "阳光正好，适合出发。"];
  if (m < 780) return ["中午好", "正午的光最亮，别让它只照在桌面上。"];
  if (m < 1080) return ["下午好", "下午的站台人不多，正好专心赶路。"];
  if (m < 1140) return ["傍晚好", "晚霞是天空发给你的今日奖励。"];
  return ["晚上好", "夜晚的站台很安静，正适合一个人赶路。"];
}

const realMin = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
};

export interface SceneClock {
  /** 当前生效分钟数（整数，随真实时间/预览更新） */
  minutes: number;
  /** 时段名：夜晚/黎明/清晨/白昼/黄昏 */
  phase: string;
  /** 预览中的分钟数（null=跟随真实时间） */
  previewMin: number | null;
  /** 快进一日进行中 */
  ff: boolean;
  isPreview: boolean;
  /** 设置预览分钟；null 恢复跟随真实时间（同时停止快进） */
  setPreview: (v: number | null) => void;
  /** 快进一日（90 秒一循环）；再次调用停止 */
  toggleFF: () => void;
}

export function useSceneClock(): SceneClock {
  const [minutes, setMinutes] = useState(0);
  const [phase, setPhase] = useState("夜晚");
  const [previewMin, setPreviewMin] = useState<number | null>(null);
  const [ff, setFf] = useState(false);

  const previewRef = useRef<number | null>(null);
  const ffRef = useRef(false);
  const ffFrom = useRef(0);
  const ffStart = useRef(0);
  const lastMin = useRef(-1);
  const lastPhase = useRef("");

  useEffect(() => {
    let raf = 0;
    const el = document.documentElement.style;
    const sun = document.getElementById("sf-sun");
    const moon = document.getElementById("sf-moon");
    const shaftL = document.getElementById("sf-shaftL");
    const shaftR = document.getElementById("sf-shaftR");

    function setTheme(m: number) {
      const p = palAt(m);
      el.setProperty("--sky-t", `rgb(${rgb(p.skyT)})`);
      el.setProperty("--sky-m", `rgb(${rgb(p.skyM)})`);
      el.setProperty("--sky-b", `rgb(${rgb(p.skyB)})`);
      el.setProperty("--glow", `rgba(${rgb(p.glow)},${p.glowA})`);
      el.setProperty("--hill-f", `rgb(${rgb(p.hillF)})`);
      el.setProperty("--hill-n", `rgb(${rgb(p.hillN)})`);
      el.setProperty("--glass-bg", `rgba(${rgb(p.glass)},${p.glassA})`);
      el.setProperty("--glass-border", `rgba(255,255,255,${p.borderA})`);
      el.setProperty("--text", `rgb(${rgb(p.text)})`);
      el.setProperty("--dim", `rgb(${rgb(p.dim)})`);
      el.setProperty("--faint", `rgb(${rgb(p.faint)})`);
      el.setProperty("--accent", `rgb(${rgb(p.accent)})`);
      el.setProperty("--accent-ink", `rgb(${rgb(p.accentInk)})`);
      el.setProperty("--accent-soft", `rgba(${rgb(p.accent)},.14)`);
      el.setProperty("--track", `rgba(${rgb(p.text)},.14)`);
      el.setProperty("--shadow", `0 30px 80px -20px rgba(0,0,0,${p.shadowA})`);
      el.setProperty("--star-op", String(p.star));
      el.setProperty("--cloud-a", String(p.cloud));
      el.setProperty("--mist-a", String(p.mist));
      el.setProperty("--win-op", String(p.win));
      el.setProperty("--scrim-a", String(p.scrim));
      el.setProperty("--vig-a", String(p.vig));
      el.setProperty("--sun-col", `rgb(${rgb(p.sun)})`);
      el.setProperty("--sun-glow", `rgba(${rgb(p.sun)},.4)`);
      el.setProperty("--moon-glow", `rgba(205,218,255,${p.moonGlowA})`);
      el.setProperty("--shaft-a", String(p.shaftA));
      el.setProperty("--ts", p.ts);

      const s = sunPos(m), mo = moonPos(m);
      if (sun) {
        if (s) {
          sun.style.opacity = "1";
          sun.style.left = s.x + "vw";
          sun.style.top = s.y + "vh";
          const sz = 6 + 2 * (1 - s.el);
          sun.style.width = sz + "vh";
          sun.style.height = sz + "vh";
          const sh = Math.max(0, 1 - s.el / 0.3) * p.shaftA;
          if (shaftL && shaftR) {
            if (s.x < 50) { shaftL.style.opacity = String(sh); shaftR.style.opacity = "0"; }
            else { shaftR.style.opacity = String(sh); shaftL.style.opacity = "0"; }
          }
        } else {
          sun.style.opacity = "0";
          if (shaftL) shaftL.style.opacity = "0";
          if (shaftR) shaftR.style.opacity = "0";
        }
      }
      if (moon) {
        if (mo) {
          moon.style.opacity = "1";
          moon.style.left = mo.x + "vw";
          moon.style.top = mo.y + "vh";
          const mz = 5.5 + 1.5 * (1 - mo.el);
          moon.style.width = mz + "vh";
          moon.style.height = mz + "vh";
        } else moon.style.opacity = "0";
      }
    }

    const loop = (now: number) => {
      if (ffRef.current && now - ffStart.current > 90000) {
        ffRef.current = false;
        setFf(false);
      }
      const m = ffRef.current
        ? (ffFrom.current + ((now - ffStart.current) / 90000) * 1440) % 1440
        : previewRef.current ?? realMin();
      setTheme(m);
      const rounded = Math.floor(m);
      if (rounded !== lastMin.current) {
        lastMin.current = rounded;
        setMinutes(rounded);
      }
      const ph = phaseName(m);
      if (ph !== lastPhase.current) {
        lastPhase.current = ph;
        setPhase(ph);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return {
    minutes,
    phase,
    previewMin,
    ff,
    isPreview: previewMin !== null || ff,
    setPreview: (v) => {
      ffRef.current = false;
      setFf(false);
      previewRef.current = v;
      setPreviewMin(v);
    },
    toggleFF: () => {
      if (ffRef.current) {
        ffRef.current = false;
        setFf(false);
        previewRef.current = null;
        setPreviewMin(null);
        return;
      }
      ffRef.current = true;
      ffFrom.current = previewRef.current ?? realMin();
      ffStart.current = performance.now();
      previewRef.current = null;
      setPreviewMin(null);
      setFf(true);
    },
  };
}
