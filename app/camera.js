// camera.js —— 摄像头取流 + 拍摄落地 JPEG
// 显示用一个隐藏的 <video>，画面由 main.js 绘到主 canvas（便于叠加构图线）。
// 拍摄时用原生分辨率单独画到离屏 canvas 导出，保证存下的原图是干净、高清的。

let video = null;
let stream = null;

export function getVideo() { return video; }

// 打开后置摄像头，尽量高分辨率
export async function startCamera() {
  video = document.createElement('video');
  video.setAttribute('playsinline', '');   // iOS 不全屏接管
  video.muted = true;

  const constraints = {
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },   // 后置
      width:  { ideal: 1920 },
      height: { ideal: 1080 },
    },
  };

  stream = await navigator.mediaDevices.getUserMedia(constraints);
  video.srcObject = stream;
  await video.play();
  // 等到真正有尺寸
  if (!video.videoWidth) {
    await new Promise((res) => video.addEventListener('loadedmetadata', res, { once: true }));
  }
  return video;
}

// 拍摄：把当前帧按摄像头原生分辨率画出来，导出 JPEG（不含任何叠加层）
export function capture() {
  if (!video || !video.videoWidth) return null;
  const c = document.createElement('canvas');
  c.width = video.videoWidth;
  c.height = video.videoHeight;
  const ctx = c.getContext('2d');
  ctx.drawImage(video, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.95);
}

export function stopCamera() {
  if (stream) stream.getTracks().forEach((t) => t.stop());
}
