// A deliberately small expression language: no generated JavaScript or globals.
const FUNCTIONS = Object.freeze({
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  arcsin: Math.asin,
  arccos: Math.acos,
  arctan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  abs: Math.abs,
  floor: Math.floor,
  sqrt: Math.sqrt,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log10,
  min: Math.min,
  max: Math.max,
});
const hasFunction = (name) => Object.hasOwn(FUNCTIONS, name);

function tokenize(latex) {
  let source = String(latex).trim();
  if (!source)
    throw new Error("Enter a current function, for example 0.002 sin(2πt).");
  if (source.length > 2048)
    throw new Error("Keep the expression under 2,048 characters.");
  source = source
    .replace(/\\left\s*\|/g, "abs(")
    .replace(/\\right\s*\|/g, ")")
    .replace(/\\lvert/g, "abs(")
    .replace(/\\rvert/g, ")")
    .replace(/\\(?:left|right|displaystyle)\b/g, "")
    .replace(/\\(?:,|!|;|:|quad\b|qquad\b| )/g, " ")
    .replace(/[−–]/g, "-")
    .replace(/[×·⋅]/g, "*")
    .replace(/π/g, "\\pi ")
    .replace(/\u2062/g, "*")
    .replace(/\\text\{\s*if\s*\}/g, "");

  // Strip only a current-definition prefix. Equality inside conditions stays.
  source = source.replace(
    /^I(?:_\s*(?:\{[xXyYhHvV]\}|[xXyYhHvV]))?(?:\s*\(\s*t\s*\))?\s*=(?!=)/,
    "",
  );

  const tokens = [];
  let cursor = 0;
  while (cursor < source.length) {
    const rest = source.slice(cursor);
    const whitespace = rest.match(/^\s+/);
    if (whitespace) {
      cursor += whitespace[0].length;
      continue;
    }
    const position = cursor + 1;
    const environment = rest.match(/^\\(begin|end)\{cases\}/);
    if (environment) {
      tokens.push({ type: environment[1] === "begin" ? "cases" : "endcases", position });
      cursor += environment[0].length;
      continue;
    }
    const otherwise = rest.match(/^\\(?:text|mathrm)\{\s*(otherwise|else)\s*\}/);
    if (otherwise) {
      tokens.push({ type: "otherwise", position }); cursor += otherwise[0].length; continue;
    }
    if (rest.startsWith("\\\\")) {
      tokens.push({ type: "row", position }); cursor += 2; continue;
    }
    if (rest.startsWith("\\{") || rest.startsWith("\\}")) {
      tokens.push({ type: rest[1], position }); cursor += 2; continue;
    }
    const comparison = rest.match(/^(<=|>=|!=|<|>|=|≤|≥|≠)/);
    if (comparison) {
      tokens.push({ type: ({ "≤": "<=", "≥": ">=", "≠": "!=" })[comparison[0]] || comparison[0], position });
      cursor += comparison[0].length; continue;
    }
    const numeric = rest.match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/);
    if (numeric) {
      const value = Number(numeric[0]);
      if (!Number.isFinite(value))
        throw new Error("Numeric constants must be finite.");
      tokens.push({ type: "number", value, position });
      cursor += numeric[0].length;
      continue;
    }
    const command = rest.match(/^\\([A-Za-z]+)/);
    const word = command || rest.match(/^([A-Za-z]+)/);
    if (word) {
      let name = word[1];
      cursor += word[0].length;
      if (
        command &&
        (name === "operatorname" || name === "mathrm" || name === "mathit")
      ) {
        const group = source.slice(cursor).match(/^\s*\{\s*([A-Za-z]+)\s*\}/);
        if (!group) throw new Error(`Use a function name inside \\${name}{…}.`);
        name = group[1];
        cursor += group[0].length;
      }
      if (name === "cdot" || name === "times")
        tokens.push({ type: "*", position });
      else if (["frac", "dfrac", "tfrac"].includes(name))
        tokens.push({ type: "frac", position });
      else if (["le", "leq", "leqslant", "ge", "geq", "geqslant", "ne", "neq"].includes(name))
        tokens.push({ type: name.startsWith("le") ? "<=" : name.startsWith("ge") ? ">=" : "!=", position });
      else if (name === "lfloor")
        tokens.push({ type: "function", value: "floor", position }, { type: "(", position });
      else if (name === "rfloor") tokens.push({ type: ")", position });
      else if (name === "lbrace" || name === "rbrace")
        tokens.push({ type: name === "lbrace" ? "{" : "}", position });
      else if (name === "otherwise" || name === "else") tokens.push({ type: "otherwise", position });
      else if (name === "t") tokens.push({ type: "variable", position });
      else if (name === "pi" || name === "e")
        tokens.push({
          type: "number",
          value: name === "pi" ? Math.PI : Math.E,
          position,
        });
      else if (hasFunction(name))
        tokens.push({ type: "function", value: name, position });
      else
        throw new Error(
          `Unknown name “${name}”. Use t, π, e, or a supported math function.`,
        );
      continue;
    }
    if ("+-*/^(){}[],:&".includes(rest[0])) {
      tokens.push({ type: rest[0], position });
      cursor += 1;
      continue;
    }
    if (rest[0] === "|") throw new Error("Use abs(…) for absolute value.");
    throw new Error(`Unexpected “${rest[0]}” at character ${position}.`);
  }
  tokens.push({ type: "end", position: source.length + 1 });
  return tokens;
}

