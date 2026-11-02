import { a as C, b as D } from "../chunks/chunk-UISTLEPP.js";
import { a as z } from "../chunks/chunk-BVFNLRZD.js";
import {
  Box3 as F,
  InstancedInterleavedBuffer as H,
  InterleavedBufferAttribute as E,
  Line3 as k,
  MathUtils as J,
  Matrix4 as K,
  Mesh as Q,
  Sphere as X,
  Vector3 as w,
  Vector4 as B,
} from "three";
var W = new B(),
  P = new w(),
  O = new w(),
  i = new B(),
  r = new B(),
  x = new B(),
  v = new w(),
  A = new K(),
  o = new k(),
  U = new w(),
  L = new F(),
  _ = new X(),
  y = new B(),
  h,
  b;
function V(c, t, n) {
  return (
    y.set(0, 0, -t, 1).applyMatrix4(c.projectionMatrix),
    y.multiplyScalar(1 / y.w),
    (y.x = b / n.width),
    (y.y = b / n.height),
    y.applyMatrix4(c.projectionMatrixInverse),
    y.multiplyScalar(1 / y.w),
    Math.abs(Math.max(y.x, y.y))
  );
}
function Y(c, t) {
  let n = c.matrixWorld,
    a = c.geometry,
    s = a.attributes.instanceStart,
    l = a.attributes.instanceEnd,
    u = Math.min(a.instanceCount, s.count);
  for (let e = 0, p = u; e < p; e++) {
    (o.start.fromBufferAttribute(s, e),
      o.end.fromBufferAttribute(l, e),
      o.applyMatrix4(n));
    let d = new w(),
      m = new w();
    (h.distanceSqToSegment(o.start, o.end, m, d),
      m.distanceTo(d) < b * 0.5 &&
        t.push({
          point: m,
          pointOnLine: d,
          distance: h.origin.distanceTo(m),
          object: c,
          face: null,
          faceIndex: e,
          uv: null,
          uv1: null,
        }));
  }
}
function Z(c, t, n) {
  let a = t.projectionMatrix,
    l = c.material.resolution,
    u = c.matrixWorld,
    e = c.geometry,
    p = e.attributes.instanceStart,
    d = e.attributes.instanceEnd,
    m = Math.min(e.instanceCount, p.count),
    f = -t.near;
  (h.at(1, x),
    (x.w = 1),
    x.applyMatrix4(t.matrixWorldInverse),
    x.applyMatrix4(a),
    x.multiplyScalar(1 / x.w),
    (x.x *= l.x / 2),
    (x.y *= l.y / 2),
    (x.z = 0),
    v.copy(x),
    A.multiplyMatrices(t.matrixWorldInverse, u));
  for (let M = 0, G = m; M < G; M++) {
    if (
      (i.fromBufferAttribute(p, M),
      r.fromBufferAttribute(d, M),
      (i.w = 1),
      (r.w = 1),
      i.applyMatrix4(A),
      r.applyMatrix4(A),
      i.z > f && r.z > f)
    )
      continue;
    if (i.z > f) {
      let S = i.z - r.z,
        g = (i.z - f) / S;
      i.lerp(r, g);
    } else if (r.z > f) {
      let S = r.z - i.z,
        g = (r.z - f) / S;
      r.lerp(i, g);
    }
    (i.applyMatrix4(a),
      r.applyMatrix4(a),
      i.multiplyScalar(1 / i.w),
      r.multiplyScalar(1 / r.w),
      (i.x *= l.x / 2),
      (i.y *= l.y / 2),
      (r.x *= l.x / 2),
      (r.y *= l.y / 2),
      o.start.copy(i),
      (o.start.z = 0),
      o.end.copy(r),
      (o.end.z = 0));
    let I = o.closestPointToPointParameter(v, !0);
    o.at(I, U);
    let j = J.lerp(i.z, r.z, I),
      N = j >= -1 && j <= 1,
      R = v.distanceTo(U) < b * 0.5;
    if (N && R) {
      (o.start.fromBufferAttribute(p, M),
        o.end.fromBufferAttribute(d, M),
        o.start.applyMatrix4(u),
        o.end.applyMatrix4(u));
      let S = new w(),
        g = new w();
      (h.distanceSqToSegment(o.start, o.end, g, S),
        n.push({
          point: g,
          pointOnLine: S,
          distance: h.origin.distanceTo(g),
          object: c,
          face: null,
          faceIndex: M,
          uv: null,
          uv1: null,
        }));
    }
  }
}
var T = class extends Q {
  constructor(t = new C(), n = new z({ color: Math.random() * 16777215 })) {
    (super(t, n), (this.isLineSegments2 = !0), (this.type = "LineSegments2"));
  }
  computeLineDistances() {
    let t = this.geometry,
      n = t.attributes.instanceStart,
      a = t.attributes.instanceEnd,
      s = new Float32Array(2 * n.count);
    for (let u = 0, e = 0, p = n.count; u < p; u++, e += 2)
      (P.fromBufferAttribute(n, u),
        O.fromBufferAttribute(a, u),
        (s[e] = e === 0 ? 0 : s[e - 1]),
        (s[e + 1] = s[e] + P.distanceTo(O)));
    let l = new H(s, 2, 1);
    return (
      t.setAttribute("instanceDistanceStart", new E(l, 1, 0)),
      t.setAttribute("instanceDistanceEnd", new E(l, 1, 1)),
      this
    );
  }
  raycast(t, n) {
    let a = this.material.worldUnits,
      s = t.camera;
    if (
      (s === null &&
        !a &&
        console.error(
          'LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.',
        ),
      a === !1 &&
        (this.material.resolution.x === 0 || this.material.resolution.y === 0))
    )
      return;
    let l = (t.params.Line2 !== void 0 && t.params.Line2.threshold) || 0;
    h = t.ray;
    let u = this.matrixWorld,
      e = this.geometry,
      p = this.material;
    ((b = p.linewidth + l),
      e.boundingSphere === null && e.computeBoundingSphere(),
      _.copy(e.boundingSphere).applyMatrix4(u));
    let d;
    if (a) d = b * 0.5;
    else {
      let f = Math.max(s.near, _.distanceToPoint(h.origin));
      d = V(s, f, p.resolution);
    }
    if (((_.radius += d), h.intersectsSphere(_) === !1)) return;
    (e.boundingBox === null && e.computeBoundingBox(),
      L.copy(e.boundingBox).applyMatrix4(u));
    let m;
    if (a) m = b * 0.5;
    else {
      let f = Math.max(s.near, L.distanceToPoint(h.origin));
      m = V(s, f, p.resolution);
    }
    (L.expandByScalar(m),
      h.intersectsBox(L) !== !1 && (a ? Y(this, n) : Z(this, s, n)));
  }
  onBeforeRender(t) {
    let n = this.material.uniforms;
    n &&
      n.resolution &&
      (t.getViewport(W), this.material.uniforms.resolution.value.set(W.z, W.w));
  }
};
var q = class extends T {
  constructor(t = new D(), n = new z({ color: Math.random() * 16777215 })) {
    (super(t, n), (this.isLine2 = !0), (this.type = "Line2"));
  }
};
export { q as Line2 };
