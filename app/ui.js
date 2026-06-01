// ui.js —— DOM 层：提示气泡、姿势模板条（分类切换）、角落参考卡、快门绿灯
import { TEMPLATES, CATS, getPoseId, getCue, getReferenceImage, isReference, setPose, setReferencePhoto } from './pose.js';

// 角落姿势参考卡：选了剪影→显示人形+名称+口令；选了真人参考图→显示照片
export function updatePoseCard() {
  const card = document.getElementById('pose-card');
  if (!card) return;
  if (isReference()) {
    const img = getReferenceImage();
    card.innerHTML =
      '<div class="pc-head"><span class="pc-name">参考图</span><span class="pc-close" data-close="1">✕</span></div>' +
      `<div class="pc-fig"><img src="${img.src}" alt="参考图"/></div>` +
      '<div class="pc-cue">照着这张姿势摆</div>';
    card.classList.remove('hidden');
  } else {
    const id = getPoseId();
    const t = id && TEMPLATES.find((x) => x.id === id);
    if (!t) { card.classList.add('hidden'); card.innerHTML = ''; return; }
    card.innerHTML =
      `<div class="pc-head"><span class="pc-name">${t.name}</span><span class="pc-close" data-close="1">✕</span></div>` +
      `<div class="pc-fig">${t.svg}</div>` +
      `<div class="pc-cue">${getCue(id)}</div>`;
    card.classList.remove('hidden');
  }
  card.querySelector('[data-close]').addEventListener('click', () => {
    setReferencePhoto(null);
    if (getPoseId()) setPose(getPoseId());   // 再选一次同 id = 取消选中
    updatePoseCard();
  });
}

const hintsEl = document.getElementById('hints');
const shutter = document.getElementById('shutter');

let lastSig = '';
export function renderHints(hints) {
  const sig = hints.map((h) => h.level + h.text).join('|');
  if (sig === lastSig) return;              // 内容没变就不重绘，避免抖动
  lastSig = sig;
  hintsEl.innerHTML = '';
  for (const h of hints) {
    const chip = document.createElement('div');
    chip.className = 'hint-chip ' + h.level;
    chip.textContent = h.text;
    hintsEl.appendChild(chip);
  }
}

export function setShutterReady(ready) {
  shutter.classList.toggle('ready', !!ready);
}

let curCat = CATS[0].key;
let _onSelect = () => {}, _onPickRef = () => {};

export function buildPoseTray(container, onSelect, onPickRef) {
  _onSelect = onSelect || (() => {});
  _onPickRef = onPickRef || (() => {});
  container.innerHTML = '';
  const cats = document.createElement('div'); cats.className = 'pose-cats';
  const thumbs = document.createElement('div'); thumbs.className = 'pose-thumbs';
  container.appendChild(cats); container.appendChild(thumbs);
  container._thumbs = thumbs;

  CATS.forEach((c) => {
    const b = document.createElement('div');
    b.className = 'pose-cat'; b.dataset.key = c.key; b.textContent = c.name;
    b.addEventListener('click', () => { curCat = c.key; markCats(cats); renderThumbs(thumbs); });
    cats.appendChild(b);
  });
  markCats(cats);
  renderThumbs(thumbs);
}

function markCats(cats) {
  cats.querySelectorAll('.pose-cat').forEach((e) => e.classList.toggle('active', e.dataset.key === curCat));
}

function renderThumbs(thumbs) {
  thumbs.innerHTML = '';
  // 第一个固定入口:从相册选真人参考图(幽灵叠加)
  const ref = document.createElement('div');
  ref.className = 'pose-thumb ref-tile';
  ref.innerHTML = '<div class="ref-ico">📷</div><span>参考图</span>';
  ref.addEventListener('click', () => _onPickRef());
  thumbs.appendChild(ref);

  TEMPLATES.filter((t) => t.cat === curCat).forEach((t) => {
    const el = document.createElement('div');
    el.className = 'pose-thumb'; el.dataset.id = t.id;
    el.innerHTML = t.svg + `<span>${t.name}</span>`;
    el.addEventListener('click', () => { _onSelect(t.id); markThumbs(thumbs); });
    thumbs.appendChild(el);
  });
  markThumbs(thumbs);
}

function markThumbs(thumbs) {
  const cur = getPoseId();
  thumbs.querySelectorAll('.pose-thumb').forEach((el) => {
    el.classList.toggle('active', el.dataset.id === cur);
  });
}

export function refreshTray(container) {
  if (container._thumbs) markThumbs(container._thumbs);
}
