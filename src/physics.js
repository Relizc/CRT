// SI units throughout. Orthogonal coils share one 2 cm cubic field region.
// Uniform-field approximation using each finite solenoid’s on-axis center field.
export const GEOMETRY = Object.freeze({
  screenZ: 0.5,
  screenSize: 0.3,
  poleSize: 0.02,
  magnetLength: 0.02,
  gap: 0.02,
  coilRadii: Object.freeze([0.018, 0.018]),
  horizontalZ: 0.1,
  verticalZ: 0.1,
});

const E = 1.602176634e-19;
const M = 9.1093837139e-31;
const C = 299792458;
const MU0 = 1.25663706127e-6;
const EPS = 1e-10;
const TAU = 2 * Math.PI;

export function beamProperties(voltage = 2000) {
  const kineticEnergy = E * voltage;
  const gamma = 1 + kineticEnergy / (M * C * C);
  const momentum =
    Math.sqrt(kineticEnergy * (kineticEnergy + 2 * M * C * C)) / C;
  const speed = momentum / (gamma * M);
  return {
    voltage,
    kineticEnergy,
    gamma,
    momentum,
    speed,
    rigidity: momentum / E,
  };
}

export function coilFields(ix, iy, { turns = 100, gap = GEOMETRY.gap } = {}) {
  const gain = (radius) => (MU0 * turns) / Math.hypot(gap, 2 * radius);
  return {
    bx: -gain(GEOMETRY.coilRadii[1]) * iy,
    by: gain(GEOMETRY.coilRadii[0]) * ix,
  };
}

function magnetBoxes() {
  const p = GEOMETRY.poleSize / 2,
    z = GEOMETRY.horizontalZ;
  return [{ kind: "field", min: [-p, -p, z - p], max: [p, p, z + p] }];
}

function inside(r, box, tolerance = 0) {
  return r.every(
    (value, i) =>
      value >= box.min[i] - tolerance && value <= box.max[i] + tolerance,
  );
}

function motion(r, u, direction, k) {
  if (Math.abs(k) < 1e-9) {
    return {
      at: (s) => ({ r: r.map((x, i) => x + u[i] * s), u }),
      roots: (i, value) => {
        const s = (value - r[i]) / u[i];
        return Number.isFinite(s) && s > EPS ? [s] : [];
      },
    };
  }
  const projection = u.reduce((sum, value, i) => sum + value * direction[i], 0);
  const parallel = direction.map((value) => value * projection);
  const perpendicular = u.map((value, i) => value - parallel[i]);
  const cross = [
    u[1] * direction[2] - u[2] * direction[1],
    u[2] * direction[0] - u[0] * direction[2],
    u[0] * direction[1] - u[1] * direction[0],
  ];
  const omega = Math.abs(k);
  const sign = Math.sign(k);
  const at = (s) => {
    const angle = k * s;
    const sn = Math.sin(angle);
    const cs = Math.cos(angle);
    const oneMinusCos = 2 * Math.sin(angle / 2) ** 2;
    return {
      r: r.map(
        (value, i) =>
          value +
          parallel[i] * s +
          (perpendicular[i] * sn) / k +
          (cross[i] * oneMinusCos) / k,
      ),
      u: u.map((_, i) => parallel[i] + perpendicular[i] * cs + cross[i] * sn),
    };
  };
  const roots = (i, value, horizon = 2) => {
    if (Math.abs(perpendicular[i]) + Math.abs(cross[i]) < 1e-15) {
      const s = (value - r[i]) / u[i];
      return Number.isFinite(s) && s > EPS ? [s] : [];
    }
    // A changing field can leave velocity parallel to the new field. Split the
    // exact helix at coordinate extrema; each interval is monotonic, so no
    // crossing is skipped. Bisect only those intervals that bracket a plane.
    if (Math.abs(parallel[i]) > 1e-14) {
      const amplitude = Math.hypot(perpendicular[i], cross[i]);
      const cuts = [0, horizon];
      if (amplitude > Math.abs(parallel[i])) {
        const phase = Math.atan2(cross[i] * sign, perpendicular[i]);
        const angle = Math.acos(-parallel[i] / amplitude);
        for (const base of [phase - angle, phase + angle]) {
          const first = Math.ceil(-base / TAU);
          const last = Math.floor((omega * horizon - base) / TAU);
          for (let n = first; n <= last; n++) {
            const s = (base + n * TAU) / omega;
            if (s > 0 && s < horizon) cuts.push(s);
          }
        }
      }
      cuts.sort((a, b) => a - b);
      const result = [];
      for (let j = 1; j < cuts.length; j++) {
        let lo = cuts[j - 1],
          hi = cuts[j];
        let fLo = at(lo).r[i] - value,
          fHi = at(hi).r[i] - value;
        if (Math.abs(fHi) < 1e-14 && hi > EPS) result.push(hi);
        if (fLo * fHi >= 0) continue;
        for (let n = 0; n < 48 && hi - lo > 1e-14; n++) {
          const mid = (lo + hi) / 2,
            fMid = at(mid).r[i] - value;
          if (fMid > 0 === fLo > 0) {
            lo = mid;
            fLo = fMid;
          } else hi = mid;
        }
        const root = (lo + hi) / 2;
        if (root > EPS) result.push(root);
      }
      return result;
    }

    const delta = (value - r[i]) * omega;
    const a = 2 * cross[i] * sign - delta;
    const b = 2 * perpendicular[i];
    const c = -delta;
    const values = [];
    if (Math.abs(a) < 1e-15) {
      if (Math.abs(b) > 1e-15) values.push(-c / b);
    } else {
      const discriminant = b * b - 4 * a * c;
      if (discriminant >= -1e-15) {
        const q =
          -0.5 * (b + (b >= 0 ? 1 : -1) * Math.sqrt(Math.max(0, discriminant)));
        if (q !== 0) values.push(q / a, c / q);
        else values.push(0);
      }
    }
    const result = values
      .map((w) => {
        let angle = 2 * Math.atan(w);
        if (angle < 0) angle += TAU;
        return angle / omega;
      })
      .filter((s) => s > EPS);
    const halfTurn = Math.PI / omega;
    if (Math.abs(at(halfTurn).r[i] - value) < EPS) result.push(halfTurn);
    return result;
  };
  return { at, roots };
}

