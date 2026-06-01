// vision.js —— 加载并运行 MediaPipe FaceLandmarker + PoseLandmarker
// 全部在手机浏览器本地运算，无后端。模型与 wasm 经 CDN 加载。

import {
  FilesetResolver,
  FaceLandmarker,
  PoseLandmarker,
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/vision_bundle.mjs';

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/wasm';
const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const POSE_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

let faceLandmarker = null;
let poseLandmarker = null;

export async function initVision() {
  const resolver = await FilesetResolver.forVisionTasks(WASM);

  faceLandmarker = await FaceLandmarker.createFromOptions(resolver, {
    baseOptions: { modelAssetPath: FACE_MODEL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numFaces: 1,
  });

  poseLandmarker = await PoseLandmarker.createFromOptions(resolver, {
    baseOptions: { modelAssetPath: POSE_MODEL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numPoses: 1,
  });
}

// 对当前视频帧做一次检测，timestamp 必须单调递增（毫秒）
// 返回 { face: landmarks[]|null, pose: landmarks[]|null }
export function detect(video, ts) {
  let face = null, pose = null;
  try {
    const fr = faceLandmarker.detectForVideo(video, ts);
    if (fr.faceLandmarks && fr.faceLandmarks.length) face = fr.faceLandmarks[0];
  } catch (e) { /* 单帧失败忽略 */ }
  try {
    const pr = poseLandmarker.detectForVideo(video, ts);
    if (pr.landmarks && pr.landmarks.length) pose = pr.landmarks[0];
  } catch (e) { /* 单帧失败忽略 */ }
  return { face, pose };
}
