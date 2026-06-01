// pose.js —— 人脸角度提示、机位高低启发式、姿势剪影模板
// 姿势模板用"真人体态轮廓"（填充式人体剪影 SVG），让被拍者照着摆身形；机位/角度给文字提示。

// ---------- 真人轮廓构件（viewBox 100x200，约 7.5 头身，白色实心剪影）----------
const VB = 'viewBox="0 0 100 200"';
// 圆头实心笔触画肢体（含颈），points: [[x,y],...]
function cap(points, w) {
  const d = 'M ' + points.map((p) => p.join(' ')).join(' L ');
  return `<path d="${d}" fill="none" stroke="white" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
function torso(points) { return `<polygon points="${points.map((p) => p.join(',')).join(' ')}"/>`; }
function head(cx, cy, rx, ry) { return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`; }
function body(inner) {
  return `<svg ${VB} xmlns="http://www.w3.org/2000/svg"><g fill="white" stroke="none">${inner}</g></svg>`;
}
const ARM = 9, LEG = 13, NECK = 8;   // 肢体粗细：让轮廓有真人体积感

// 标准关节，方便派生各姿势
const STD_HEAD = [50, 17, 12, 14];
const STD_NECK = [[50, 29], [50, 42]];
const STD_TORSO = [[39, 43], [63, 43], [60, 78], [60, 106], [42, 106], [41, 78]];
const AL = [[41, 46], [34, 70], [33, 98]];      // 左臂自然下垂
const AR = [[61, 46], [67, 70], [68, 98]];      // 右臂自然下垂
const LL = [[46, 106], [46, 152], [45, 193]];   // 左腿
const LR = [[57, 106], [58, 152], [59, 193]];   // 右腿

// 关节坐标 → 人体剪影。extras 先画（墙/栏/裙等背景），再叠白色人体
function person(o) {
  let s = o.extras || '';
  const h = o.head || STD_HEAD;
  s += head(h[0], h[1], h[2] || 12, h[3] || 14);
  if (o.neck !== null) s += cap(o.neck || STD_NECK, NECK);
  s += torso(o.torso || STD_TORSO);
  const arms = o.arms === undefined ? [AL, AR] : o.arms;
  arms.forEach((a) => { s += cap(a, o.armW || ARM); });
  const legs = o.legs === undefined ? [LL, LR] : o.legs;
  legs.forEach((l) => { s += cap(l, o.legW || LEG); });
  return body(s);
}

export const CATS = [
  { key: 'stand', name: '站姿' },
  { key: 'lean',  name: '靠' },
  { key: 'sit',   name: '坐' },
  { key: 'move',  name: '动态' },
  { key: 'squat', name: '蹲' },
  { key: 'close', name: '半身' },
];