export function traceElectron(ix, iy, options = {}, collectPath = true) {
  const { voltage = 2000, turns = 100, gap = GEOMETRY.gap } = options;
  const properties = beamProperties(voltage);
  const { bx, by } = coilFields(ix, iy, { turns, gap });
  let r = [0, 0, 0];
  let u = [0, 0, 1];
  let distance = 0;
  const path = collectPath ? [r.slice()] : [];
  const finish = (status) => ({
    ...properties,
    bx,
    by,
    x: r[0],
    y: r[1],
    z: r[2],
    hit: status === "screen",
    status,
    path,
    distance,
    flightTime: distance / properties.speed,
  });
  if (
    ![
      ix,
      iy,
      voltage,
      turns,
      gap,
      bx / properties.rigidity,
      by / properties.rigidity,
      properties.speed,
    ].every(Number.isFinite) ||
    voltage <= 0 ||
    turns <= 0 ||
    gap <= 0
  )
    return finish("invalid");
  const boxes = magnetBoxes(gap);
  for (let iteration = 0; iteration < 64; iteration++) {
    // Probe one nanometre ahead to resolve the outgoing side of a hard edge.
    const probe = r.map((value, i) => value + u[i] * 1e-9);
    const field = boxes.find(
      (box) => box.kind === "field" && inside(probe, box),
    );
    const strength = Math.hypot(bx, by);
    const k = field ? -strength / properties.rigidity : 0;
    const trajectory = motion(
      r,
      u,
      strength ? [bx / strength, by / strength, 0] : [0, 1, 0],
      k,
    );
    const fullTurn = Math.abs(k) > 1e-9 ? TAU / Math.abs(k) : Infinity;
    let next = {
      s: Math.min(2 - distance, fullTurn),
      kind: fullTurn < 2 - distance ? "trapped" : "escaped",
    };
    const consider = (s, kind) => {
      if (s > EPS && s < next.s - EPS) next = { s, kind };
    };
    for (const box of boxes) {
      for (let axis = 0; axis < 3; axis++) {
        for (const edge of [box.min[axis], box.max[axis]]) {
          for (const s of trajectory.roots(axis, edge, next.s)) {
            if (s <= next.s + EPS && inside(trajectory.at(s).r, box, EPS))
              consider(s, box.kind);
          }
        }
      }
    }
    for (const s of trajectory.roots(2, GEOMETRY.screenZ))
      consider(s, "screen");
    for (const s of trajectory.roots(2, 0)) consider(s, "returned");
    for (const axis of [0, 1])
      for (const edge of [-1, 1]) {
        for (const s of trajectory.roots(axis, edge, next.s))
          consider(s, "escaped");
      }
    if (!Number.isFinite(next.s) || next.s <= EPS) return finish("trapped");
    if (collectPath) {
      const steps = Math.max(
        1,
        Math.min(
          512,
          Math.max(
            Math.ceil(Math.abs(k * next.s) / 0.025),
            Math.ceil(next.s / 0.003),
          ),
        ),
      );
      for (let step = 1; step <= steps; step++)
        path.push(trajectory.at((next.s * step) / steps).r);
    }
    const end = trajectory.at(next.s);
    r = end.r;
    u = end.u;
    distance += next.s;
    if (next.kind === "screen")
      return finish(
        Math.abs(r[0]) <= GEOMETRY.screenSize / 2 &&
          Math.abs(r[1]) <= GEOMETRY.screenSize / 2
          ? "screen"
          : "outside-screen",
      );
    if (
      next.kind === "returned" ||
      next.kind === "escaped" ||
      next.kind === "trapped"
    )
      return finish(next.kind);
  }
  return finish("trapped");
}

