// sensors.js —— 设备朝向（水平/倾角） + 当前时间（黄金时刻）
// 用重力向量算"画面横滚角(roll)"，比 deviceorientation 的 beta/gamma 在不同握持下更稳。

let roll = 0;          // 画面倾斜角，约 0 = 水平；正负代表方向（真机上按需翻转符号）
let hasOrientation = false;

function onMotion(e) {
  const g = e.accelerationIncludingGravity;
  if (!g || g.x == null) return;
  // 竖屏举着手机时，重力主要落在设备 y 轴；x 的偏移即左右倾斜
  let a = Math.atan2(g.x, g.y) * 180 / Math.PI;   // 水平时约 ±180
  let tilt = a > 0 ? a - 180 : a + 180;           // 归一到 0 附近
  roll = roll * 0.8 + tilt * 0.2;                 // 低通平滑，去抖
  hasOrientation = true;
}

// iOS 需在用户手势里申请权限；其它平台直接监听
export async function initSensors() {
  try {
    if (typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function') {
      const res = await DeviceMotionEvent.requestPermission();
      if (res !== 'granted') return false;
    }
    window.addEventListener('devicemotion', onMotion, true);
    return true;
  } catch (e) {
    return false;
  }
}

export function getRoll() { return hasOrientation ? roll : null; }

// 黄金时刻判断（v1：按本地时间分段，后续可换精确日照）
export function timeOfDayHint() {
  const h = new Date().getHours();
  if (h >= 6 && h < 8)   return { golden: true,  text: '清晨柔光，正适合拍' };
  if (h >= 16 && h < 19) return { golden: true,  text: '黄金时刻，光线最讨喜' };
  if (h >= 11 && h < 15) return { golden: false, text: '正午顶光偏硬，找阴凉或顺光处' };
  return { golden: false, text: null };
}
