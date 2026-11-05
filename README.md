# CRT

A frontend-only React and Three.js CRT simulation, built with Vite. All electron physics, equation parsing, rendering, and phosphor decay run in the browser. There is no application server or API.

## Run locally

Use Node.js 20.19+ or 22.12+ (Node 22 or newer is recommended).

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The page entry is now `index.html`; the previous `CRT.html` entry and copied vendor libraries have been replaced by Vite and npm dependencies.

```sh
npm test          # Physics, parser, simulation, and controller checks
npm run build    # Generate the static frontend in dist/
npm run preview  # Preview the production build locally
```

Deploy the contents of `dist/` to any static web host. `vite.config.js` uses relative asset paths so the build can also live under a subdirectory.

## Source layout

- `src/App.jsx` and `src/components/`: React layout, equation inputs, beam controls, view controls, screen, and readouts.
- `src/hooks/useCrtLab.js`: connects React to the animation loop and disposes Three.js resources on unmount.
- `src/lab-controller.js`: UI-independent commands, input validation, presets, and snapshots.
- `src/simulation.js`, `particles.js`, `physics.js`, and `emission.js`: clocks, independent electron states, magnetic motion, and firing schedules.
- `src/equation-parser.js` and `config.js`: supported expressions, presets, units, and defaults.
- `src/apparatus.js`, `coils.js`, `guide-ray.js`, and `particle-view.js`: Three.js rendering.
- `src/phosphor-screen.js`, `signal-plot.js`, and `telemetry.js`: screen persistence, current graph, and readout formatting.
- `styles/app.css`: the existing layout with browser-default controls and typography.

## Piecewise currents and the smiley demonstration

The current fields accept Desmos-style conditions, including chained intervals:

```tex
\left\{0\le t<0.5:0.1\sin(2\pi t),t\ge0.5:-0.1,0\right\}
```

They also accept standard LaTeX cases (value first, then condition):

```tex
\begin{cases}
0.1\sin(2\pi t) & t<0.5\\
-0.1 & \text{otherwise}
\end{cases}
```

Comparisons support `<`, `<=`, `>`, `>=`, `=`, `!=`, their Unicode forms, and LaTeX `\le`, `\leq`, `\ge`, `\geq`, `\ne` and `\neq`. Conditions are evaluated in order; only the selected expression is evaluated. A final default is optional. Without a matching condition or default, the current is undefined and the simulation pauses using its existing domain-error handling.

Click **Smiley face** to load editable piecewise currents for an outline, two circular eyes, and a smiling mouth. The demonstration restarts in continuous mode and enables **Hold trace**, so the complete face accumulates on the phosphor screen. The demonstration pauses source emission between strokes, allowing electrons to leave the coils before the next current segment begins; every displayed dot still comes from a real electron impact. Editing either equation or selecting another preset removes this demonstration-specific emission schedule. One cycle takes 1 function second, or 10 playback seconds (40 wall-clock seconds at 0.25× playback). Increasing playback speed makes the demonstration finish sooner while retaining the same function-to-electron time ratio.

## Sawtooth wave

Click **Sawtooth** for a horizontal sweep with four vertical sawtooth cycles. It starts a fresh continuous drawing and enables **Hold trace** so the complete waveform remains visible. One sweep takes 1 function second (10 playback seconds).

The editable currents are:

```tex
I_x(t) = 0.4(2(t-\lfloor t\rfloor)-1)
I_y(t) = 0.2(2(4t-\lfloor4t\rfloor)-1)
```

You can also type `floor(t)` or `\operatorname{floor}(t)`. A general sawtooth with peak amplitude `A` and frequency `f` is `A(2(ft-floor(ft))-1)`, where `f` is measured per function second.

## Triangular wave

Click **Triangle** for a horizontal sweep with four triangular cycles. It starts a fresh continuous drawing and enables **Hold trace**. One sweep takes 1 function second (10 playback seconds).

```tex
I_x(t) = 0.4(2(t-\lfloor t\rfloor)-1)
I_y(t) = 0.2(1-4\left|4t-\lfloor4t\rfloor-0.5\right|)
```

A general triangular wave with peak amplitude `A` and frequency `f` is `A(1-4abs(ft-floor(ft)-0.5))`, where `f` is measured per function second. Both rising and falling ramps are continuous.