export function createElectron({ voltage = 2000 } = {}) {
  if (!Number.isFinite(voltage) || voltage <= 0)
    throw new RangeError("Electron voltage must be finite and positive.");
  const properties = beamProperties(voltage);
  if (!Number.isFinite(properties.speed) || properties.speed <= 0)
    throw new RangeError("Electron voltage is outside the supported range.");
  return {
    ...properties,
    r: [0, 0, 0],
    u: [0, 0, 1],
    physicalAge: 0,
    distance: 0,
    status: "flying",
    hit: false,
  };
}

let liveGap;
let liveBoxes;
function liveMagnetBoxes(gap) {
  if (gap !== liveGap) {
    liveGap = gap;
    liveBoxes = magnetBoxes(gap);
  }
  return liveBoxes;
}

// First positive ray intersection with an axis-aligned box. If the ray starts
// inside it, the returned distance is the exit rather than the entry.
function rayBoxDistance(r, u, box) {
  let near = -Infinity;
  let far = Infinity;
  for (let axis = 0; axis < 3; axis++) {
    if (Math.abs(u[axis]) < 1e-15) {
      if (r[axis] < box.min[axis] - EPS || r[axis] > box.max[axis] + EPS)
        return Infinity;
    } else {
      const a = (box.min[axis] - r[axis]) / u[axis];
      const b = (box.max[axis] - r[axis]) / u[axis];
      near = Math.max(near, Math.min(a, b));
      far = Math.min(far, Math.max(a, b));
      if (far < near) return Infinity;
    }
  }
  return near > EPS ? near : far > EPS ? far : Infinity;
}

// Advance this electron's current state through a physical time interval.
// The caller samples the shared current drive at the interval midpoint.
// Within that interval, propagation is analytic; general helix boundary roots are bracketed to 1e-14 m.
export function advanceElectron(
  electron,
  physicalDt,
  ix,
  iy,
  { turns = 100, gap = GEOMETRY.gap } = {},
) {
  if (electron.status !== "flying" || physicalDt === 0) return electron;
  if (
    ![physicalDt, ix, iy, turns, gap].every(Number.isFinite) ||
    physicalDt < 0 ||
    turns <= 0 ||
    gap <= 0
  ) {
    throw new RangeError(
      "Electron steps require finite currents, nonnegative physical time, and positive coil turns and gap.",
    );
  }
  const { bx, by } = coilFields(ix, iy, { turns, gap });
  if (![bx / electron.rigidity, by / electron.rigidity].every(Number.isFinite))
    throw new RangeError("Magnetic field is outside the supported range.");
  const boxes = liveMagnetBoxes(gap);
  let remaining = electron.speed * physicalDt;
  if (!Number.isFinite(remaining))
    throw new RangeError("Electron step is outside the supported range.");
  const finish = (status) => {
    electron.status = status;
    electron.hit = status === "screen";
  };
  while (remaining > 0 && electron.status === "flying") {
    const { r, u } = electron;
    const probe = r.map((value, i) => value + u[i] * 1e-9);
    const field = boxes.find(
      (box) => box.kind === "field" && inside(probe, box),
    );
    const strength = Math.hypot(bx, by);
    const k = field ? -strength / electron.rigidity : 0;
    const trajectory = motion(
      r,
      u,
      strength ? [bx / strength, by / strength, 0] : [0, 1, 0],
      k,
    );
    let next = { s: remaining, kind: "step" };
    const consider = (s, kind) => {
      if (s > EPS && s <= remaining && s < next.s) next = { s, kind };
    };
    if (field && Math.abs(k) >= 1e-9) {
      for (let axis = 0; axis < 3; axis++) {
        for (const edge of [field.min[axis], field.max[axis]]) {
          for (const s of trajectory.roots(axis, edge, next.s)) {
            if (s <= next.s && inside(trajectory.at(s).r, field, EPS))
              consider(s, "field");
          }
        }
      }
    } else {
      for (const box of boxes) consider(rayBoxDistance(r, u, box), box.kind);
      if (Math.abs(u[2]) > 1e-15) {
        consider((GEOMETRY.screenZ - r[2]) / u[2], "screen");
        consider(-r[2] / u[2], "returned");
      }
      for (let axis = 0; axis < 2; axis++) {
        if (Math.abs(u[axis]) > 1e-15) {
          consider((1 - r[axis]) / u[axis], "escaped");
          consider((-1 - r[axis]) / u[axis], "escaped");
        }
      }
    }
    const end = trajectory.at(next.s);
    electron.r = end.r;
    electron.u = end.u.slice();
    electron.distance += next.s;
    electron.physicalAge += next.s / electron.speed;
    remaining -= next.s;
    if (next.kind === "screen") {
      finish(
        Math.abs(end.r[0]) <= GEOMETRY.screenSize / 2 &&
          Math.abs(end.r[1]) <= GEOMETRY.screenSize / 2
          ? "screen"
          : "outside-screen",
      );
    } else if (next.kind === "returned" || next.kind === "escaped")
      finish(next.kind);
  }
  return electron;
}
