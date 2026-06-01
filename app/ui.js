// ui.js —— DOM 层：提示气泡、姿势模板条（分类切换）、快门绿灯
import { TEMPLATES, CATS, getPoseId } from './pose.js';

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

export function buildPoseTray(container, onSelect) {
  container.innerHTML = '';
  const cats = document.createElement('div'); cats.className = 'pose-cats';
  const thumbs = document.createElement('div'); thumbs.className = 'pose-thumbs';
  container.appendChild(cats); container.appendChild(thumbs);
  container._thumbs = thumbs;

  CATS.forEach((c) => {
    const b = document.createElement('div');
    b.className = 'pose-cat'; b.dataset.key = c.key; b.textContent = c.name;
    b.addEventListener('click', () => { curCat = c.key; markCats(cats); renderThumbs(thumbs, onSelect); });
    cats.appendChild(b);
  });
  markCats(cats);
  renderThumbs(thumbs, onSelect);
}

function markCats(cats) {
  cats.querySelectorAll('.pose-cat').forEach((e) => e.classList.toggle('active', e.dataset.key === curCat));
}

function renderThumbs(thumbs, onSelect) {
  thumbs.innerHTML = '';
  TEMPLATES.filter((t) => t.cat === curCat).forEach((t) => {
    const el = document.createElement('div');
    el.className = 'pose-thumb'; el.dataset.id = t.id;
    el.innerHTML = t.svg + `<span>${t.name}</span>`;
    el.addEventListener('click', () => { onSelect(t.id); markThumbs(thumbs); });
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
