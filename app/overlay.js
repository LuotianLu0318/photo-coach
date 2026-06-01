// overlay.js —— 主 canvas:视频(cover) + 姿势叠加 + 靶心/箭头取景引导。
// 提示文字由 DOM(ui.js)渲染;这里只画图形层。

let dpr = Math.min(window.devicePixelRatio || 1, 2);

export function fitCanvas(canvas) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr; canvas.height = h * dpr;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

function coverFit(cw, ch, vw, vh) {
  const scale = Math.max(cw / vw, ch / vh);
  const dw = vw * scale, dh = vh * scale;
  return { dx: (cw - dw) / 2, dy: (ch - dh) / 2, dw, dh };
}
// 归一化坐标 → canvas 像素(与视频 cover 同变换)
function mapper(f) { return (nx, ny) => [f.dx + nx * f.dw, f.dy + ny * f.dh]; }

function colorByMag(mag) {
  if (mag > 0.18) return 'rgba(255,59,48,0.95)';    // 偏差大:红
  if (mag > 0.09) return 'rgba(255,149,0,0.95)';    // 中:橙
  return 'rgba(255,255,255,0.9)';
}

function arrow(ctx, x0, y0, x1, y1, color, width) {
  const a = Math.atan2(y1 - y0, x1 - x0), head = 14;
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - head * Math.cos(a - 0.5), y1 - head * Math.sin(a - 0.5));
  ctx.lineTo(x1 - head * Math.cos(a + 0.5), y1 - head * Math.sin(a + 0.5));
  ctx.closePath(); ctx.fill();
}

export function render(canvas, video, opts) {
  const { ctx, w, h } = fitCanvas(canvas);
  ctx.clearRect(0, 0, w, h);

  const f = video.videoWidth ? coverFit(w, h, video.videoWidth, video.videoHeight) : null;
  if (f) ctx.drawImage(video, f.dx, f.dy, f.dw, f.dh);
  const map = f ? mapper(f) : (nx, ny) => [nx * w, ny * h];
  // 姿势引导已移到画面角落的参考卡(DOM),不再叠在人身上 —— 见 ui.js

  // ---- 三分网格(可关)----
  if (opts.gridOn) {
    ctx.strokeStyle = 'rgba(255,255,255,0.32)'; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(w / 3, 0); ctx.lineTo(w / 3, h);
    ctx.moveTo(2 * w / 3, 0); ctx.lineTo(2 * w / 3, h);
    ctx.moveTo(0, h / 3); ctx.lineTo(w, h / 3);
    ctx.moveTo(0, 2 * h / 3); ctx.lineTo(w, 2 * h / 3);
    ctx.stroke();
  }

  // ---- 取景引导:靶心 + 单个方向箭头 ----
  const fr = opts.framing;
  if (fr && fr.hasSubject && (opts.focus === 'frame' || opts.focus === 'ok')) {
    const [tx, ty] = map(fr.target.x, fr.target.y);
    const [ax, ay] = map(fr.anchor.x, fr.anchor.y);
    const r = w * 0.07;
    const ok = fr.aligned;
    // 靶心圈
    ctx.strokeStyle = ok ? 'rgba(52,199,89,0.95)' : 'rgba(255,255,255,0.85)';
    ctx.lineWidth = ok ? 4 : 2.5;
    ctx.beginPath(); ctx.arc(tx, ty, r, 0, Math.PI * 2); ctx.stroke();
    if (ok) { ctx.fillStyle = 'rgba(52,199,89,0.18)'; ctx.fill(); }

    if (!ok) {
      const col = colorByMag(fr.mag);
      if (fr.kind === 'move') {
        arrow(ctx, ax, ay, tx, ty, col, 4);
      } else if (fr.kind === 'near' || fr.kind === 'far') {
        // 近/远:在锚点上画一对内/外箭头
        const dir = fr.kind === 'near' ? 1 : -1;
        arrow(ctx, ax - 40 * dir, ay, ax - 12 * dir, ay, col, 4);
        arrow(ctx, ax + 40 * dir, ay, ax + 12 * dir, ay, col, 4);
      }
    }
  }

  // ---- 水平线(仅在追水平时显示)----
  if (opts.focus === 'level' && opts.roll != null) {
    const cx = w / 2, cy = h / 2, half = w * 0.32;
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - half, cy); ctx.lineTo(cx + half, cy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = Math.abs(opts.roll) < 2 ? 'rgba(52,199,89,0.95)' : 'rgba(255,149,0,0.95)';
    ctx.lineWidth = 2.5;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(opts.roll * Math.PI / 180);
    ctx.beginPath(); ctx.moveTo(-half, 0); ctx.lineTo(half, 0); ctx.stroke(); ctx.restore();
  }
}
