// coach.js —— 单焦点引导阶梯:一次只追一条规则(参考 GudoCam/Guided Frame)。
// 顺序:没人 → 逆光(阻断) → 取景对齐(靶心+箭头) → 水平 → 脸太暗 → 绿灯可拍。
// 取景"准不准"交给 framing.js 的几何信号,不再用模糊的多条文字命令。

import { analyzeFraming } from './framing.js';

// signals: { face, pose, roll, light }
// 返回 { focus, hint:{text,level}, framing, ready }
export function coach(signals) {
  const { face, pose, roll, light } = signals;

  if (!face && !pose) {
    return { focus: 'noperson', hint: { text: '把人放进取景框', level: 'tip' }, ready: false };
  }

  // 逆光黑脸:最影响成片,作为阻断打断取景
  if (light && light.backlit) {
    return { focus: 'backlit', hint: { text: '逆光黑脸:转个方向让光打在脸上', level: 'block' }, ready: false };
  }

  // 取景对齐(核心):把人移到靶心、调到合适大小
  const fr = analyzeFraming(face, pose);
  if (fr.hasSubject && !fr.aligned) {
    return { focus: 'frame', framing: fr, hint: { text: fr.label || '把人移到圈里', level: 'warn' }, ready: false };
  }

  // 水平
  if (roll != null && Math.abs(roll) > 9) {
    return { focus: 'level', framing: fr, hint: { text: '画面歪了,把手机转平', level: 'warn' }, ready: false };
  }

  // 脸偏暗 / 过曝(取景对齐后再追光)
  if (light && light.dark) {
    return { focus: 'light', framing: fr, hint: { text: '脸偏暗:换顺光方向或靠近光源/补光', level: 'warn' }, ready: false };
  }
  if (light && light.bright) {
    return { focus: 'light', framing: fr, hint: { text: '过曝了:避开强光或往暗处退一点', level: 'warn' }, ready: false };
  }

  // 全部通过 → 绿灯
  return { focus: 'ok', framing: fr, hint: { text: '构图 OK,可以拍 ✅', level: 'good' }, ready: true };
}
