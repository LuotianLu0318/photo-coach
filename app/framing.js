// framing.js —— 把"取景准不准"落到可测量的几何信号(参考 CHI2015):
//   信号A：被拍者锚点(人脸中心)与最近三分交叉点的对齐度
//   信号B：被拍者宽度 ≈ 画面 1/3
// 输出"单一方向 + 偏差强度 + 死区",供 overlay 画靶心+箭头、coach 决定是否提示。

const THIRDS = [
  [1 / 3, 1 / 3], [2 / 3, 1 / 3],
  [1 / 3, 2 / 3], [2 / 3, 2 / 3],
];
const DEAD = 0.05;        // 位置死区(归一化):偏差小于此不提示
const POSE_VIS = 0.3;

function bboxFromPose(pose) {
  let x0 = 1, y0 = 1, x1 = 0, y1 = 0, any = false;
  for (const p of pose) {
    if (p.visibility != null && p.visibility < POSE_VIS) continue;
    any = true;
    if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
  }
  return any ? { x0, y0, x1, y1 } : null;
}
function bboxFromFace(face) {
  let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
  for (const p of face) {
    if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
  }
  return { x0, y0, x1, y1 };
}

// 返回:
// { hasSubject, aligned, anchor:{x,y}, target:{x,y}, box,
//   kind:'move'|'near'|'far'|null, dir:{x,y}, mag, label }
export function analyzeFraming(face, pose) {
  const poseBox = pose ? bboxFromPose(pose) : null;
  const faceBox = face ? bboxFromFace(face) : null;
  if (!poseBox && !faceBox) return { hasSubject: false };

  // 锚点:优先人脸中心;否则人体上部
  const anchor = faceBox
    ? { x: (faceBox.x0 + faceBox.x1) / 2, y: (faceBox.y0 + faceBox.y1) / 2 }
    : { x: (poseBox.x0 + poseBox.x1) / 2, y: poseBox.y0 + (poseBox.y1 - poseBox.y0) * 0.15 };

  // 主体宽度与目标带:有身体用体宽(目标~1/3);只有脸用脸宽(半身,目标~0.18)
  const body = !!poseBox;
  const width = body ? (poseBox.x1 - poseBox.x0) : (faceBox.x1 - faceBox.x0);
  const lo = body ? 0.26 : 0.13;
  const hi = body ? 0.45 : 0.26;

  // 目标位置:吸附到最近的三分交叉点
  let target = THIRDS[0], best = 9;
  for (const t of THIRDS) {
    const d = Math.hypot(t[0] - anchor.x, t[1] - anchor.y);
    if (d < best) { best = d; target = { x: t[0], y: t[1] }; }
  }

  const dx = target.x - anchor.x;   // 锚点需要朝目标移动的方向
  const dy = target.y - anchor.y;
  const posMag = Math.hypot(dx, dy);
  const sizeErr = width < lo ? (lo - width) : (width > hi ? (width - hi) : 0);

  // 选偏差最大的单一维度作为"当前唯一要追的事"
  // 把尺寸偏差放大与位置偏差同尺度比较
  const sizeMag = sizeErr * 1.6;
  let kind = null, dir = { x: 0, y: 0 }, mag = 0, label = '';

  if (Math.max(posMag, sizeMag) > DEAD) {
    if (sizeMag >= posMag) {
      kind = width < lo ? 'near' : 'far';
      mag = sizeMag;
      label = kind === 'near' ? '靠近一点' : '退后一点';
    } else {
      kind = 'move';
      dir = { x: dx, y: dy };
      mag = posMag;
      // 主方向文字
      if (Math.abs(dx) >= Math.abs(dy)) label = dx > 0 ? '人向右移' : '人向左移';
      else label = dy > 0 ? '人向下移' : '人向上移';
    }
  }

  const aligned = posMag <= DEAD && sizeErr === 0;
  return { hasSubject: true, aligned, anchor, target, box: poseBox || faceBox, kind, dir, mag, label };
}