/** Compile MathLive/Desmos-style LaTeX. t is in seconds; the result is amperes. */
export function compileExpression(latex) {
  const tokens = tokenize(latex);
  let cursor = 0;
  let depth = 0;
  const peek = () => tokens[cursor];
  const take = () => tokens[cursor++];
  const fail = (message) => {
    throw new Error(`${message} at character ${peek().position}.`);
  };
  const expect = (type) => {
    if (peek().type !== type) fail(`Expected “${type}”`);
    return take();
  };
  const startsTerm = (type) =>
    ["number", "variable", "function", "frac", "cases", "(", "{", "["].includes(type);

  const comparisons = {
    "<": (a, b) => a < b, "<=": (a, b) => a <= b,
    ">": (a, b) => a > b, ">=": (a, b) => a >= b,
    "=": (a, b) => a === b, "!=": (a, b) => a !== b,
  };
  const isComparison = () => Object.hasOwn(comparisons, peek().type);
  function condition(left = sum()) {
    const pairs = [];
    if (!isComparison()) fail("Expected a comparison such as t < 0.5");
    while (isComparison()) {
      const compare = comparisons[take().type], right = sum();
      pairs.push({ compare, right });
    }
    return (t) => {
      let previous = left(t);
      for (const { compare, right } of pairs) {
        const next = right(t);
        if (!compare(previous, next)) return false;
        previous = next;
      }
      return true;
    };
  }
  function piecewise(branches, fallback = () => NaN) {
    return (t) => {
      for (const { test, value } of branches) if (test(t)) return value(t);
      return fallback(t);
    };
  }
  function group() {
    const opening = take().type;
    const closing = { "(": ")", "{": "}", "[": "]" }[opening];
    const expression = sum();
    if (opening === "{" && isComparison()) {
      const branches = [];
      let left = expression;
      while (true) {
        const test = condition(left);
        expect(":");
        branches.push({ test, value: sum() });
        if (peek().type !== ",") { expect(closing); return piecewise(branches); }
        take();
        left = sum();
        if (!isComparison()) { expect(closing); return piecewise(branches, left); }
      }
    }
    expect(closing);
    return expression;
  }
  function cases() {
    expect("cases");
    const branches = [];
    let fallback;
    while (peek().type !== "endcases") {
      if (fallback) fail("The default case must be last");
      const value = sum();
      if (peek().type === "&") {
        take();
        if (peek().type === "otherwise") { take(); fallback = value; }
        else branches.push({ test: condition(), value });
      } else fallback = value;
      if (peek().type === "row") take();
      else if (peek().type !== "endcases") fail("Expected a new cases row");
    }
    expect("endcases");
    if (!branches.length && !fallback) fail("Enter at least one case");
    return piecewise(branches, fallback);
  }

  function primary() {
    depth += 1;
    if (depth > 64) fail("The expression is nested too deeply");
    const token = peek();
    let result;
    if (token.type === "number") {
      take();
      result = () => token.value;
    } else if (token.type === "variable") {
      take();
      result = (t) => t;
    } else if (token.type === "cases") result = cases();
    else if (["(", "{", "["].includes(token.type)) result = group();
    else if (token.type === "frac") {
      take();
      if (peek().type !== "{") fail("Use \\frac{numerator}{denominator}");
      const numerator = group();
      if (peek().type !== "{") fail("Use \\frac{numerator}{denominator}");
      const denominator = group();
      result = (t) => numerator(t) / denominator(t);
    } else if (token.type === "function") {
      take();
      let exponent;
      if (peek().type === "^") {
        take();
        exponent = unary();
      }
      const args = [];
      if (peek().type === "(") {
        take();
        args.push(sum());
        while (peek().type === ",") {
          take();
          args.push(sum());
        }
        expect(")");
      } else if (peek().type === "{") args.push(group());
      else args.push(unary());
      const multiple = token.value === "min" || token.value === "max";
      if (!multiple && args.length !== 1)
        throw new Error(`${token.value} takes one argument.`);
      const fn = FUNCTIONS[token.value];
      const value =
        args.length === 1
          ? (t) => fn(args[0](t))
          : (t) => fn(...args.map((arg) => arg(t)));
      result = exponent ? (t) => value(t) ** exponent(t) : value;
    } else
      fail(
        token.type === "end"
          ? "Expected a number, t, or a function"
          : `Unexpected “${token.type}”`,
      );
    depth -= 1;
    return result;
  }

  function power() {
    const left = primary();
    if (peek().type !== "^") return left;
    take();
    const right = unary();
    return (t) => left(t) ** right(t);
  }

  function unary() {
    if (peek().type === "+") {
      take();
      return unary();
    }
    if (peek().type === "-") {
      take();
      const value = unary();
      return (t) => -value(t);
    }
    return power();
  }

  function product() {
    let left = unary();
    while (
      peek().type === "*" ||
      peek().type === "/" ||
      startsTerm(peek().type)
    ) {
      const operator = peek().type;
      if (operator === "*" || operator === "/") take();
      const right = unary();
      const previous = left;
      left =
        operator === "/"
          ? (t) => previous(t) / right(t)
          : (t) => previous(t) * right(t);
    }
    return left;
  }

  function sum() {
    let left = product();
    while (peek().type === "+" || peek().type === "-") {
      const operator = take().type;
      const right = product();
      const previous = left;
      left =
        operator === "+"
          ? (t) => previous(t) + right(t)
          : (t) => previous(t) - right(t);
    }
    return left;
  }

  const expression = sum();
  if (peek().type !== "end") fail(`Unexpected “${peek().type}”`);
  return expression;
}
