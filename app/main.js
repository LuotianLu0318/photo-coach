// main.js —— 主循环:取帧 → 检测 → coach(单焦点) → overlay/DOM 渲染
import { startCamera, getVideo, capture } from './camera.js';
import { initVision, detect } from './vision.js';
import { initSensors, getRoll } from './sensors.js';
import { analyzeLight } from './light.js';
import { coach } from './coach.js';
import { render } from './overlay.js';
import { getPoseImage, isReference, getPoseId, getCue, setPose, setReferencePhoto } from './pose.js';
import { renderHints, setShutterReady, buildPoseTray, refreshTray } from './ui.js';

const $ = (id) => document.getElementById(id);

$('start-btn').addEventListener('click', async () => {
  const status = $('start-status');
  try {
    status.textContent = '正在申请权限…';
    await initSensors();
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

let gridOn = true;
function setupControls() {
  const tray = $('pose-tray');
  buildPoseTray(tray, (id) => setPose(id), () => $('ref-input').click());

  $('grid-btn').addEventListener('click', () => {
    gridOn = !gridOn;
    $('grid-btn').classList.toggle('active', gridOn);
  });
  $('grid-btn').classList.toggle('active', gridOn);

  $('pose-btn').addEventListener('click', () => { tray.classList.toggle('hidden'); refreshTray(tray); });
  $('shutter').addEventListener('click', onShutter);
  $('retake').addEventListener('click', () => $('preview').classList.add('hidden'));

  // 真人参考图:从相册选一张做半透明叠加
  $('ref-input').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setReferencePhoto(reader.result); refreshTray(tray); };
    reader.readAsDataURL(file);
  });
}

function onShutter() {
  const data = capture();
  if (!data) return;
  $('preview-img').src = data;
  $('save-link').href = data;
  $('preview').classList.remove('hidden');
}

let lastDetect = 0;
let prevReady = false;
const DETECT_MS = 80;

function loop() {
  const video = getVideo();
  const canvas = $('view');
  const now = performance.now();

  if (now - lastDetect > DETECT_MS && video.videoWidth) {
    lastDetect = now;
    const { face, pose } = detect(video, now);
    const out = coach({ face, pose, roll: getRoll(), light: analyzeLight(video, faceBox(face)) });

    // 提示:主焦点一条 + 姿势口令/参考图一条
    const chips = [out.hint];
    if (isReference()) chips.push({ level: 'tip', text: '📷 照着参考图摆' });
    else if (getPoseId()) chips.push({ level: 'tip', text: '🧍 ' + getCue(getPoseId()) });
    renderHints(chips);
    setShutterReady(out.ready);

    // 对齐瞬间震动一下(若支持)
    if (out.ready && !prevReady && navigator.vibrate) navigator.vibrate(35);
    prevReady = out.ready;

    cache.out = out;
  }

  const out = cache.out;
  render(canvas, video, {
    roll: getRoll(), gridOn,
    focus: out?.focus, framing: out?.framing,
    poseImg: getPoseImage(), isRef: isReference(),
    box: out?.framing?.box, poseAligned: out?.framing?.aligned,
  });
  requestAnimationFrame(loop);
}
const cache = { out: null };

function faceBox(face) {
  if (!face) return null;
  let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
  for (const p of face) {
    if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
  }
  return { x0, y0, x1, y1 };
}
