import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

export async function loadDanceClip(url) {
  const loader = new FBXLoader();
  const fbx = await loader.loadAsync(url);
  return fbx.animations[0]; // return the first animation clip
}

export function playAnimation(mixer, clip, loop = true) {
  const action = mixer.clipAction(clip);
  action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce);
  action.play();
  return action;
}