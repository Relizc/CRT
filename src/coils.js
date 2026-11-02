import * as THREE from "three";
import { GEOMETRY } from "./physics.js";

// Equal-size orthogonal windings, signed current markers and field arrows.
export function createCoils(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const magnetArrows = [],
    currentCoils = [];
  const coilColors = ["#d78b50", "#6baff0"];
  const z = GEOMETRY.horizontalZ;
  coilColors.forEach((color, axis) => {
    const radius = GEOMETRY.coilRadii[axis];
    // Twelve visible turns represent the winding bundle; the N input sets
    // the effective turn count in the magnetic-field calculation.
    class Winding extends THREE.Curve {
      getPoint(t, target = new THREE.Vector3()) {
        const angle = t * 12 * Math.PI * 2,
          axial = (t - 0.5) * GEOMETRY.gap;
        const a = radius * Math.cos(angle),
          b = -radius * Math.sin(angle);
        return axis ? target.set(axial, a, z + b) : target.set(a, axial, z + b);
      }
    }
    const curve = new Winding();
    const material = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.65,
      roughness: 0.3,
    });
    group.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(curve, 768, 0.00045, 6, false),
        material,
      ),
    );
    const markers = [];
    const markerGeometry = new THREE.SphereGeometry(0.00085, 8, 6);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: axis ? "#d4edff" : "#fff0be",
    });
    for (let i = 0; i < 36; i++) {
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      group.add(marker);
      markers.push(marker);
    }
    currentCoils.push({ curve, markers, phase: 0 });
    const direction = axis
      ? new THREE.Vector3(-1, 0, 0)
      : new THREE.Vector3(0, 1, 0);
    const arrow = new THREE.ArrowHelper(
      direction,
      new THREE.Vector3(0, 0, z),
      0.032,
      color,
      0.005,
      0.0025,
    );
    group.add(arrow);
    magnetArrows.push(arrow);
  });
  function setCurrents(ix, iy) {
    magnetArrows.forEach((arrow, i) => {
      const current = i ? iy : ix;
      arrow.visible = Math.abs(current) > 1e-8;
      arrow.setDirection(
        i
          ? new THREE.Vector3(-Math.sign(current || 1), 0, 0)
          : new THREE.Vector3(0, Math.sign(current || 1), 0),
      );
    });
  }
  function animate(delta, currentIx, currentIy, running, valid) {
    currentCoils.forEach((coil, axis) => {
      const current = axis ? currentIy : currentIx;
      // Conventional current follows the winding's right-hand rule; speed is illustrative.
      if (running && valid)
        coil.phase =
          (coil.phase +
            delta *
              Math.sign(current) *
              Math.min(Math.abs(current) * 0.8, 0.5) +
            1) %
          1;
      coil.markers.forEach((marker, i) => {
        marker.visible = valid && Math.abs(current) > 1e-8;
        coil.curve.getPoint(
          (coil.phase + i / coil.markers.length) % 1,
          marker.position,
        );
      });
    });
  }
  return { setCurrents, animate, setVisible(visible) { group.visible = visible; } };
}
