import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";

// Live heads and short stream trails are batched; manual paths use separate lines.
export function createParticleView(scene) {
  let particleHeads, particleTrails;
  const headGeometry = new THREE.BufferGeometry();
  headGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(3), 3).setUsage(
      THREE.DynamicDrawUsage,
    ),
  );
  headGeometry.setDrawRange(0, 0);
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 32;
  const spriteContext = sprite.getContext("2d"),
    glow = spriteContext.createRadialGradient(16, 16, 0, 16, 16, 16);
  glow.addColorStop(0, "#fff");
  glow.addColorStop(0.28, "#fff");
  glow.addColorStop(1, "#fff0");
  spriteContext.fillStyle = glow;
  spriteContext.fillRect(0, 0, 32, 32);
  particleHeads = new THREE.Points(
    headGeometry,
    new THREE.PointsMaterial({
      color: "#d6ffa0",
      size: 6,
      sizeAttenuation: false,
      map: new THREE.CanvasTexture(sprite),
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  );
  particleHeads.frustumCulled = false;
  scene.add(particleHeads);
  const trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(6), 3).setUsage(
      THREE.DynamicDrawUsage,
    ),
  );
  trailGeometry.setDrawRange(0, 0);
  particleTrails = new THREE.LineSegments(
    trailGeometry,
    new THREE.LineBasicMaterial({
      color: "#a6d979",
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    }),
  );
  particleTrails.frustumCulled = false;
  scene.add(particleTrails);
  // Separate polylines keep manual shots distinct, with a visible pixel width.
  const shotTrails = new Map();
  function update(particles, completedShots = []) {
    if (!particleHeads) return;
    const paths = [...particles, ...completedShots];
    const recordedIds = new Set();
    for (const electron of paths) {
      if (!electron.recordTrail) continue;
      recordedIds.add(electron.id);
      let trail = shotTrails.get(electron.id);
      if (!trail) {
        trail = new Line2(new LineGeometry(), new LineMaterial({
          color: "#bce987", linewidth: 2, transparent: true,
          opacity: 0.9, depthWrite: false, toneMapped: false,
        }));
        trail.frustumCulled = false;
        shotTrails.set(electron.id, trail);
        scene.add(trail);
      }
      trail.visible = electron.trail.length > 1;
      if (!trail.visible) trail.userData.pointCount = 0;
      if (trail.visible && trail.userData.pointCount !== electron.trail.length) {
        trail.geometry.dispose();
        trail.geometry = new LineGeometry().setPositions(electron.trail.flat());
        trail.userData.pointCount = electron.trail.length;
      }
    }
    for (const [id, trail] of shotTrails) {
      if (recordedIds.has(id)) continue;
      scene.remove(trail);
      trail.geometry.dispose(); trail.material.dispose();
      shotTrails.delete(id);
    }
    let vertices = 0;
    for (const electron of particles)
      if (!electron.recordTrail)
        vertices += Math.max(0, electron.trail.length - 1) * 2;
    function buffer(object, count) {
      let attribute = object.geometry.getAttribute("position");
      if (attribute.count < count) {
        attribute = new THREE.BufferAttribute(
          new Float32Array(Math.max(count, attribute.count * 2) * 3),
          3,
        ).setUsage(THREE.DynamicDrawUsage);
        object.geometry.setAttribute("position", attribute);
      }
      object.geometry.setDrawRange(0, count);
      return attribute;
    }
    const heads = buffer(particleHeads, particles.length),
      trails = buffer(particleTrails, vertices);
    let headIndex = 0, trailIndex = 0;
    for (const electron of particles) {
      heads.array.set(electron.r, headIndex);
      headIndex += 3;
      if (electron.recordTrail) continue;
      for (let i = 1; i < electron.trail.length; i++) {
        trails.array.set(electron.trail[i - 1], trailIndex);
        trailIndex += 3;
        trails.array.set(electron.trail[i], trailIndex);
        trailIndex += 3;
      }
    }
    heads.needsUpdate = true;
    trails.needsUpdate = true;
  }
  return { update };
}
