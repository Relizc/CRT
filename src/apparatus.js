import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GEOMETRY } from "./physics.js";
import { createCoils } from "./coils.js";
import { createGuideRay } from "./guide-ray.js";
import { createParticleView } from "./particle-view.js";

// All apparatus coordinates are in metres. This component owns the 3D scene.
export function createApparatus(viewport, screenCanvas) {
  const $ = (id) => document.getElementById(id);
  let renderer, scene, camera, controls, glassGroup;
  const labels = [];
  const screenTexture = new THREE.CanvasTexture(screenCanvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  function line(points, color, opacity = 1) {
    return new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(
        points.map((p) => new THREE.Vector3(...p)),
      ),
      new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }),
    );
  }
  function box(width, height, depth, x, y, z, material, group = scene) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      material,
    );
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  }
  function label(text, position, dim = false) {
    const element = document.createElement("div");
    element.className = `view-label${dim ? " dim" : ""}`;
    element.textContent = text;
    viewport.append(element);
    labels.push({ element, position: new THREE.Vector3(...position) });
  }
  function cylinder(radius, length, z, material) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, length, 28),
      material,
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.position.z = z;
    scene.add(mesh);
    return mesh;
  }

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor("#111b1b");
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  viewport.prepend(renderer.domElement);
  renderer.domElement.setAttribute(
    "aria-label",
    "Orbitable three-dimensional CRT apparatus",
  );
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog("#111b1b", 1.3, 2.6);
  camera = new THREE.PerspectiveCamera(38, 1, 0.001, 10);
  camera.position.set(0.66, 0.37, -0.4);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0.26);
  controls.enableDamping = true;
  controls.minDistance = 0.04;
  controls.maxDistance = 1.65;
  controls.maxPolarAngle = Math.PI * 0.95;
  controls.update();
  scene.add(new THREE.HemisphereLight("#d9efd5", "#273c40", 2.4));
  const light = new THREE.DirectionalLight("#e4ffe5", 3);
  light.position.set(0.3, 0.6, -0.3);
  scene.add(light);
  const fill = new THREE.DirectionalLight("#91b3c5", 1.3);
  fill.position.set(-0.4, 0.1, 0.6);
  scene.add(fill);
  const floor = new THREE.GridHelper(0.9, 36, "#304239", "#1c2e28");
  floor.position.set(0, -0.182, 0.24);
  scene.add(floor);
  const metal = new THREE.MeshStandardMaterial({
    color: "#7b8b83",
    metalness: 0.75,
    roughness: 0.36,
  });
  const ceramic = new THREE.MeshStandardMaterial({
    color: "#b8b99f",
    roughness: 0.7,
  });
  cylinder(0.013, 0.03, -0.012, metal);
  cylinder(0.008, 0.016, 0.007, ceramic);
  cylinder(0.004, 0.012, 0.02, metal);
  const opening = new THREE.MeshBasicMaterial({ color: "#c4ff91" });
  cylinder(0.0025, 0.001, 0.0265, opening);
  label("e⁻ SOURCE · 0 cm", [0.006, 0.029, 0.0]);
  const coils = createCoils(scene);
  const z = GEOMETRY.horizontalZ;
  const fieldBox = new THREE.BoxGeometry(0.02, 0.02, 0.02);
  const volume = new THREE.Mesh(
    fieldBox,
    new THREE.MeshBasicMaterial({
      color: "#99b6bd",
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
    }),
  );
  volume.position.z = z;
  scene.add(volume);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(fieldBox),
    new THREE.LineBasicMaterial({
      color: "#8fa7aa",
      transparent: true,
      opacity: 0.4,
    }),
  );
  edges.position.z = z;
  scene.add(edges);
  label("X + Y COILS · 10 cm", [0, 0.045, z]);
  const guide = createGuideRay(scene);
  // The transparent envelope is an illustrative vacuum boundary, not a collision surface.
  glassGroup = new THREE.Group();
  scene.add(glassGroup);
  const sections = [
    [0.025, 0.018],
    [0.15, 0.035],
    [0.47, 0.156],
    [0.5, 0.156],
  ];
  const corners = (r) => [
    [-r, -r],
    [r, -r],
    [r, r],
    [-r, r],
  ];
  const vertices = [];
  for (let s = 0; s < sections.length - 1; s++) {
    const [z0, r0] = sections[s],
      [z1, r1] = sections[s + 1],
      a = corners(r0),
      b = corners(r1);
    for (let k = 0; k < 4; k++) {
      const next = (k + 1) % 4;
      vertices.push(
        ...a[k],
        z0,
        ...a[next],
        z0,
        ...b[next],
        z1,
        ...a[k],
        z0,
        ...b[next],
        z1,
        ...b[k],
        z1,
      );
    }
  }
  const envelopeGeometry = new THREE.BufferGeometry();
  envelopeGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  envelopeGeometry.computeVertexNormals();
  const envelope = new THREE.Mesh(
    envelopeGeometry,
    new THREE.MeshStandardMaterial({
      color: "#8daea0",
      transparent: true,
      opacity: 0.065,
      side: THREE.DoubleSide,
      depthWrite: false,
      metalness: 0.1,
      roughness: 0.12,
    }),
  );
  glassGroup.add(envelope);
  sections.forEach(([z, r]) => {
    const pts = corners(r).map(([x, y]) => [x, y, z]);
    pts.push(pts[0]);
    glassGroup.add(line(pts, "#709284", 0.25));
  });
  for (let i = 0; i < 4; i++)
    glassGroup.add(
      line(
        sections.map(([z, r]) => [...corners(r)[i], z]),
        "#709284",
        0.18,
      ),
    );
  const frame = new THREE.MeshStandardMaterial({
    color: "#3d5045",
    metalness: 0.6,
    roughness: 0.5,
  });
  box(0.324, 0.012, 0.012, 0, -0.156, 0.5, frame);
  box(0.324, 0.012, 0.012, 0, 0.156, 0.5, frame);
  box(0.012, 0.3, 0.012, -0.156, 0, 0.5, frame);
  box(0.012, 0.3, 0.012, 0.156, 0, 0.5, frame);
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 0.3),
    new THREE.MeshBasicMaterial({
      map: screenTexture,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  // Viewed from the source side (+z direction), texture x follows world +x.
  plane.position.z = 0.5;
  scene.add(plane);
  label("PHOSPHOR · 30 × 30 cm", [0, 0.178, 0.5]);
  scene.add(
    line(
      [
        [0, 0, 0],
        [0, 0, 0.5],
      ],
      "#47694e",
      0.25,
    ),
  );
  const dimensionY = -0.204;
  scene.add(
    line(
      [
        [0, dimensionY, 0],
        [0, dimensionY, 0.5],
      ],
      "#617665",
      0.6,
    ),
  );
  [0, 0.5].forEach((z) =>
    scene.add(
      line(
        [
          [-0.007, dimensionY - 0.005, z],
          [0.007, dimensionY + 0.005, z],
        ],
        "#7d9080",
        0.75,
      ),
    ),
  );
  label("SOURCE → SCREEN  50.00 cm", [0, dimensionY - 0.012, 0.25], true);
  scene.add(
    line(
      [
        [0.18, -0.15, 0.5],
        [0.18, 0.15, 0.5],
      ],
      "#617665",
      0.6,
    ),
  );
  label("30 cm", [0.195, 0, 0.5], true);
  const particles = createParticleView(scene);
  new ResizeObserver(() => {
    const { width, height } = viewport.getBoundingClientRect();
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }).observe(viewport);
  renderer.domElement.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    $("loading").textContent =
      "The 3D graphics context was interrupted. Reload the file to restore the apparatus.";
    $("loading").style.display = "grid";
  });
  $("loading").style.display = "none";

  function setView(name) {
    const views = {
      perspective: [0.66, 0.37, -0.4],
      top: [0, 0.86, 0.26],
      front: [0, 0, 1.15],
      magnets: [0.1, 0.075, -0.035],
    };
    camera.position.set(...views[name]);
    camera.up.set(0, 1, 0);
    controls.target.set(0, 0, name === "magnets" ? 0.1 : 0.26);
    controls.update();
  }
  function render() {
    screenTexture.needsUpdate = true;
    controls.update();
    labels.forEach(({ element, position }) => {
      const p = position.clone().project(camera);
      element.style.left = `${((p.x + 1) / 2) * viewport.clientWidth}px`;
      element.style.top = `${((1 - p.y) / 2) * viewport.clientHeight}px`;
      element.style.display =
        p.z < 1 && p.z > -1 && Math.abs(p.x) < 0.98 && Math.abs(p.y) < 0.86
          ? "block"
          : "none";
    });
    renderer.render(scene, camera);
  }
  return {
    coils,
    guide,
    particles,
    render,
    setView,
    setGlass(visible) {
      glassGroup.visible = visible;
    },
  };
}