export const TEMPLATES = [
  // ---------- 站姿 ----------
  { id: 'hand-hip', name: '叉腰侧身', cat: 'stand', svg: person({
    head: [51, 17, 12, 14], neck: [[51, 29], [51, 42]],
    arms: [[[41, 46], [33, 70], [45, 88]], [[61, 46], [67, 74], [70, 100]]],
    legs: [LL, [[57, 106], [60, 150], [63, 191]]] }) },
  { id: 'look-back', name: '回头', cat: 'stand', svg: person({
    head: [58, 17, 11, 13], neck: [[54, 29], [55, 42]],
    torso: [[40, 44], [62, 41], [61, 78], [60, 107], [43, 108], [42, 78]],
    arms: [[[41, 47], [35, 72], [34, 99]], [[61, 44], [67, 71], [68, 97]]] }) },
  { id: 'arms-cross', name: '抱臂', cat: 'stand', svg: person({
    arms: [[[41, 47], [33, 63], [59, 73]], [[61, 47], [67, 63], [42, 71]]] }) },
  { id: 'hair', name: '撩发', cat: 'stand', svg: person({
    head: [52, 17, 12, 14], arms: [[[41, 46], [40, 28], [49, 15]], AR] }) },
  { id: 'pocket', name: '插兜', cat: 'stand', svg: person({
    arms: [[[41, 46], [36, 72], [45, 96]], [[61, 46], [66, 72], [57, 96]]] }) },
  { id: 'hands-back', name: '背手', cat: 'stand', svg: person({
    arms: [[[41, 46], [38, 76], [50, 94]], [[61, 46], [62, 76], [50, 94]]] }) },
  { id: 'heart', name: '比心', cat: 'stand', svg: person({
    head: [50, 19, 12, 14], arms: [[[41, 47], [30, 30], [49, 9]], [[61, 47], [72, 30], [53, 9]]] }) },
  { id: 'reach-up', name: '举手伸展', cat: 'stand', svg: person({
    head: [50, 18, 12, 14], arms: [[[41, 46], [42, 24], [44, 6]], [[61, 46], [72, 58], [80, 66]]] }) },

  // ---------- 靠 ----------
  { id: 'lean-wall', name: '靠墙交叉腿', cat: 'lean', svg: person({
    extras: '<rect x="8" y="4" width="9" height="192" rx="4" opacity="0.45"/>',
    head: [35, 19, 12, 14], neck: [[32, 31], [33, 44]],
    torso: [[25, 46], [49, 43], [52, 80], [55, 110], [38, 112], [34, 80]],
    arms: [[[27, 48], [23, 74], [25, 99]], [[49, 46], [58, 68], [60, 92]]],
    legs: [[[42, 111], [44, 152], [41, 193]], [[51, 111], [45, 150], [60, 189]]] }) },
  { id: 'wall-front', name: '靠墙单脚', cat: 'lean', svg: person({
    extras: '<rect x="6" y="4" width="88" height="192" rx="8" opacity="0.22"/>',
    legs: [LL, [[57, 106], [64, 146], [55, 124]]] }) },   // 一脚踩墙
  { id: 'rail', name: '扶栏前倾', cat: 'lean', svg: person({
    extras: '<rect x="6" y="98" width="88" height="7" rx="3" opacity="0.5"/>',
    arms: [[[41, 46], [40, 74], [26, 100]], [[61, 46], [62, 74], [74, 100]]] }) },

  // ---------- 坐 ----------
  { id: 'sit', name: '坐姿前伸', cat: 'sit', svg: person({
    head: [46, 20, 12, 14], neck: [[46, 32], [47, 45]],
    torso: [[36, 47], [58, 45], [60, 76], [60, 98], [40, 100], [38, 76]],
    arms: [[[39, 50], [41, 78], [60, 96]], [[57, 47], [63, 72], [64, 96]]],
    legs: [[[46, 99], [80, 106], [80, 158]], [[52, 99], [74, 112], [73, 162]]] }) },
  { id: 'hug-knee', name: '屈膝抱腿', cat: 'sit', svg: person({
    head: [48, 30, 12, 14], neck: [[48, 42], [48, 52]],
    torso: [[38, 54], [58, 54], [58, 90], [40, 94]],
    arms: [[[40, 60], [42, 70], [58, 64]], [[58, 60], [60, 70], [46, 64]]],
    legs: [[[44, 92], [44, 62], [52, 98]], [[54, 92], [58, 62], [64, 98]]] }) },
  { id: 'side-sit', name: '侧坐', cat: 'sit', svg: person({
    head: [46, 22, 12, 14], neck: [[46, 34], [46, 46]],
    torso: [[37, 48], [57, 48], [60, 78], [60, 98], [40, 100], [38, 78]],
    arms: [[[40, 52], [34, 80], [30, 104]], [[57, 50], [64, 74], [70, 96]]],
    legs: [[[48, 99], [70, 106], [86, 98]], [[54, 100], [74, 114], [88, 110]]] }) },
  { id: 'step-sit', name: '台阶坐', cat: 'sit', svg: person({
    extras: '<rect x="38" y="150" width="62" height="50" opacity="0.16"/>',
    head: [44, 24, 12, 14], neck: [[44, 36], [44, 48]],
    torso: [[35, 50], [55, 50], [58, 78], [58, 98], [40, 100], [37, 78]],
    arms: [[[40, 54], [44, 84], [66, 108]], [[55, 52], [60, 76], [62, 98]]],
    legs: [[[46, 99], [70, 108], [66, 150]], [[52, 99], [60, 124], [58, 168]]] }) },

  // ---------- 动态 ----------
  { id: 'walk', name: '走动分腿', cat: 'move', svg: person({
    head: [53, 17, 12, 14], neck: [[52, 29], [51, 42]],
    torso: [[40, 44], [62, 42], [60, 76], [60, 104], [43, 106], [42, 76]],
    arms: [[[41, 46], [36, 68], [41, 90]], [[61, 44], [68, 66], [66, 90]]],
    legs: [[[46, 106], [40, 150], [33, 190]], [[57, 106], [64, 148], [73, 186]]] }) },
  { id: 'walk-back', name: '回头走', cat: 'move', svg: person({
    head: [60, 17, 11, 13], neck: [[55, 29], [56, 42]],
    torso: [[40, 44], [62, 42], [60, 76], [60, 104], [43, 106], [42, 76]],
    arms: [[[41, 46], [36, 68], [41, 90]], [[61, 44], [68, 66], [66, 90]]],
    legs: [[[46, 106], [40, 150], [33, 190]], [[57, 106], [64, 148], [73, 186]]] }) },
  { id: 'twirl', name: '转圈裙摆', cat: 'move', svg: person({
    extras: '<polygon points="50,98 90,186 10,186"/>',
    head: [50, 18, 12, 14],
    arms: [[[41, 46], [30, 54], [20, 50]], [[61, 46], [72, 54], [82, 50]]],
    legs: [[[43, 184], [42, 193]], [[59, 184], [60, 193]]] }) },
  { id: 'jump', name: '跳跃', cat: 'move', svg: person({
    head: [50, 15, 12, 14], neck: [[50, 27], [50, 40]],
    arms: [[[41, 44], [40, 24], [42, 8]], [[61, 44], [62, 24], [60, 8]]],
    legs: [[[46, 104], [34, 126], [44, 150]], [[57, 104], [68, 124], [60, 150]]] }) },

  // ---------- 蹲 ----------
  { id: 'squat', name: '蹲姿', cat: 'squat', svg: person({
    head: [50, 58, 12, 14], neck: [[50, 70], [50, 82]],
    torso: [[40, 83], [60, 83], [62, 106], [58, 136], [42, 136], [38, 106]],
    arms: [[[42, 88], [34, 116], [28, 148]], [[58, 88], [66, 116], [72, 148]]],
    legs: [[[44, 136], [28, 150], [40, 192]], [[56, 136], [72, 150], [60, 192]]] }) },
  { id: 'kneel', name: '单膝跪', cat: 'squat', svg: person({
    head: [50, 30, 12, 14], neck: [[50, 42], [50, 54]],
    torso: [[40, 55], [60, 55], [60, 84], [60, 98], [40, 98], [40, 84]],
    arms: [[[41, 58], [37, 84], [40, 104]], [[59, 58], [64, 100], [66, 146]]],
    legs: [[[45, 98], [40, 150], [58, 176]], [[56, 98], [66, 148], [64, 192]]] }) },

  // ---------- 半身 ----------
  { id: 'half-chin', name: '半身收下巴', cat: 'close', svg: person({
    head: [50, 44, 21, 23], neck: null, arms: [], legs: [],
    torso: [[50, 64], [80, 104], [84, 200], [16, 200], [20, 104]] }) },
  { id: 'chin-hand', name: '托腮', cat: 'close', svg: person({
    head: [50, 44, 21, 23], neck: null, legs: [], armW: 14,
    arms: [[[30, 150], [34, 108], [46, 62]]],
    torso: [[50, 64], [80, 104], [84, 200], [16, 200], [20, 104]] }) },
  { id: 'face-frame', name: '手框脸', cat: 'close', svg: person({
    head: [50, 42, 20, 22], neck: null, legs: [], armW: 13,
    arms: [[[26, 150], [30, 100], [38, 46]], [[74, 150], [70, 100], [62, 46]]],
    torso: [[50, 64], [80, 104], [84, 200], [16, 200], [20, 104]] }) },
];

