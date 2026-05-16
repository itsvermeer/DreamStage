export function initUI() {}
export function showHUD(visible) {
  document.getElementById('hud').classList.toggle('hidden', !visible);
}
export function updateScore(score, combo) {
  document.getElementById('score-display').textContent = `Score: ${score}`;
  document.getElementById('combo-display').textContent = `Combo: ${combo}`;
}
export function showJudgmentPopup(judgment, lane) {
  const laneDiv = document.querySelectorAll('.lane')[lane];
  const popup = document.createElement('div');
  popup.className = 'judgment-popup';
  popup.textContent = {
    perfect: '✨ PERFECT!',
    great:   '🌟 GREAT',
    good:    '👍 GOOD',
    bad:     '💢 BAD',
    miss:    '❌ MISS'
  }[judgment] || '';
  popup.style.color = {
    perfect: '#ffd700',
    great:   '#76ff03',
    good:    '#00e5ff',
    bad:     '#ff1744',
    miss:    '#888888'
  }[judgment] || '#fff';
  popup.style.animation = 'pop 0.6s ease-out';
  laneDiv.appendChild(popup);
  setTimeout(() => popup.remove(), 600);
}
export function showResult(grade, stats) {
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('result-screen').classList.remove('hidden');
  document.getElementById('result-grade').textContent = grade;
  document.getElementById('result-title').textContent = 'Great Job!';
  document.getElementById('result-stats').innerHTML = `
    Score: ${stats.score}<br>
    Max Combo: ${stats.maxCombo}<br>
    Perfect: ${stats.perfect} | Great: ${stats.great} | Good: ${stats.good}<br>
    Bad: ${stats.bad} | Miss: ${stats.miss}
  `;
}