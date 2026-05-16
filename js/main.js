import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadVRM } from './vrm-loader.js';
import { BeatSync } from './beat-sync.js';
import { initGameLogic, updateArrows, spawnTestArrows, getStats } from './game-logic.js';
import { initUI, showHUD, updateScore, showResult } from './ui-overlay.js';
import { loadMixamoAnimation } from './animation-loader.js';

// ──────────────── 3D Stage Setup (full‑screen, transparent) ────────────────
const stageContainer = document.getElementById('stage-container');
const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 50);
camera.position.set(0, 1.5, 4);
camera.lookAt(0, 0.5, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
stageContainer.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0x404066, 3));
const dirLight = new THREE.DirectionalLight(0xffffff, 2);
dirLight.position.set(1, 3, 2);
dirLight.castShadow = true;
scene.add(dirLight);

// Semi‑transparent floor
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(6, 6),
  new THREE.MeshStandardMaterial({ color: 0x222244, roughness: 0.7, transparent: true, opacity: 0.35 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

let currentVRM = null;
let character = null;
let mixer = null;
let currentDanceAction = null;
let useBeatSyncForDance = false;
let selectedCharId = null;

// ──────────────── Menu 3D Background (GLB) ────────────────
let menuBackground = null;
let menuMixer = null;

async function loadMenuBackground() {
  const loader = new GLTFLoader();
  try {
    const gltf = await loader.loadAsync('assets/background/main.glb');
    menuBackground = gltf.scene;
    menuBackground.position.set(0, 0, -2);
    menuBackground.scale.set(1, 1, 1);
    menuBackground.visible = true;

    menuBackground.traverse((child) => {
      if (child.isMesh) child.frustumCulled = false;
    });

    scene.add(menuBackground);

    if (gltf.animations && gltf.animations.length > 0) {
      menuMixer = new THREE.AnimationMixer(menuBackground);
      const action = menuMixer.clipAction(gltf.animations[0]);
      action.play();
      console.log('Menu animation playing');
    }
    console.log('Menu 3D background loaded');
  } catch (err) {
    console.warn('Could not load menu background GLB:', err);
  }
}

function setMenuBackgroundVisible(visible) {
  if (menuBackground) menuBackground.visible = visible;
  if (character) character.visible = !visible;
  floor.visible = !visible;
}

// ──────────────── Tap Animation ────────────────
let tapAnimationActive = false;
function triggerTapAnimation() {
  if (!character || tapAnimationActive) return;
  tapAnimationActive = true;
  const duration = 100;
  const startTime = performance.now();
  function scaleStep() {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const scale = 1 + (1.05 - 1) * (1 - Math.pow(1 - progress, 2));
    character.scale.setScalar(scale);
    if (progress < 1) requestAnimationFrame(scaleStep);
    else {
      character.scale.setScalar(1);
      tapAnimationActive = false;
    }
  }
  requestAnimationFrame(scaleStep);
}
const onKeyTap = () => triggerTapAnimation();

// ──────────────── Full‑screen Background (gameplay) ────────────────
function setRandomBackground() {
  const randomIndex = Math.floor(Math.random() * 8) + 1;
  const url = `assets/background/${randomIndex}.jpg`;
  document.getElementById('game-background').style.backgroundImage = `url('${url}')`;
}

// ──────────────── Beat Sync & Playlist ────────────────
const beatSync = new BeatSync();
const playlist = [
  { url: 'assets/audio/sugar-rush-rush.mp3', bpm: 125, offset: 0, name: 'Sugar Rush Rush' },
  { url: 'assets/audio/shine-on-me.mp3',       bpm: 91,  offset: 0, name: 'Shine on Me' },
  { url: 'assets/audio/shine-like-summer.mp3', bpm: 130, offset: 0, name: 'Shine Like Summer' },
  { url: 'assets/audio/rule-breaker.mp3',      bpm: 130, offset: 0, name: 'Rule Breaker' },
  { url: 'assets/audio/one-more-time.mp3',     bpm: 130, offset: 0, name: 'One More Time' },
  { url: 'assets/audio/no-mercy.mp3',          bpm: 150, offset: 0, name: 'No Mercy' },
  { url: 'assets/audio/crown-on-me.mp3',       bpm: 67,  offset: 0, name: 'Crown On Me' },
  { url: 'assets/audio/blaze.mp3',             bpm: 132, offset: 0, name: 'BLAZE' },
  { url: 'assets/audio/we-rule-the-night.mp3', bpm: 140, offset: 0, name: 'We Rule the Night' },
  { url: 'assets/audio/move-your-body.mp3',    bpm: 128, offset: 0, name: 'Move Your Body' },
  { url: 'assets/audio/we-are.mp3',            bpm: 82,  offset: 0, name: 'We Are' }
];
beatSync.loadPlaylist(playlist).then(() => console.log('Playlist ready'));

// ──────────────── Character Data ────────────────
const characterBuffs = {
  ruru:  { name: 'Ruru',  buff: 'perfect', value: 50,  model: 'assets/models/ruru.vrm' },
  canny: { name: 'Canny', buff: 'great',   value: 30,  model: 'assets/models/canny.vrm' },
  riri:  { name: 'Riri',  buff: 'combo',   value: 1.2, model: 'assets/models/riri.vrm' },
  asa:   { name: 'Asa',   buff: 'mult',    value: 1.2, model: 'assets/models/asa.vrm' },
  leo:   { name: 'Leo',   buff: 'shield',  value: 5,   model: 'assets/models/leo.vrm' },
  marco: { name: 'Marco', buff: 'speed',   value: 1.3, model: 'assets/models/marco.vrm' },
  jin:   { name: 'Jin',   buff: 'luck',    value: 0.2, model: 'assets/models/jin.vrm' }
};
let selectedBuff = null;

const jinDanceFiles = [
  'assets/animations/1.fbx',
  'assets/animations/2.fbx',
  'assets/animations/3.fbx',
  'assets/animations/4.fbx',
  'assets/animations/5.fbx',
];
let jinDanceIndex = Number(localStorage.getItem('jinDanceIndex') || 0);

function getDanceFileForCharacter(charId) {
  if (charId === 'ruru')  return 'assets/animations/dance1.fbx';
  if (charId === 'canny') return 'assets/animations/twerk.fbx';
  if (charId === 'riri')  return 'assets/animations/Dance2.fbx';
  if (charId === 'asa')   return 'assets/animations/Dance3.fbx';
  if (charId === 'leo')   return 'assets/animations/Dance4.fbx';
  if (charId === 'marco') return 'assets/animations/Flair.fbx';
  if (charId === 'jin') {
    const file = jinDanceFiles[jinDanceIndex];
    jinDanceIndex = (jinDanceIndex + 1) % jinDanceFiles.length;
    localStorage.setItem('jinDanceIndex', String(jinDanceIndex));
    return file;
  }
  return null;
}

async function playDanceForCharacter(charId) {
  if (!currentVRM || !mixer) return;
  const fbxFile = getDanceFileForCharacter(charId);
  if (!fbxFile) { playIdle(); useBeatSyncForDance = true; return; }

  if (currentDanceAction) {
    currentDanceAction.stop();
    mixer.uncacheAction(currentDanceAction.getClip(), character);
    currentDanceAction = null;
  }

  const danceClip = await loadMixamoAnimation(`${fbxFile}?v=${Date.now()}`, currentVRM);
  currentDanceAction = mixer.clipAction(danceClip);
  currentDanceAction.setLoop(THREE.LoopRepeat);
  currentDanceAction.reset();
  currentDanceAction.fadeIn(0.3);
  currentDanceAction.play();
  useBeatSyncForDance = false;
}

function playIdle() {
  if (!mixer) return;
  const times = [0, 0.5, 1], values = [0, 0.15, 0];
  const clip = new THREE.AnimationClip('idle', 2, [new THREE.KeyframeTrack('.position[y]', times, values)]);
  currentDanceAction = mixer.clipAction(clip);
  currentDanceAction.setLoop(THREE.LoopRepeat);
  currentDanceAction.play();
}

function createDummy() {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.BoxGeometry(0.5,1,0.3), new THREE.MeshStandardMaterial({ color:0xff4477 })).translateY(0.5));
  group.add(new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,0.3), new THREE.MeshStandardMaterial({ color:0xffcc99 })).translateY(1.15));
  return group;
}

