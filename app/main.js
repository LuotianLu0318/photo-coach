// main.js —— 主循环：取帧 → 各分析器 → coach → overlay/DOM 渲染
import { startCamera, getVideo, capture } from './camera.js';
import { initVision, detect } from './vision.js';
import { initSensors, getRoll, timeOfDayHint } from './sensors.js';
import { analyzeLight } from './light.js';
import { coach } from './coach.js';
import { render } from './overlay.js';
import { getPoseImage, setPose } from './pose.js';
import { renderHints, setShutterReady, buildPoseTray, refreshTray } from './ui.js';

const $ = (id) => document.getElementById(id);

// --- 启动 ---
$('start-btn').addEventListener('click', async () => {
  const status = $('start-status');
  try {
    status.textContent = '正在申请权限…';
    await initSensors();                       // 传感器（iOS 必须在手势里申请）
    status.textContent = '正在打开摄像头…';
    await startCamera();
    status.textContent = '正在加载 AI 模型（首次稍久）…';
    await initVision();
    $('start-screen').classList.add('hidden');
    $('camera-screen').classList.remove('hidden');
    setupControls();
    loop();
  } catch (e) {
    status.textContent = '启动失败：' + (e.message || e) + '（需 HTTPS，且允许摄像头权限）';
  }
});

// --- 控件 ---
let gridOn = true;
function setupControls() {
  const tray = $('pose-tray');
  buildPoseTray(tray, (id) => { setPose(id); });

  $('grid-btn').addEventListener('click', () => {
    gridOn = !gridOn;
    $('grid-btn').classList.toggle('active', gridOn);
  });
  $('grid-btn').classList.toggle('active', gridOn);

  $('pose-btn').addEventListener('click', () => {
    tray.classList.toggle('hidden');
    refreshTray(tray);
  });

  $('shutter').addEventListener('click', onShutter);
  $('retake').addEventListener('click', () => $('preview').classList.add('hidden'));
}

function onShutter() {
  const data = capture();
  if (!data) return;
  $('preview-img').src = data;
  $('save-link').href = data;
  $('preview').classList.remove('hidden');
}

// --- 主循环 ---
let lastDetect = 0;
let cached = { face: null, pose: null, light: null }; // 检测较重，节流复用
const DETECT_MS = 80;

function loop() {
  const video = getVideo();
  const canvas = $('view');
  const now = performance.now();

  // 检测节流（绘制保持满帧，提示按 ~12fps 更新足够）
  if (now - lastDetect > DETECT_MS && video.videoWidth) {
    lastDetect = now;
    const { face, pose } = detect(video, now);
    cached.face = face; cached.pose = pose;

    const out = coach({
      face, pose,
      roll: getRoll(),
      light: analyzeLight(video, lastFaceBox(face)),
      time: timeOfDayHint(),
    });
    renderHints(out.hints);
    setShutterReady(out.ready);
    cached.faceBox = out.faceBox;
  }

  render(canvas, video, { roll: getRoll(), gridOn, poseImg: getPoseImage() });
  requestAnimationFrame(loop);
}

// 给 light.js 用的人脸 bbox（与 composition 内同款，简单内联，避免循环依赖）
function lastFaceBox(face) {
  if (!face) return null;
  let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
  for (const p of face) {
    if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
  }
  return { x0, y0, x1, y1 };
}
