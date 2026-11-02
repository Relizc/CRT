import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { traceElectron } from "./physics.js";

export function createGuideRay(scene) {
  const ray = new Line2(
    new LineGeometry(),
    new LineMaterial({
      color: "#70e0e9",
      linewidth: 2,
      dashed: true,
      dashSize: 0.006,
      gapSize: 0.003,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  ray.frustumCulled = false;
  ray.visible = false;
  scene.add(ray);
  function update(ix, iy, settings, visible) {
    ray.visible = visible;
    if (!visible) return;
    const prediction = traceElectron(ix, iy, settings);
    ray.geometry.dispose();
    ray.geometry = new LineGeometry().setPositions(prediction.path.flat());
    ray.computeLineDistances();
  }
  return {
    update,
    hide() {
      ray.visible = false;
    },
  };
}
