import { updateScore, showJudgmentPopup } from './ui-overlay.js';

const LANES = 4;
const PERFECT_WINDOW = 50;
const GREAT_WINDOW = 100;
const GOOD_WINDOW = 180;
const BAD_WINDOW = 300;
const BASE_TRAVEL_TIME = 2000;

let arrows = [];
let score = 0;
let combo = 0;
let maxCombo = 0;
let beatSyncRef = null;
let lastBeatIndex = -1;
let arrowId = 0;
let currentBuff = null;
let shieldCount = 0;
let travelTimeMultiplier = 1.0;
const stats = { perfect:0, great:0, good:0, bad:0, miss:0 };

let onKeyTapCallback = null;   // from main.js

// ── Flash helper ───────────────────────────
function showKeyPressFeedback(lane) {
  const laneDiv = document.querySelectorAll('.lane')[lane];
  if (!laneDiv) return;

  const symbols = ['←', '↑', '↓', '→'];

  // CSS class flash
  laneDiv.classList.remove('key-pressed');
  void laneDiv.offsetWidth;   // force reflow
  laneDiv.classList.add('key-pressed');

  setTimeout(() => {
    laneDiv.classList.remove('key-pressed');
  }, 140);

  // Burst text element
  const burst = document.createElement('div');
  burst.className = 'key-burst';
  burst.textContent = symbols[lane];
  laneDiv.appendChild(burst);

  setTimeout(() => {
    burst.remove();
  }, 300);
}

// ── Initialisation ─────────────────────────
export function initGameLogic(beatSync, buff, keyTapCallback) {
  beatSyncRef = beatSync;
  currentBuff = buff;
  onKeyTapCallback = keyTapCallback;
  arrows = [];
  arrowId = 0;
  score = 0; combo = 0; maxCombo = 0;
  lastBeatIndex = -1;
  Object.keys(stats).forEach(k => stats[k] = 0);
  shieldCount = (buff?.buff === 'shield') ? (buff.value || 5) : 0;
  travelTimeMultiplier = (buff?.buff === 'speed') ? (1 / (buff.value || 1.3)) : 1.0;
  updateScore(score, combo);
  document.getElementById('round-display').textContent = 'Round 1 / 3';
  document.querySelectorAll('.arrow').forEach(el => el.remove());

  // ✅ Touch / click support on lanes
  document.querySelectorAll('.lane').forEach((laneEl, lane) => {
    laneEl.onclick = () => {
      showKeyPressFeedback(lane);
      if (onKeyTapCallback) onKeyTapCallback();
    };
  });
}

// ── Arrow update loop ──────────────────────
export function updateArrows(beatSync) {
  if (!beatSyncRef) return;
  const now = performance.now();
  const currentBeat = beatSync.getCurrentBeat();
  if (currentBeat < 0) return;
  const beatIndex = Math.floor(currentBeat);

  if (beatIndex > lastBeatIndex) {
    lastBeatIndex = beatIndex;
    const lane = Math.floor(Math.random() * LANES);
    const travelTime = BASE_TRAVEL_TIME * travelTimeMultiplier;
    const arrow = {
      id: arrowId++,
      lane,
      spawnTime: now,
      targetTime: now + travelTime,
      hit: false,
      missed: false,
    };
    arrows.push(arrow);
    createArrowElement(arrow);
  }

  for (const arrow of arrows) {
    if (arrow.hit || arrow.missed) continue;
    const elapsed = now - arrow.spawnTime;
    const progress = Math.min(1, elapsed / (arrow.targetTime - arrow.spawnTime));
    const el = document.querySelector(`.arrow[data-id='${arrow.id}']`);
    if (el) el.style.top = `${progress * 80}%`;

    if (now > arrow.targetTime + BAD_WINDOW) {
      handleMiss(arrow);
    }
  }
  arrows = arrows.filter(a => !a.hit && !a.missed);
}

