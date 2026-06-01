// coach.js —— 规则引擎：汇总所有信号 → 排序 → 去抖 → 每次最多 2 条最关键提示
// 全部通过则给"绿灯可拍"。优先级：阻断(block) > 重要(warn) > 精修(tip)。

import { analyzeComposition } from './composition.js';
import { analyzePose } from './pose.js';

const PRI = { block: 3, warn: 2, tip: 1, good: 0 };

// 去抖状态：候选集稳定若干帧才真正切换显示，避免提示闪烁刷屏
let shown = [];
let pendingKey = '';
let stable = 0;
const STABLE = 5;

function keyOf(arr) { return arr.map((h) => h.key).join('|'); }

function debounce(cands) {
  if (keyOf(cands) === keyOf(shown)) { shown = cands; return shown; } // 同集刷新文案
  if (keyOf(cands) === pendingKey) stable++; else { pendingKey = keyOf(cands); stable = 0; }
  if (stable >= STABLE) shown = cands;
  return shown;
}

// signals: { face, pose, roll, light, time }
// 返回 { faceBox, hints: 显示用(≤2), ready }
export function coach(signals) {
  const { face, pose, roll, light, time } = signals;
  const all = [];

  // 没人：先把人放进画面
  if (!face && !pose) {
    all.push({ key: 'noperson', level: 'tip', text: '把人放进取景框' });
  }

  // 水平（方向由叠加层的水平线体现，文案只提示"歪了"）
  if (roll != null && Math.abs(roll) > 9) {
    all.push({ key: 'level', level: 'warn', text: '画面歪了，把手机转平' });
  }

  // 光线（逆光最优先）
  if (light) {
    if (light.backlit) all.push({ key: 'backlit', level: 'block', text: '逆光黑脸：转个方向，让光打在她脸上' });
    if (light.dark)    all.push({ key: 'dark',    level: 'warn',  text: '脸偏暗：换顺光方向或靠近光源/补光' });
    if (light.bright)  all.push({ key: 'bright',  level: 'warn',  text: '过曝了：避开强光或往暗处退一点' });
    if (light.topShadow) all.push({ key: 'topshadow', level: 'tip', text: '顶光阴影重：找阴凉处或顺光更柔' });
  }

  // 构图（头顶留白、关节裁切、主体位置）
  const comp = analyzeComposition(face, pose);
  for (const h of comp.hints) all.push(h);

  // 姿势/角度/机位
  for (const h of analyzePose(face, pose)) all.push(h);

  // 时机（仅在没有更要紧问题时作为轻提示）
  if (time && time.text && all.length === 0) {
    all.push({ key: 'time', level: 'tip', text: time.text });
  }

  // 排序取前 2
  all.sort((a, b) => PRI[b.level] - PRI[a.level]);
  const top = all.slice(0, 2);

  // 绿灯：没有阻断/重要问题，且画面里有人
  const ready = (face || pose) && !all.some((h) => h.level === 'block' || h.level === 'warn');

  const display = ready
    ? [{ key: 'ok', level: 'good', text: '构图 OK，可以拍 ✅' }]
    : debounce(top);

  return { faceBox: comp.faceBox, hints: display, ready };
}
