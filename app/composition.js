// composition.js —— 由 landmarks 推导构图问题：头顶留白、关节裁切、主体位置
// 也顺手算出人脸 bbox 供 light.js 采样。坐标都是归一化 [0,1]。

const VIS = 0.5;   // pose 关节可见度阈值

function faceBBox(face) {
  let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
  for (const p of face) {
    if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
  }
  return { x0, y0, x1, y1, cx: (x0 + x1) / 2, top: y0 };
}

function vis(pose, i) {
  const p = pose[i];
  return p && (p.visibility == null || p.visibility > VIS) && p.y < 1.02 && p.y > -0.02;
}

// 返回 { faceBox, hints: [{key, level, text}] }
export function analyzeComposition(face, pose) {
  const hints = [];
  let faceBox = null;

  if (face) {
    faceBox = faceBBox(face);

    // 头顶留白
    if (faceBox.top < 0.04) {
      hints.push({ key: 'headroom', level: 'warn', text: '头顶快被切了，镜头上抬一点' });
    } else if (faceBox.top > 0.30) {
      hints.push({ key: 'headroom', level: 'tip', text: '头顶留白偏多，镜头下移或让她靠近' });
    }

    // 主体位置（单人过于居中时建议挪到三分线）
    if (Math.abs(faceBox.cx - 0.5) < 0.07) {
      const dir = faceBox.cx <= 0.5 ? '右' : '左';
      hints.push({ key: 'thirds', level: 'tip', text: `让她往${dir}挪一点，站到三分线更耐看` });
    }
  }

  if (pose) {
    const kneeV = vis(pose, 25) || vis(pose, 26);
    const ankleV = vis(pose, 27) || vis(pose, 28);
    const hipV = vis(pose, 23) || vis(pose, 24);

    // 经典忌讳：在关节处裁切
    if (kneeV && !ankleV) {
      hints.push({ key: 'crop', level: 'warn', text: '切在小腿/膝盖了：拍到脚，或裁到大腿中段' });
    } else if (hipV && !kneeV && !ankleV) {
      hints.push({ key: 'crop', level: 'tip', text: '半身构图：裁到大腿中段比卡在胯部更稳' });
    }
  }

  return { faceBox, hints };
}