export function spawnTestArrows() {
  const now = performance.now();
  const travelTime = BASE_TRAVEL_TIME * travelTimeMultiplier;
  for (let i = 0; i < 3; i++) {
    const arrow = {
      id: arrowId++,
      lane: i,
      spawnTime: now,
      targetTime: now + travelTime,
      hit: false,
      missed: false
    };
    arrows.push(arrow);
    createArrowElement(arrow);
  }
}

// ── Arrow visuals ──────────────────────────
function createArrowElement(arrow) {
  const laneDiv = document.querySelectorAll('.lane')[arrow.lane];
  if (!laneDiv) return;
  const el = document.createElement('div');
  el.className = 'arrow';
  el.dataset.id = arrow.id;
  el.textContent = ['←','↑','↓','→'][arrow.lane];
  el.style.cssText = `
    position:absolute; left:50%; top:0%; transform:translateX(-50%);
    font-size:2rem; font-weight:bold; color:#fff; text-shadow:0 0 10px cyan;
    pointer-events:none; z-index:5; transition:top 0.05s linear;
  `;
  laneDiv.appendChild(el);
}

function removeArrowElement(arrow) {
  const el = document.querySelector(`.arrow[data-id='${arrow.id}']`);
  if (el) el.remove();
}

function handleMiss(arrow) {
  arrow.missed = true;
  stats.miss++;
  if (shieldCount > 0) shieldCount--;
  else combo = 0;
  updateScore(score, combo);
  showJudgmentPopup('miss', arrow.lane);
  removeArrowElement(arrow);
  if (onKeyTapCallback) onKeyTapCallback();
}

// ── Keyboard input ─────────────────────────
window.addEventListener('keydown', (e) => {
  if (!beatSyncRef) return;

  const laneMap = {
    ArrowLeft: 0,
    ArrowUp: 1,
    ArrowDown: 2,
    ArrowRight: 3
  };

  const lane = laneMap[e.key];
  if (lane === undefined) return;
  e.preventDefault();

  // ✅ Flash the lane on every press
  showKeyPressFeedback(lane);

  // ✅ Tap animation callback (character scale pop)
  if (onKeyTapCallback) onKeyTapCallback();

  const now = performance.now();
  let best = null, bestDiff = Infinity;
  for (const a of arrows) {
    if (a.lane === lane && !a.hit && !a.missed) {
      const diff = Math.abs(now - a.targetTime);
      if (diff < bestDiff) { bestDiff = diff; best = a; }
    }
  }

  if (!best || bestDiff > BAD_WINDOW) {
    combo = 0;
    updateScore(score, combo);
    showJudgmentPopup('bad', lane);
    return;
  }

  best.hit = true;
  let judgment;
  if (bestDiff <= PERFECT_WINDOW) judgment = 'perfect';
  else if (bestDiff <= GREAT_WINDOW) judgment = 'great';
  else if (bestDiff <= GOOD_WINDOW) judgment = 'good';
  else judgment = 'bad';

  if (judgment === 'bad') { combo = 0; stats.bad++; }
  else { combo++; if (combo > maxCombo) maxCombo = combo; stats[judgment]++; }

  let basePoints = { perfect:300, great:200, good:100, bad:30 }[judgment];
  if (currentBuff) {
    if (currentBuff.buff === 'perfect' && judgment === 'perfect') basePoints += currentBuff.value;
    if (currentBuff.buff === 'great' && judgment === 'great') basePoints += currentBuff.value;
    if (currentBuff.buff === 'combo') basePoints = Math.round(basePoints * (1 + Math.floor(combo/10)*0.1) * currentBuff.value);
    else if (currentBuff.buff === 'mult') basePoints = Math.round(basePoints * currentBuff.value);
    if (currentBuff.buff === 'luck' && Math.random() < currentBuff.value) basePoints *= 2;
  }
  if (!currentBuff || currentBuff.buff !== 'combo') basePoints = Math.round(basePoints * (1 + Math.floor(combo/10)*0.1));

  score += basePoints;
  updateScore(score, combo);
  showJudgmentPopup(judgment, lane);
  removeArrowElement(best);
});

export function getStats() {
  return { ...stats, score, maxCombo };
}