import { useCallback, useEffect, useRef, useState } from "react";
import { LabController } from "../lab-controller.js";
import { createPhosphorScreen } from "../phosphor-screen.js";
import { createApparatus } from "../apparatus.js";
import { createSignalPlot } from "../signal-plot.js";

// React owns the UI; this effect owns the animation and imperative canvas objects.
export function useCrtLab() {
  const [controller] = useState(() => new LabController());
  const [state, setState] = useState(() => controller.snapshot());
  const [graphics, setGraphics] = useState({ ready: false, error: "" });
  const viewport = useRef(null), screenCanvas = useRef(null), gridCanvas = useRef(null), signalCanvas = useRef(null);
  const screenRef = useRef(null);

  const act = useCallback((method, ...args) => {
    controller[method](...args);
    setState(controller.snapshot());
  }, [controller]);
  const exportPNG = useCallback(() => screenRef.current?.exportPNG(), []);

  useEffect(() => {
    const simulation = controller.simulation;
    const screen = createPhosphorScreen(screenCanvas.current, gridCanvas.current, () => simulation.settings);
    const signals = createSignalPlot(signalCanvas.current);
    screenRef.current = screen;
    simulation.onImpact = (hit, fade) => screen.illuminate(hit, fade);
    controller.onClearScreen = screen.clear;
    let apparatus;
    try {
      apparatus = createApparatus(viewport.current, screen.canvas, error => setGraphics({ ready: false, error }));
      setGraphics({ ready: true, error: "" });
    } catch (error) {
      console.error("Three.js initialization:", error);
      setGraphics({ ready: false, error: "3D view requires WebGL. The equations and phosphor screen still work." });
    }

    let frame, lastStamp, lastTelemetry = 0, previousView;
    let currents = { ix: 0, iy: 0 };
    function animate(stamp) {
      const wallDelta = lastStamp === undefined ? 0 : Math.min((stamp - lastStamp) / 1000, 0.05);
      lastStamp = stamp;
      const delta = wallDelta * controller.options.speed;
      if (!simulation.hold) screen.decay(delta);
      simulation.tick(delta);
      if (stamp - lastTelemetry > 32) {
        const snapshot = controller.snapshot();
        if (snapshot.currents) {
          currents = snapshot.currents;
          apparatus?.coils.setCurrents(currents.ix, currents.iy);
          apparatus?.guide.update(currents.ix, currents.iy, simulation.settings, controller.options.guide);
        } else apparatus?.guide.hide();
        apparatus?.particles.update(simulation.cloud.particles, simulation.cloud.completedShots);
        signals.draw(controller.signalData, controller.signalMaximum, simulation.time, simulation.settings.duration);
        setState(snapshot);
        lastTelemetry = stamp;
      }
      if (previousView !== controller.view) {
        apparatus?.setView(controller.view);
        previousView = controller.view;
      }
      screen.update();
      apparatus?.setGlass(controller.options.glass);
      apparatus?.coils.setVisible(controller.options.coils);
      apparatus?.coils.animate(delta, currents.ix, currents.iy, simulation.running, simulation.valid);
      apparatus?.render();
      frame = requestAnimationFrame(animate);
    }
    const onVisibilityChange = () => { lastStamp = undefined; };
    document.addEventListener("visibilitychange", onVisibilityChange);
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      simulation.onImpact = () => {};
      controller.onClearScreen = () => {};
      screenRef.current = null;
      apparatus?.dispose();
    };
  }, [controller]);

  return { state, graphics, act, exportPNG, refs: { viewport, screenCanvas, gridCanvas, signalCanvas } };
}