async function loadCharacter(charId) {
  const charData = characterBuffs[charId];
  if (!charData) return;

  if (character) { scene.remove(character); mixer?.stopAllAction(); mixer?.uncacheRoot(character); }
  currentVRM = null; currentDanceAction = null;

  try {
    currentVRM = await loadVRM(charData.model);
    character = currentVRM.scene;
    character.traverse(obj => obj.frustumCulled = false);
    character.rotation.set(0, 0, 0);

    character.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(character);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    character.position.x -= center.x;
    character.position.z -= center.z;
    character.position.y -= box.min.y;

    const targetHeight = 1.7;
    character.scale.setScalar(targetHeight / size.y);
    character.updateMatrixWorld(true);
    scene.add(character);

    mixer = new THREE.AnimationMixer(character);
    await playDanceForCharacter(charId);
  } catch (e) {
    console.warn('VRM failed, dummy:', e);
    character = createDummy();
    scene.add(character);
    mixer = new THREE.AnimationMixer(character);
    playIdle();
    useBeatSyncForDance = true;
  }
}

// Initial dummy
character = createDummy();
scene.add(character);
mixer = new THREE.AnimationMixer(character);
playIdle();
useBeatSyncForDance = true;

// ──────────────── SFX System ────────────────
let sfxEnabled = true;   // controlled by checkbox
const sfxAudioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playClickSound() {
  if (!sfxEnabled) return;
  const now = sfxAudioCtx.currentTime;
  const osc = sfxAudioCtx.createOscillator();
  const gain = sfxAudioCtx.createGain();
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(gain);
  gain.connect(sfxAudioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.08);
}

