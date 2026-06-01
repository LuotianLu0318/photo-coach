// light.js —— 用离屏 canvas 采样亮度，判断 逆光 / 过曝欠曝 / 顶光阴影
// 无需模型。每帧把视频降到很小（如 64px 宽）再读像素，开销极低。

const SW = 64;                 // 采样宽
let sc = null, sctx = null;

function ensureCanvas(h) {
  if (!sc) { sc = document.createElement('canvas'); sctx = sc.getContext('2d', { willReadFrequently: true }); }
  if (sc.width !== SW || sc.height !== h) { sc.width = SW; sc.height = h; }
}

function lum(d, i) { return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; }

// faceBox: {x0,y0,x1,y1} 归一化坐标，可为 null
// 返回 { backlit, dark, bright, topShadow, faceLum }
export function analyzeLight(video, faceBox) {
  if (!video.videoWidth) return null;
  const h = Math.round(SW * video.videoHeight / video.videoWidth);
  ensureCanvas(h);
  sctx.drawImage(video, 0, 0, SW, h);
  const data = sctx.getImageData(0, 0, SW, h).data;

  // 全帧平均
  let total = 0, n = SW * h, over = 0;
  for (let i = 0; i < data.length; i += 4) {
    const l = lum(data, i);
    total += l;
    if (l > 250) over++;
  }
  const frameLum = total / n;
  const overRatio = over / n;

  let faceLum = null, faceTop = 0, faceBot = 0, backlit = false, topShadow = false;
  if (faceBox) {
    const x0 = Math.max(0, Math.floor(faceBox.x0 * SW));
    const x1 = Math.min(SW, Math.ceil(faceBox.x1 * SW));
    const y0 = Math.max(0, Math.floor(faceBox.y0 * h));
    const y1 = Math.min(h, Math.ceil(faceBox.y1 * h));
    const mid = (y0 + y1) >> 1;
    let fs = 0, fc = 0, ts = 0, tc = 0, bs = 0, bc = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const l = lum(data, (y * SW + x) * 4);
        fs += l; fc++;
        if (y < mid) { ts += l; tc++; } else { bs += l; bc++; }
      }
    }
    if (fc) {
      faceLum = fs / fc;
      faceTop = tc ? ts / tc : faceLum;
      faceBot = bc ? bs / bc : faceLum;
      // 逆光：脸明显比整帧暗、且整帧偏亮（背景过曝）
      backlit = faceLum < frameLum - 35 && frameLum > 120;
      // 顶光：上半脸比下半脸亮很多（眼窝/下巴重阴影）
      topShadow = faceTop - faceBot > 45;
    }
  }

  return {
    backlit,
    topShadow,
    dark: faceLum != null ? faceLum < 70 : frameLum < 45,
    bright: overRatio > 0.12 || (faceLum != null && faceLum > 235),
    faceLum,
  };
}
