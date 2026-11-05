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

for (const [t, value] of [[-1, 0], [0, 2], [.499, 2], [.5, 3], [1, 3]]) {
  equal(String.raw`\left\{0\le t<0.5:2,t\geq0.5:3,0\right\}`, t, value);
}
equal("{t<0:1,t<=1:2,3}", 1, 2);
equal("{t>1:1,t>=0:2,3}", 1, 2);
equal("{t=0:4,t!=0:5}", 0, 4);
equal("{t≠0:5,4}", 1, 5);
equal("{t≤0:2,t≥1:3,4}", .5, 4);
equal("{t<1:2,t<2:3,4}", .5, 2);
equal("2+3{t<1:2,4}", 1, 14);
equal(String.raw`\frac{1}{2}{t<0:-1,1}`, -1, -.5);
equal("{t<1:{t<0:2,3},4}", .5, 3);
equal("{t<0:sqrt(-t),sqrt(t)}", 4, 2);
equal(String.raw`I_x(t)=\left\lbrace t\leq0:1,t\neq1:2,3\right\rbrace`, 1, 3);
equal(String.raw`\begin{cases}2 & t<0.5\\3 & \text{otherwise}\end{cases}`, .5, 3);
equal(String.raw`\begin{cases}\sqrt{-t} & t<0\\\sqrt{t} & t\ge0\end{cases}`, 4, 2);
equal(String.raw`\begin{cases}1 & \text{if }t<0\\2\end{cases}`, 1, 2);
equal(String.raw`\begin{cases}1&t<0\\2&t\ge0\\\end{cases}`, 0, 2);
assert.ok(Number.isNaN(compileExpression("{t<0:1}")(1)));
assert.ok(Number.isNaN(compileExpression(String.raw`\begin{cases}1&t<0\end{cases}`)(1)));
for (const text of [
  "{t<1:}", "{t<1:1,}", "{t<1:1,2,t<3:4}", "{t:2,3}",
  "t<1", "{t<1:window,0}", "{t<1:constructor(1),0}",
  String.raw`\begin{cases}1& t\\2\end{cases}`,
  String.raw`\begin{cases}1&\text{otherwise}\\2&t<0\end{cases}`,
  String.raw`\begin{cases}\end{cases}`,
]) assert.throws(() => compileExpression(text), undefined, text);
console.log("Piecewise parsing passed: Desmos braces, LaTeX cases, chained and inclusive comparisons, default / missing branches, nesting, lazy evaluation and rejected malformed inputs.");

equal("floor(t)", 1.9, 1);
equal("floor(t)", -.1, -1);
equal(String.raw`\operatorname{floor}(2t)`, .9, 1);
equal(String.raw`\left\lfloor 2t\right\rfloor`, -.1, -1);
equal(String.raw`\lfloor 2\lfloor t\rfloor+0.9\rfloor`, 1.9, 2);
assert.throws(() => compileExpression(String.raw`\lfloor t`));
assert.throws(() => compileExpression("floor(t,1)"));
console.log("Floor parsing passed: plain and LaTeX forms, negative inputs, nested floor brackets and invalid syntax.");