// Attach click sound to all buttons and interactive elements
function addClickSoundToElement(el) {
  if (!el) return;
  el.addEventListener('click', (e) => {
    // Prevent double-play on nested elements
    e.stopPropagation();
    playClickSound();
  });
}

// Apply to all buttons and character buttons
document.querySelectorAll('button').forEach(btn => addClickSoundToElement(btn));
document.querySelectorAll('.char-btn').forEach(btn => addClickSoundToElement(btn));
// Also apply to lane clicks (already handled by game-logic touch)

// ──────────────── Game State & UI ────────────────
let gameState = 'idle';
initUI();

loadMenuBackground();
setMenuBackgroundVisible(true);

document.getElementById('btn-start').addEventListener('click', () => {
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('char-select-screen').classList.remove('hidden');
  gameState = 'charSelect';
  setMenuBackgroundVisible(true);
});

document.querySelectorAll('.char-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const charId = btn.dataset.char;
    selectedCharId = charId;
    selectedBuff = characterBuffs[charId];
    if (!selectedBuff) return;

    await loadCharacter(charId);
    document.getElementById('char-select-screen').classList.add('hidden');
    showHUD(true);

    setMenuBackgroundVisible(false);
    setRandomBackground();

    await beatSync.resume();
    beatSync.playRandom();
    updateSongDisplay();

    initGameLogic(beatSync, selectedBuff, onKeyTap);
    spawnTestArrows();
    gameState = 'playing';
  });
});

document.getElementById('btn-restart').addEventListener('click', async (e) => {
  e.preventDefault();
  document.getElementById('result-screen').classList.add('hidden');
  showHUD(true);

  setRandomBackground();
  if (selectedCharId) {
    selectedBuff = characterBuffs[selectedCharId];
    await playDanceForCharacter(selectedCharId);
  }
  await beatSync.resume();
  beatSync.playRandom();
  updateSongDisplay();

  initGameLogic(beatSync, selectedBuff, onKeyTap);
  spawnTestArrows();
  gameState = 'playing';
  setMenuBackgroundVisible(false);
});

// ──────────────── Multiplayer popup ────────────────
document.getElementById('btn-multiplayer').addEventListener('click', () => {
  document.getElementById('multiplayer-popup').classList.remove('hidden');
});
document.getElementById('btn-close-multiplayer').addEventListener('click', () => {
  document.getElementById('multiplayer-popup').classList.add('hidden');
});

// ──────────────── Settings & SFX toggle ────────────────
const sfxToggle = document.getElementById('sfx-toggle');
sfxToggle.addEventListener('change', (e) => {
  sfxEnabled = e.target.checked;
  // immediately play a test click if toggled on
  if (sfxEnabled) playClickSound();
});

document.getElementById('btn-settings').addEventListener('click', () => {
  document.getElementById('settings-popup').classList.remove('hidden');
});
document.getElementById('btn-close-settings').addEventListener('click', () => {
  document.getElementById('settings-popup').classList.add('hidden');
});
document.getElementById('volume-slider').addEventListener('input', e => {
  if (beatSync.musicGain) beatSync.musicGain.gain.value = e.target.value / 100;
});

document.getElementById('btn-about').addEventListener('click', () => {
  document.getElementById('about-popup').classList.remove('hidden');
});
document.getElementById('btn-close-about').addEventListener('click', () => {
  document.getElementById('about-popup').classList.add('hidden');
});

beatSync.onEndCallback = () => {
  if (gameState === 'playing') {
    gameState = 'finished';
    showHUD(false);
    setMenuBackgroundVisible(true);
    const s = getStats();
    showResult(calculateGrade(s), s);
  }
};

function calculateGrade(stats) {
  const total = stats.perfect + stats.great + stats.good + stats.bad + stats.miss;
  if (total === 0) return 'C';
  const ratio = stats.perfect / total;
  if (ratio >= 0.9) return 'S';
  if (ratio >= 0.7) return 'A';
  if (ratio >= 0.5) return 'B';
  return 'C';
}

function updateSongDisplay() {
  document.getElementById('song-display').textContent = `🎵 ${beatSync.getCurrentTrackName()}`;
}

// ──────────────── Game Loop ────────────────
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (menuMixer) menuMixer.update(delta);

  if (mixer) {
    if (gameState === 'playing' && useBeatSyncForDance) {
      const beat = beatSync.getCurrentBeat();
      if (beat >= 0) mixer.setTime(beat * (60 / beatSync.bpm));
    } else {
      mixer.update(delta);
    }
  }
  if (currentVRM) currentVRM.update(delta);

  if (gameState === 'playing') updateArrows(beatSync);

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});