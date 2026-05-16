import * as THREE from 'three';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export async function loadVRM(url) {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const gltf = await loader.loadAsync(url);
  const vrm = gltf.userData.vrm;
  return vrm;
}