// 每个姿势配一句口令(证据:纯剪影不够直观,必须配文字指导)
export const CUES = {
  'hand-hip': '重心放一条腿，一手叉腰，身体侧 30°',
  'look-back': '身体朝前、回头看镜头，下巴微抬',
  'arms-cross': '双臂轻抱胸前，肩膀放松别耸',
  'hair': '一手撩头发，眼神看向斜上方',
  'pocket': '双手插兜，肩膀压低显随性',
  'hands-back': '双手背后，挺背收腹',
  'heart': '双手头顶比心，笑出来',
  'reach-up': '一手向上伸展，身体拉成斜线',
  'lean-wall': '肩靠墙、双腿交叉，重心交给墙',
  'wall-front': '背靠墙，一脚踩墙，手自然垂',
  'rail': '双手扶栏前倾，挺胸送下巴向前',
  'sit': '坐下双腿前伸，脚背绷直显腿长',
  'hug-knee': '屈膝抱腿，下巴搭在膝上',
  'side-sit': '双腿并拢折向一侧，一手撑地',
  'step-sit': '坐台阶，一腿屈起一手搭膝',
  'walk': '自然向前走，别看镜头抓拍',
  'walk-back': '边走边回头，发丝带点动感',
  'twirl': '转圈让裙摆飞起，张开手臂',
  'jump': '蹲一下再跳，落地前按快门',
  'squat': '蹲下膝盖朝外，手轻搭膝盖',
  'kneel': '单膝跪地，另一手搭在前膝',
  'half-chin': '上半身特写，微收下巴显脸小',
  'chin-hand': '一手轻托腮，眼神看镜头',
  'face-frame': '双手在脸两侧轻轻框脸',
};
export function getCue(id) { return CUES[id] || ''; }

