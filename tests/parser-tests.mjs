import assert from "node:assert/strict";
import { compileExpression } from "../src/equation-parser.js";

let checks = 0;
function equal(latex, t, expected) {
  const actual = compileExpression(latex)(t);
  assert.ok(
    Math.abs(actual - expected) <= 1e-12 * Math.max(1, Math.abs(expected)),
    `${latex}: got ${actual}, wanted ${expected}`,
  );
  checks += 1;
}

equal("0.002 sin(2πt)", 0.25, 0.002);
equal(String.raw`0.002\sin\left(2\pi t\right)`, 0.25, 0.002);
equal(String.raw`I_{H}\left(t\right)=\frac{2t}{3}`, 1.5, 1);
equal("I_y(t) = 2e-3 * cos(t)", 0, 0.002);
equal(String.raw`\frac{t^{2}+1}{\sqrt{t+1}}`, 3, 5);
equal(String.raw`\sin^{2}\left(t\right)+\cos^{2}\left(t\right)`, 0.77, 1);
equal("-t^2", 3, -9);
equal("(-t)^2", 3, 9);
equal("2^3^2", 0, 512);
equal("2^-2", 0, 0.25);
equal("-2^-2", 0, -0.25);
equal("2(1+t)(3-t)", 2, 6);
equal(
  String.raw`\operatorname{abs}\left(-t\right) + \mathrm{e}`,
  -3,
  3 + Math.E,
);
equal(String.raw`\left|t-2\right|`, 1, 1);
equal(String.raw`\max\left(2t,\min\left(5,7\right)\right)`, 4, 8);
equal(String.raw`\ln(e)+\log(100)+\exp(0)`, 0, 4);
equal(String.raw`\arcsin(1)+\acos(1)+\atan(0)`, 0, Math.PI / 2);
equal(String.raw`\sinh(0)+\cosh(0)+\tanh(0)`, 0, 1);
equal(String.raw`2\cdot t+3\times t+2\pi\,t`, 2, 10 + 4 * Math.PI);
equal(String.raw`\sqrt{\frac{9}{4}}`, 0, 1.5);
equal("1/2t", 4, 2);
equal("sin t", Math.PI / 2, 1);
equal("2e", 0, 2 * Math.E);
for (const invalid of [
  "",
  "foo(t)",
  "window.alert(1)",
  "constructor(1)",
  "t;",
  "t=1",
  "I_x(t)=t=1",
  "\\frac{1}",
  "sin(1,2)",
  "2**3",
  "sin(",
  "t_1",
  "|t|",
  "1e999",
]) {
  assert.throws(() => compileExpression(invalid), undefined, invalid);
  checks += 1;
}
assert.throws(
  () => compileExpression("(".repeat(70) + "t" + ")".repeat(70)),
  /nested too deeply/,
);
checks += 1;
console.log(`${checks} parser checks passed.`);
