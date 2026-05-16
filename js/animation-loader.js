// js/animation-loader.js
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160/examples/jsm/loaders/FBXLoader.js';
import * as THREE from 'three';

const mixamoVRMRigMap = {
  mixamorigHips: 'hips',
  mixamorigSpine: 'spine',
  mixamorigSpine1: 'chest',
  mixamorigSpine2: 'upperChest',
  mixamorigNeck: 'neck',
  mixamorigHead: 'head',

  mixamorigLeftShoulder: 'leftShoulder',
  mixamorigLeftArm: 'leftUpperArm',
  mixamorigLeftForeArm: 'leftLowerArm',
  mixamorigLeftHand: 'leftHand',

  mixamorigRightShoulder: 'rightShoulder',
  mixamorigRightArm: 'rightUpperArm',
  mixamorigRightForeArm: 'rightLowerArm',
  mixamorigRightHand: 'rightHand',

  mixamorigLeftUpLeg: 'leftUpperLeg',
  mixamorigLeftLeg: 'leftLowerLeg',
  mixamorigLeftFoot: 'leftFoot',
  mixamorigLeftToeBase: 'leftToes',

  mixamorigRightUpLeg: 'rightUpperLeg',
  mixamorigRightLeg: 'rightLowerLeg',
  mixamorigRightFoot: 'rightFoot',
  mixamorigRightToeBase: 'rightToes',
};

export async function loadMixamoAnimation(url, vrm) {
  const loader = new FBXLoader();
  const asset = await loader.loadAsync(url);

  const clip = asset.animations[0];
  if (!clip) throw new Error('No animation clip found.');

  // Ensure world matrices are up to date
  asset.updateMatrixWorld(true);
  vrm.scene.updateMatrixWorld(true);

  const tracks = [];

  // Calculate dynamic hips scale from world positions
  const mixamoHips = asset.getObjectByName('mixamorigHips');
  const vrmHips = vrm.humanoid.getNormalizedBoneNode('hips');

  let hipsScale = 0.01;
  if (mixamoHips && vrmHips) {
    const mixamoHipsY = Math.abs(mixamoHips.getWorldPosition(new THREE.Vector3()).y);
    const vrmHipsY = Math.abs(vrmHips.getWorldPosition(new THREE.Vector3()).y);
    if (mixamoHipsY > 0) hipsScale = vrmHipsY / mixamoHipsY;
  }

  for (const track of clip.tracks) {
    const [rawName, propertyName] = track.name.split('.');

    const mixamoRigName = rawName
      .replace('Armature|', '')
      .replace(/:/g, '');

    const vrmBoneName = mixamoVRMRigMap[mixamoRigName];
    if (!vrmBoneName) continue;

    const mixamoNode = asset.getObjectByName(mixamoRigName);
    const vrmNode = vrm.humanoid.getNormalizedBoneNode(vrmBoneName);

    if (!mixamoNode || !vrmNode) continue;

    if (track instanceof THREE.QuaternionKeyframeTrack) {
      const values = track.values.slice();

      // Rest rotation correction using world-space inverse of the Mixamo bone
      const restRotationInverse = mixamoNode.getWorldQuaternion(new THREE.Quaternion()).invert();

      const parentRestRotation = mixamoNode.parent
        ? mixamoNode.parent.getWorldQuaternion(new THREE.Quaternion())
        : new THREE.Quaternion();

      const quat = new THREE.Quaternion();

      for (let i = 0; i < values.length; i += 4) {
        quat.fromArray(values, i);

        quat
          .premultiply(parentRestRotation)
          .multiply(restRotationInverse);

        quat.toArray(values, i);
      }

      tracks.push(
        new THREE.QuaternionKeyframeTrack(
          `${vrmNode.name}.quaternion`,
          track.times,
          values
        )
      );
    }

    if (
      track instanceof THREE.VectorKeyframeTrack &&
      propertyName === 'position' &&
      vrmBoneName === 'hips'
    ) {
      const values = track.values.slice();

      for (let i = 0; i < values.length; i += 3) {
        values[i + 0] *= hipsScale;
        values[i + 1] *= hipsScale;
        values[i + 2] *= hipsScale;
      }

      tracks.push(
        new THREE.VectorKeyframeTrack(
          `${vrmNode.name}.position`,
          track.times,
          values
        )
      );
    }
  }

  console.log('Retargeted Tracks:', tracks.length);

  return new THREE.AnimationClip('vrmAnimation', clip.duration, tracks);
}