let selectedId = null;
let cachedImg = null, cachedFor = null;
let refImg = null;   // 真人参考图(用户从相册选)

export function setPose(id) {
  selectedId = (selectedId === id) ? null : id;
  if (selectedId) refImg = null;   // 选剪影时清掉参考图,二者只显示其一
}
export function getPoseId() { return selectedId; }

// 用户选的真人参考图(幽灵叠加),优先级高于剪影
export function setReferencePhoto(dataUrl) {
  if (!dataUrl) { refImg = null; return; }
  const img = new Image(); img.src = dataUrl;
  refImg = img; selectedId = null;
}
export function getReferenceImage() { return refImg; }
export function hasReference() { return !!refImg; }

// 返回当前要叠加的图:优先真人参考图,否则选中的剪影(缓存),都没有返回 null
export function getPoseImage() {
  if (refImg) return refImg;
  if (!selectedId) return null;
  if (cachedFor === selectedId && cachedImg) return cachedImg;
  const t = TEMPLATES.find((x) => x.id === selectedId);
  const img = new Image();
  img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(t.svg);
  cachedImg = img; cachedFor = selectedId;
  return img;
}

// 当前叠加层是否为真人参考图(overlay 用不同比例绘制)
export function isReference() { return !!refImg; }

// ---------- 角度 / 机位 提示 ----------
function avgY(pose, a, b) { return (pose[a].y + pose[b].y) / 2; }

// 返回 hints[]
export function analyzePose(face, pose) {
  const hints = [];

  if (face) {
    // 正脸/侧脸：用鼻尖到左右脸缘的水平距离比判断朝向
    const nose = face[1], left = face[234], right = face[454];
    if (nose && left && right) {
      const dl = Math.abs(nose.x - left.x);
      const dr = Math.abs(nose.x - right.x);
      const r = dl / (dl + dr);
      if (Math.abs(r - 0.5) < 0.06) {
        hints.push({ key: 'angle', level: 'tip', text: '太正了，让她微侧脸 15–30° 更立体' });
      }
    }
    // 仰角导致显下巴：鼻-额段 vs 鼻-下巴段比例
    const fore = face[10], chin = face[152];
    if (nose && fore && chin) {
      const upper = nose.y - fore.y, lower = chin.y - nose.y;
      if (upper > 0 && lower / upper < 1.0) {
        hints.push({ key: 'chin', level: 'tip', text: '像仰拍了，让她微微低头/收下巴' });
      }
    }
  }

  if (pose) {
    const sh = pose[11] && pose[12] ? avgY(pose, 11, 12) : null;
    const hip = pose[23] && pose[24] ? avgY(pose, 23, 24) : null;
    const ankV = (pose[27]?.visibility ?? 1) > 0.5 || (pose[28]?.visibility ?? 1) > 0.5;
    const ank = ankV && pose[27] && pose[28] ? avgY(pose, 27, 28) : null;
    if (sh != null && hip != null && ank != null) {
      const torso = hip - sh, legs = ank - hip;
      if (torso > 0 && legs / torso < 1.0) {
        hints.push({ key: 'cam-height', level: 'tip', text: '腿显短：机位放低到腰胯、略仰拍显腿长' });
      }
    }
  }

  return hints;
}
