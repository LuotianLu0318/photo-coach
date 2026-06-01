// overlay.js —— 把视频画到主 canvas（cover 适配）并叠加：三分网格、水平线、姿势剪影
// 提示文字由 DOM 渲染（见 ui.js），这里只画图形层。

let dpr = Math.min(window.devicePixelRatio || 1, 2);

// 让 canvas 内部分辨率匹配显示尺寸；之后所有绘制用 CSS 像素坐标
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

export function render(canvas, video, opts) {
  const { ctx, w, h } = fitCanvas(canvas);
  ctx.clearRect(0, 0, w, h);

  // 1) 视频画面（cover）
  if (video.videoWidth) {
    const f = coverFit(w, h, video.videoWidth, video.videoHeight);
    ctx.drawImage(video, f.dx, f.dy, f.dw, f.dh);
  }

  // 2) 姿势剪影（半透明，居中）
  if (opts.poseImg && opts.poseImg.complete && opts.poseImg.naturalWidth) {
    const ih = h * 0.78, iw = ih * (100 / 200);
    ctx.globalAlpha = 0.35;
    ctx.drawImage(opts.poseImg, (w - iw) / 2, (h - ih) / 2, iw, ih);
    ctx.globalAlpha = 1;
  }

  // 3) 三分网格
  if (opts.gridOn) {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 3, 0); ctx.lineTo(w / 3, h);
    ctx.moveTo(2 * w / 3, 0); ctx.lineTo(2 * w / 3, h);
    ctx.moveTo(0, h / 3); ctx.lineTo(w, h / 3);
    ctx.moveTo(0, 2 * h / 3); ctx.lineTo(w, 2 * h / 3);
    ctx.stroke();
  }

  // 4) 水平线：虚线=真水平参照；实线=当前倾斜，对齐即转绿
  if (opts.roll != null) {
    const cx = w / 2, cy = h / 2, half = w * 0.32;
    const level = Math.abs(opts.roll) < 2;
    // 参照（真水平）
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - half, cy); ctx.lineTo(cx + half, cy); ctx.stroke();
    ctx.setLineDash([]);
    // 当前倾斜指示
    const a = opts.roll * Math.PI / 180;
    ctx.strokeStyle = level ? 'rgba(52,199,89,0.95)' : 'rgba(255,149,0,0.95)';
    ctx.lineWidth = 2.5;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(-half, 0); ctx.lineTo(half, 0); ctx.stroke();
    ctx.restore();
  }
}
